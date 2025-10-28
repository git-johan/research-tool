import { NextRequest } from "next/server";
import { Logger } from "@/lib/logger";
import { validateDocumentStatus, updateDocumentStatusSafely, DOCUMENT_STATUS } from "@/lib/status-utilities";
import { saveExtractionResult, ExtractionResult } from "@/lib/extraction-storage";
import { extractContent } from "@/lib/processing/extractors";
import fs from "fs/promises";
import path from "path";

interface ExtractionRequest {
  clientId?: string; // Optional for validation
}

interface ExtractionResponse {
  success: boolean;
  extractionPath?: string;
  result?: ExtractionResult;
  error?: string;
  message?: string;
}

// Configuration constants
const UPLOADS_DIR = path.join(process.cwd(), "files", "uploads");
const DOWNLOADS_DIR = path.join(process.cwd(), "files", "downloads");

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const requestId = Logger.createRequestId();
  const logger = Logger.withContext({
    requestId,
    component: "extraction-api",
    action: "extract-content"
  });

  const { fileId } = await params;

  try {
    logger.info("Starting content extraction request", {
      metadata: { fileId }
    });

    // Parse request body (optional)
    let body: ExtractionRequest = {};
    try {
      body = await req.json();
    } catch (error) {
      // Empty body is fine, clientId is optional
    }

    // Validate document exists and has correct status
    const validation = await validateDocumentStatus(fileId, DOCUMENT_STATUS.IMPORTED);

    if (!validation.valid) {
      logger.warn("Document validation failed", {
        metadata: { fileId, error: validation.error }
      });
      return new Response(
        JSON.stringify({
          success: false,
          error: validation.error
        } as ExtractionResponse),
        {
          status: validation.error?.includes("not found") ? 404 : 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    const document = validation.document!;
    const startTime = Date.now();

    // Determine file path based on sourceType
    let filePath: string;
    if (document.sourceType === "upload") {
      filePath = document.originalPath || path.join(UPLOADS_DIR, document.filename);
    } else if (document.sourceType === "download") {
      filePath = document.originalPath || path.join(DOWNLOADS_DIR, document.filename);
    } else {
      logger.error("Unknown sourceType", {
        metadata: { fileId, sourceType: document.sourceType }
      });
      return new Response(
        JSON.stringify({
          success: false,
          error: "Unknown source type for document"
        } as ExtractionResponse),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Verify file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      logger.error("File not found", {
        metadata: { fileId, filePath }
      });
      return new Response(
        JSON.stringify({
          success: false,
          error: `File not found at path: ${filePath}`
        } as ExtractionResponse),
        {
          status: 404,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Update status to indicate extraction in progress
    const statusUpdate = await updateDocumentStatusSafely(fileId, DOCUMENT_STATUS.EXTRACTED as any);
    if (!statusUpdate.success) {
      logger.error("Failed to update status to extracted", {
        metadata: { fileId, error: statusUpdate.error }
      });
      // Don't fail the request, just log the warning
      logger.warn("Continuing extraction despite status update failure");
    }

    // Get file stats
    let fileStats;
    try {
      const stats = await fs.stat(filePath);
      fileStats = {
        originalPath: filePath,
        exists: true,
        actualSize: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime
      };
    } catch (error) {
      fileStats = {
        originalPath: filePath,
        exists: false
      };
    }

    // Extract content using existing extractors
    const contentType = document.mimeType;
    let extractedContent;

    try {
      extractedContent = await extractContent(filePath, contentType);
      logger.info("Content extraction completed", {
        metadata: {
          fileId,
          wordCount: extractedContent.metadata.wordCount,
          extractionTime: extractedContent.metadata.extractionTime
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown extraction error';
      logger.error("Content extraction failed", {
        metadata: { fileId, error: errorMessage }
      });

      // Update status to failed
      await updateDocumentStatusSafely(fileId, DOCUMENT_STATUS.FAILED as any, {
        error: errorMessage
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: `Content extraction failed: ${errorMessage}`
        } as ExtractionResponse),
        {
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Build clean 3-object result directly
    const extractionTime = Date.now() - startTime;

    const result: ExtractionResult = {
      document: {
        fileId: document._id.toString(),
        filename: document.filename,
        status: document.status,
        sourceType: document.sourceType,
        mimeType: document.mimeType,
        fileSizeBytes: document.fileSizeBytes,
        contentHash: document.contentHash,
        clientId: document.clientId,
        uploadedAt: document.uploadedAt,
        downloadedAt: document.downloadedAt,
        createdAt: document.createdAt
      },
      file: fileStats,
      extraction: {
        extractedAt: new Date(),
        extractionTime,
        contentType,
        text: extractedContent.text,
        metadata: {
          ...extractedContent.metadata,
          contentLength: extractedContent.text?.length || 0,
          originalFileSize: document.fileSizeBytes
        }
      }
    };

    // Save extraction result
    let extractionPath: string;
    try {
      extractionPath = await saveExtractionResult(fileId, result);
      logger.info("Extraction result saved", {
        metadata: { fileId, extractionPath }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown save error';
      logger.error("Failed to save extraction result", {
        metadata: { fileId, error: errorMessage }
      });

      // Update status to failed
      await updateDocumentStatusSafely(fileId, DOCUMENT_STATUS.FAILED as any, {
        error: errorMessage
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: `Failed to save extraction result: ${errorMessage}`
        } as ExtractionResponse),
        {
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    logger.info("Content extraction completed successfully", {
      metadata: {
        fileId,
        totalTime: extractionTime,
        wordCount: extractedContent.metadata.wordCount,
        extractionPath
      }
    });

    const response: ExtractionResponse = {
      success: true,
      extractionPath,
      result,
      message: "Content extracted and saved successfully"
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown server error';
    logger.error("Unexpected error during extraction", {
      metadata: { fileId, error: errorMessage }
    });

    // Try to update status to failed
    try {
      await updateDocumentStatusSafely(fileId, DOCUMENT_STATUS.FAILED as any, {
        error: errorMessage
      });
    } catch (statusError) {
      logger.error("Failed to update status to failed", {
        metadata: { fileId, statusError }
      });
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: "An unexpected error occurred during extraction"
      } as ExtractionResponse),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}

// GET endpoint to check extraction status
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const requestId = Logger.createRequestId();
  const logger = Logger.withContext({
    requestId,
    component: "extraction-api",
    action: "check-extraction-status"
  });

  const { fileId } = await params;

  try {
    const validation = await validateDocumentStatus(fileId, Object.values(DOCUMENT_STATUS) as any);

    if (!validation.valid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: validation.error
        }),
        {
          status: validation.error?.includes("not found") ? 404 : 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    const document = validation.document!;

    return new Response(
      JSON.stringify({
        success: true,
        fileId,
        status: document.status,
        canExtract: document.status === DOCUMENT_STATUS.IMPORTED,
        message: document.status === DOCUMENT_STATUS.EXTRACTED
          ? "Content has been extracted"
          : document.status === DOCUMENT_STATUS.IMPORTED
            ? "Ready for extraction"
            : `Current status: ${document.status}`
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error("Error checking extraction status", {
      metadata: { fileId, error: errorMessage }
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}