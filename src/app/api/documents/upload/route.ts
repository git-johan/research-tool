import { NextRequest } from "next/server";
import { Logger } from "@/lib/logger";
import { createDocument, updateDocumentStatus } from "@/lib/db";
import fs from "fs/promises";
import path from "path";

// Configuration constants
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["text/plain"];
const ALLOWED_EXTENSIONS = [".txt"];
const UPLOADS_DIR = path.join(process.cwd(), "uploads");

// Error types for structured error handling
type UploadError = {
  code: string;
  message: string;
  details?: any;
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
      message: `Only .txt files are supported. Received: ${ext}`,
      details: { allowedExtensions: ALLOWED_EXTENSIONS }
    };
  }

  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return {
      code: "INVALID_MIME_TYPE",
      message: `Invalid MIME type. Expected text/plain, received: ${mimeType}`,
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

// Detect text encoding with fallback
async function detectAndReadTextFile(buffer: Buffer): Promise<{ text: string; encoding: string }> {
  // Try UTF-8 first
  try {
    const text = buffer.toString('utf8');
    // Check for invalid UTF-8 characters
    if (!text.includes('\uFFFD')) {
      return { text, encoding: 'utf-8' };
    }
  } catch (error) {
    // UTF-8 failed, try latin1
  }

  // Fallback to latin1 (covers most Western European encodings)
  try {
    const text = buffer.toString('latin1');
    return { text, encoding: 'latin1' };
  } catch (error) {
    throw new Error('Unable to decode file text. File may be corrupted or in an unsupported encoding.');
  }
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
    const file = formData.get("file") as File;
    const clientId = formData.get("clientId") as string;

    // Validate required fields
    if (!file) {
      logger.warn("No file provided in request");
      return createErrorResponse({
        code: "NO_FILE",
        message: "No file provided"
      });
    }

    if (!clientId) {
      logger.warn("No clientId provided in request");
      return createErrorResponse({
        code: "NO_CLIENT_ID",
        message: "Client ID is required"
      });
    }

    logger.info("File upload request details", {
      metadata: {
        filename: file.name,
        size: file.size,
        type: file.type,
        clientId: clientId
      }
    });

    // Validate file type
    const typeError = validateFileType(file.name, file.type);
    if (typeError) {
      logger.warn("File type validation failed", { metadata: typeError });
      return createErrorResponse(typeError);
    }

    // Validate file size
    const sizeError = validateFileSize(file.size);
    if (sizeError) {
      logger.warn("File size validation failed", { metadata: sizeError });
      return createErrorResponse(sizeError);
    }

    // Read file buffer
    logger.debug("Reading file buffer");
    const buffer = Buffer.from(await file.arrayBuffer());

    // Detect encoding and read text
    logger.debug("Detecting file encoding and reading text");
    let text: string;
    let encoding: string;

    try {
      const result = await detectAndReadTextFile(buffer);
      text = result.text;
      encoding = result.encoding;
      logger.debug("File text decoded successfully", {
        metadata: { encoding, textLength: text.length }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown encoding error';
      logger.error("Failed to decode file text", { metadata: { error: errorMessage } });
      return createErrorResponse({
        code: "ENCODING_ERROR",
        message: errorMessage
      }, 500);
    }

    // Validate decoded text
    if (text.trim().length === 0) {
      logger.warn("File contains no readable text content");
      return createErrorResponse({
        code: "NO_TEXT_CONTENT",
        message: "File contains no readable text content"
      });
    }

    // Ensure uploads directory exists
    await ensureUploadsDirectory();

    // Generate unique filename to avoid conflicts
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const safeFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueFilename = `${timestamp}_${randomSuffix}_${safeFilename}`;
    const filePath = path.join(UPLOADS_DIR, uniqueFilename);

    // Save file to disk
    logger.debug("Saving file to disk", { metadata: { filePath } });
    try {
      await fs.writeFile(filePath, buffer);
      logger.info("File saved successfully", { metadata: { filePath, size: buffer.length } });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown file system error';
      logger.error("Failed to save file to disk", { metadata: { error: errorMessage, filePath } });
      return createErrorResponse({
        code: "FILE_SAVE_ERROR",
        message: "Failed to save file to disk"
      }, 500);
    }

    // Create text preview for metadata
    const textPreview = text.substring(0, 200);
    const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
    const lineCount = text.split('\n').length;

    // Save document metadata to database
    logger.debug("Saving document metadata to database");
    try {
      const document = await createDocument(
        file.name,
        filePath,
        file.size,
        encoding,
        file.type,
        clientId,
        textPreview
      );

      // Update document metadata with text statistics
      const db = await import("@/lib/db").then(m => m.getDb());
      await db.collection("documents").updateOne(
        { _id: document._id },
        {
          $set: {
            "metadata.wordCount": wordCount,
            "metadata.lineCount": lineCount
          }
        }
      );

      logger.info("Document created successfully", {
        metadata: {
          documentId: document._id,
          filename: document.filename,
          wordCount,
          lineCount,
          encoding
        }
      });

      // Update status to ready for processing
      await updateDocumentStatus(document._id, "ready_for_processing");

      // Return success response
      return new Response(
        JSON.stringify({
          success: true,
          document: {
            id: document._id,
            filename: document.filename,
            size: document.fileSizeBytes,
            encoding: document.encoding,
            status: document.status,
            uploadedAt: document.uploadedAt,
            metadata: {
              textPreview,
              wordCount,
              lineCount
            }
          }
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
      logger.error("Failed to save document to database", {
        metadata: { error: errorMessage }
      });

      // Clean up uploaded file if database save failed
      try {
        await fs.unlink(filePath);
        logger.debug("Cleaned up uploaded file after database error");
      } catch (cleanupError) {
        logger.warn("Failed to clean up uploaded file", {
          metadata: { cleanupError: cleanupError instanceof Error ? cleanupError.message : 'Unknown cleanup error' }
        });
      }

      return createErrorResponse({
        code: "DATABASE_ERROR",
        message: "Failed to save document metadata"
      }, 500);
    }

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