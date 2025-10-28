import { NextRequest } from "next/server";
import { Logger } from "@/lib/logger";
import { createDocument } from "@/lib/db";
import { getSupportedExtensions } from "@/lib/processing/extractors";
import { calculateBufferHash, findExistingDocument, DuplicateType } from "@/lib/duplicate-detection";
import fs from "fs/promises";
import path from "path";

// Configuration constants
const MAX_FILE_SIZE_MB = 30;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const BATCH_SIZE = 3; // Process files in batches of 3
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "text/html",
  "text/plain",
  "text/markdown",
  "text/x-markdown"
];
const ALLOWED_EXTENSIONS = getSupportedExtensions();
const UPLOADS_DIR = path.join(process.cwd(), "files", "uploads");

// Error types for structured error handling
type UploadError = {
  code: string;
  message: string;
  details?: any;
};

// Types for multiple file upload responses
type FileUploadResult = {
  filename: string;
  success: boolean;
  fileId?: string;
  filePath?: string;
  metadata?: {
    title?: string;
    author?: string;
    wordCount: number;
    pageCount?: number;
    extractionTime: number;
    createdAt?: Date;
    modifiedAt?: Date;
    contentType?: string;
    fileSizeKB?: number;
    sourceType?: string;
    uploadedAt?: string;
  };
  duplicateType?: DuplicateType;
  error?: string;
  errorCode?: string;
  message?: string;
};

type MultipleFileUploadResponse = {
  success: boolean;
  totalFiles: number;
  successCount: number;
  failureCount: number;
  results: FileUploadResult[];
};

// Utility to create structured error responses
function createErrorResponse(error: UploadError, status: number = 400): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: error.code,
      message: error.message,
      ...(error.details && { details: error.details })
    }),
    {
      status,
      headers: { "Content-Type": "application/json" }
    }
  );
}

// Validate file type and extension
function validateFileType(filename: string, mimeType: string): UploadError | null {
  const ext = path.extname(filename).toLowerCase();

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      code: "INVALID_FILE_TYPE",
      message: `Unsupported file type. Received: ${ext}`,
      details: { allowedExtensions: ALLOWED_EXTENSIONS }
    };
  }

  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return {
      code: "INVALID_MIME_TYPE",
      message: `Invalid MIME type. Received: ${mimeType}`,
      details: { allowedMimeTypes: ALLOWED_MIME_TYPES }
    };
  }

  return null;
}

// Validate file size
function validateFileSize(size: number): UploadError | null {
  if (size > MAX_FILE_SIZE_BYTES) {
    return {
      code: "FILE_TOO_LARGE",
      message: `File size exceeds limit of ${MAX_FILE_SIZE_MB}MB`,
      details: {
        maxSizeBytes: MAX_FILE_SIZE_BYTES,
        receivedSizeBytes: size,
        maxSizeMB: MAX_FILE_SIZE_MB
      }
    };
  }

  if (size === 0) {
    return {
      code: "EMPTY_FILE",
      message: "File is empty"
    };
  }

  return null;
}


// Ensure uploads directory exists
async function ensureUploadsDirectory(): Promise<void> {
  try {
    await fs.access(UPLOADS_DIR);
  } catch (error) {
    // Directory doesn't exist, create it
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
  }
}

// Utility to chunk array into batches
function chunkArray<T>(array: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < array.length; i += batchSize) {
    batches.push(array.slice(i, i + batchSize));
  }
  return batches;
}

// Note: checkDuplicateFilename function removed - now using cross-source duplicate detection

// Process a single file and return result
async function processSingleFile(
  file: File,
  clientId: string,
  logger: any
): Promise<FileUploadResult> {
  const startTime = Date.now();

  try {
    // Validate file type
    const typeError = validateFileType(file.name, file.type);
    if (typeError) {
      return {
        filename: file.name,
        success: false,
        error: typeError.message,
        errorCode: typeError.code
      };
    }

    // Validate file size
    const sizeError = validateFileSize(file.size);
    if (sizeError) {
      return {
        filename: file.name,
        success: false,
        error: sizeError.message,
        errorCode: sizeError.code
      };
    }

    // Read file buffer for content hash calculation
    const buffer = Buffer.from(await file.arrayBuffer());

    // Calculate content hash for cross-source duplicate detection
    let contentHash: string;
    try {
      contentHash = calculateBufferHash(buffer);
      logger.info("Calculated content hash for uploaded file", {
        metadata: { filename: file.name, contentHash }
      });
    } catch (hashError) {
      const errorMessage = hashError instanceof Error ? hashError.message : 'Unknown hash error';
      logger.warn("Failed to calculate content hash, proceeding without content-based duplicate detection", {
        metadata: { filename: file.name, error: errorMessage }
      });

      return {
        filename: file.name,
        success: false,
        error: "Failed to process file content",
        errorCode: "HASH_CALCULATION_ERROR"
      };
    }

    // Check for existing duplicates (content-based first, then filename-based)
    const existingFile = await findExistingDocument({
      contentHash,
      filename: file.name,
      clientId
    });

    if (existingFile.duplicate) {
      logger.info(`Duplicate file found, returning existing file metadata`, {
        metadata: {
          existingFileId: existingFile.duplicate._id,
          filename: file.name,
          duplicateType: existingFile.duplicateType
        }
      });

      return {
        filename: file.name,
        success: true,
        fileId: existingFile.duplicate._id,
        filePath: existingFile.duplicate.originalPath,
        metadata: {
          title: existingFile.duplicate.metadata?.title,
          author: existingFile.duplicate.metadata?.author,
          wordCount: existingFile.duplicate.metadata?.wordCount || 0,
          pageCount: existingFile.duplicate.metadata?.pageCount,
          extractionTime: existingFile.duplicate.metadata?.extractionTime || 0,
          createdAt: existingFile.duplicate.metadata?.createdAt,
          modifiedAt: existingFile.duplicate.metadata?.modifiedAt,
          contentType: existingFile.duplicate.contentType,
          fileSizeKB: Math.round(existingFile.duplicate.fileSizeBytes / 1024),
          sourceType: existingFile.duplicate.sourceType || "upload",
          uploadedAt: existingFile.duplicate.uploadedAt?.toISOString() || existingFile.duplicate.createdAt?.toISOString()
        },
        duplicateType: existingFile.duplicateType,
        message: existingFile.message || "File already exists, returning existing file"
      };
    }

    // Generate unique filename to avoid conflicts
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const safeFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueFilename = `${timestamp}_${randomSuffix}_${safeFilename}`;
    const filePath = path.join(UPLOADS_DIR, uniqueFilename);

    // Save file to disk
    try {
      await fs.writeFile(filePath, buffer);
    } catch (error) {
      return {
        filename: file.name,
        success: false,
        error: "Failed to save file to disk",
        errorCode: "FILE_SAVE_ERROR"
      };
    }

    // Note: Content extraction is now handled by dedicated /api/extract/{fileId} endpoint
    // This API only handles file storage following single responsibility principle

    // Save document metadata to database (file storage only)
    try {
      const document = await createDocument(
        file.name,
        filePath,
        file.size,
        'binary', // Default encoding for uploaded files
        file.type,
        clientId,
        `Uploaded file: ${file.name}` // Simple description instead of text preview
      );

      // Update document with upload-specific metadata
      const db = await import("@/lib/db").then(m => m.getDb());
      await db.collection("documents").updateOne(
        { _id: document._id },
        {
          $set: {
            "sourceType": "upload",
            "uploadedAt": new Date(),
            "contentHash": contentHash, // Add content hash for cross-source duplicate detection
            "status": "imported" // Ready for extraction via /api/extract/{fileId}
          }
        }
      );

      const processingTime = Date.now() - startTime;
      logger.info(`Successfully uploaded file: ${file.name}`, {
        metadata: {
          documentId: document._id,
          fileSizeKB: Math.round(file.size / 1024),
          processingTime
        }
      });

      return {
        filename: file.name,
        success: true,
        fileId: document._id,
        filePath: filePath,
        metadata: {
          contentType: file.type,
          fileSizeKB: Math.round(file.size / 1024),
          sourceType: "upload",
          uploadedAt: new Date().toISOString(),
          status: "imported" // Ready for extraction
        },
        message: "File uploaded successfully. Use /api/extract/{fileId} to extract content."
      };

    } catch (error) {
      // Clean up uploaded file if database save failed
      try {
        await fs.unlink(filePath);
      } catch (cleanupError) {
        logger.warn(`Failed to clean up file ${file.name} after database error`);
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
      return {
        filename: file.name,
        success: false,
        error: "Failed to save document metadata",
        errorCode: "DATABASE_ERROR"
      };
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown processing error';
    logger.error(`Unexpected error processing file ${file.name}`, { metadata: { error: errorMessage } });

    return {
      filename: file.name,
      success: false,
      error: "An unexpected error occurred during file processing",
      errorCode: "PROCESSING_ERROR"
    };
  }
}

export async function POST(req: NextRequest) {
  const requestId = Logger.createRequestId();
  const logger = Logger.withContext({
    requestId,
    component: "upload-api",
    action: "file-upload"
  });

  try {
    logger.info("Starting file upload request");

    // Parse multipart form data
    const formData = await req.formData();
    const clientId = formData.get("clientId") as string;

    // Validate clientId
    if (!clientId) {
      logger.warn("No clientId provided in request");
      return createErrorResponse({
        code: "NO_CLIENT_ID",
        message: "Client ID is required"
      });
    }

    // Get files from FormData - only use 'files' field for consistency
    const allFiles = formData.getAll("files") as File[];
    const files = allFiles.filter(f => f instanceof File && f.size > 0);

    // Validate that we have files
    if (files.length === 0) {
      logger.warn("No files provided in request");
      return createErrorResponse({
        code: "NO_FILES",
        message: "No files provided"
      });
    }

    // Ensure uploads directory exists
    await ensureUploadsDirectory();

    const totalFiles = files.length;

    logger.info("File upload request details", {
      metadata: {
        totalFiles,
        clientId,
        filenames: files.map(f => f.name),
        sizes: files.map(f => f.size)
      }
    });

    // Process files in batches for parallel processing
    const allResults: FileUploadResult[] = [];
    const batches = chunkArray(files, BATCH_SIZE);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];

      logger.info(`Processing batch ${batchIndex + 1}/${batches.length}`, {
        metadata: { batchSize: batch.length, filenames: batch.map(f => f.name) }
      });

      // Process files in parallel within each batch
      const batchResults = await Promise.allSettled(
        batch.map(file => processSingleFile(file, clientId, logger))
      );

      // Collect results from this batch
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          allResults.push(result.value);
        } else {
          // Handle unexpected Promise.allSettled rejection
          logger.error("Unexpected batch processing error", {
            metadata: { error: result.reason }
          });
          allResults.push({
            filename: "unknown",
            success: false,
            error: "Unexpected batch processing error",
            errorCode: "BATCH_ERROR"
          });
        }
      }
    }

    // Calculate summary statistics
    const successCount = allResults.filter(r => r.success).length;
    const failureCount = allResults.filter(r => !r.success).length;
    const overallSuccess = successCount > 0; // Consider success if at least one file succeeded

    logger.info("File upload completed", {
      metadata: {
        totalFiles,
        successCount,
        failureCount,
        overallSuccess
      }
    });

    // Always return consistent array response format
    const response: MultipleFileUploadResponse = {
      success: overallSuccess,
      totalFiles,
      successCount,
      failureCount,
      results: allResults
    };

    return new Response(
      JSON.stringify(response),
      {
        status: overallSuccess ? 200 : 400,
        headers: { "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown server error';
    logger.error("Unexpected error during file upload", {
      metadata: { error: errorMessage }
    });

    return createErrorResponse({
      code: "SERVER_ERROR",
      message: "An unexpected error occurred during file upload"
    }, 500);
  }
}