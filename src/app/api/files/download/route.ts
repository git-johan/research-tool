import { NextRequest } from "next/server";
import { Logger } from "@/lib/logger";
import { getDb } from "@/lib/db";
import { downloadFile, isValidDownloadUrl, DownloadMetadata } from "@/lib/url-downloader";
import { calculateFileHash, findExistingDocument, DuplicateType } from "@/lib/duplicate-detection";
import path from "path";
import crypto from "crypto";

interface DownloadRequest {
  url: string;
  options?: {
    userAgent?: string;
    timeout?: number;
    maxSizeBytes?: number;
  };
}

interface DownloadResponse {
  success: boolean;
  fileId?: string;
  filePath?: string;
  filename?: string;
  metadata?: {
    sourceUrl: string;
    downloadedAt: string;
    contentType: string;
    fileSizeKB: number;
    downloadTimeMs: number;
  };
  duplicateType?: DuplicateType;
  message?: string;
  error?: string;
}

// Configuration constants
const DOWNLOADS_DIR = path.join(process.cwd(), "files", "downloads");
const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export async function POST(req: NextRequest) {
  const requestId = Logger.createRequestId();
  const logger = Logger.withContext({
    requestId,
    component: "download-api",
    action: "url-download"
  });

  try {
    const body: DownloadRequest = await req.json();
    const { url, options = {} } = body;

    if (!url) {
      logger.warn("No URL provided in request");
      return new Response(
        JSON.stringify({
          success: false,
          error: "URL is required"
        } as DownloadResponse),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    logger.info("Download request received", {
      metadata: { url, options }
    });

    // Validate URL
    const validation = isValidDownloadUrl(url);
    if (!validation.valid) {
      logger.warn("Invalid URL provided", {
        metadata: { url, reason: validation.reason }
      });
      return new Response(
        JSON.stringify({
          success: false,
          error: validation.reason || "Invalid URL"
        } as DownloadResponse),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Check for existing duplicates (URL-based first, content-based after download)
    const urlDuplicate = await findExistingDocument({ sourceUrl: url });

    if (urlDuplicate.duplicate) {
      logger.info("URL already downloaded, returning existing document", {
        metadata: { url, existingFileId: urlDuplicate.duplicate._id, duplicateType: urlDuplicate.duplicateType }
      });

      return new Response(
        JSON.stringify({
          success: true,
          fileId: urlDuplicate.duplicate._id,
          filePath: urlDuplicate.duplicate.originalPath,
          filename: urlDuplicate.duplicate.filename,
          metadata: {
            sourceUrl: url,
            downloadedAt: urlDuplicate.duplicate.downloadedAt?.toISOString() || urlDuplicate.duplicate.createdAt?.toISOString(),
            contentType: urlDuplicate.duplicate.contentType,
            fileSizeKB: Math.round(urlDuplicate.duplicate.fileSizeBytes / 1024),
            downloadTimeMs: 0 // Existing file, no download time
          },
          duplicateType: urlDuplicate.duplicateType,
          message: urlDuplicate.message || "File already exists, returning existing download"
        } as DownloadResponse),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Download the file
    logger.info("Starting file download", {
      metadata: { url }
    });

    const downloadResult = await downloadFile(url, DOWNLOADS_DIR, {
      ...options,
      maxSizeBytes: options.maxSizeBytes || MAX_FILE_SIZE_BYTES
    });

    if (!downloadResult.success) {
      logger.error("Download failed", {
        metadata: { url, error: downloadResult.error }
      });
      return new Response(
        JSON.stringify({
          success: false,
          error: downloadResult.error || "Download failed"
        } as DownloadResponse),
        {
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Calculate content hash for cross-source duplicate detection
    let contentHash: string | undefined;
    try {
      contentHash = await calculateFileHash(downloadResult.filePath!);
      logger.info("Calculated content hash for downloaded file", {
        metadata: { url, contentHash, filePath: downloadResult.filePath }
      });

      // Check for content-based duplicates now that we have the hash
      const contentDuplicate = await findExistingDocument({ contentHash });
      if (contentDuplicate.duplicate) {
        logger.info("Found content duplicate after download, returning existing file", {
          metadata: {
            url,
            contentHash,
            existingFileId: contentDuplicate.duplicate._id,
            duplicateType: contentDuplicate.duplicateType
          }
        });

        // Clean up the downloaded file since we have a duplicate
        try {
          await import("fs/promises").then(fs => fs.unlink(downloadResult.filePath!));
        } catch (cleanupError) {
          logger.warn("Failed to clean up duplicate downloaded file", {
            metadata: { filePath: downloadResult.filePath, error: cleanupError }
          });
        }

        return new Response(
          JSON.stringify({
            success: true,
            fileId: contentDuplicate.duplicate._id,
            filePath: contentDuplicate.duplicate.originalPath,
            filename: contentDuplicate.duplicate.filename,
            metadata: {
              sourceUrl: url,
              downloadedAt: contentDuplicate.duplicate.downloadedAt?.toISOString() || contentDuplicate.duplicate.createdAt?.toISOString(),
              contentType: contentDuplicate.duplicate.contentType,
              fileSizeKB: Math.round(contentDuplicate.duplicate.fileSizeBytes / 1024),
              downloadTimeMs: downloadResult.metadata.downloadTime
            },
            duplicateType: contentDuplicate.duplicateType,
            message: contentDuplicate.message
          } as DownloadResponse),
          {
            status: 200,
            headers: { "Content-Type": "application/json" }
          }
        );
      }
    } catch (hashError) {
      // Log error but continue without content hash
      logger.warn("Failed to calculate content hash, proceeding without content-based duplicate detection", {
        metadata: { url, error: hashError instanceof Error ? hashError.message : 'Unknown error' }
      });
    }

    // Store download record in MongoDB
    const db = await getDb();
    const collection = db.collection("documents");

    const fileId = crypto.randomUUID();
    const downloadRecord = {
      _id: fileId,
      filename: downloadResult.filename!,
      originalPath: downloadResult.filePath!,
      sourceUrl: url,
      downloadedAt: downloadResult.metadata.downloadedAt ? new Date(downloadResult.metadata.downloadedAt) : new Date(),
      contentType: downloadResult.metadata.contentType,
      fileSizeBytes: downloadResult.metadata.fileSizeBytes,
      status: "imported" as const,
      sourceType: "download" as const,
      ...(contentHash && { contentHash }), // Add content hash if available

      // Download-specific metadata
      metadata: {
        urlHash: downloadResult.metadata.urlHash,
        httpStatus: downloadResult.metadata.httpStatus,
        responseHeaders: downloadResult.metadata.responseHeaders,
        downloadTime: downloadResult.metadata.downloadTime,
        userAgent: downloadResult.metadata.userAgent,
        contentLength: downloadResult.metadata.contentLength,
      }
    };

    await collection.insertOne(downloadRecord);

    logger.info("Download completed and recorded", {
      metadata: {
        fileId,
        filename: downloadResult.filename,
        fileSizeKB: Math.round(downloadResult.metadata.fileSizeBytes / 1024),
        downloadTimeMs: downloadResult.metadata.downloadTime,
        contentType: downloadResult.metadata.contentType
      }
    });

    const response: DownloadResponse = {
      success: true,
      fileId,
      filePath: downloadResult.filePath!,
      filename: downloadResult.filename!,
      metadata: {
        sourceUrl: url,
        downloadedAt: downloadResult.metadata.downloadedAt,
        contentType: downloadResult.metadata.contentType,
        fileSizeKB: Math.round(downloadResult.metadata.fileSizeBytes / 1024),
        downloadTimeMs: downloadResult.metadata.downloadTime,
        sourceType: "download",
        status: "imported" // Ready for extraction
      },
      message: "File downloaded successfully. Use /api/extract/{fileId} to extract content."
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown download error';
    logger.error("Download request failed", {
      metadata: { error: errorMessage }
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      } as DownloadResponse),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}

// GET endpoint to list downloaded files
export async function GET(req: NextRequest) {
  const requestId = Logger.createRequestId();
  const logger = Logger.withContext({
    requestId,
    component: "download-api",
    action: "list-downloads"
  });

  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const db = await getDb();
    const collection = db.collection("documents");

    // Query only downloaded files
    const downloads = await collection
      .find({
        sourceType: "download",
        status: "imported"
      })
      .sort({ downloadedAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();

    const totalCount = await collection.countDocuments({
      sourceType: "download",
      status: "imported"
    });

    logger.info("Downloads retrieved", {
      metadata: { count: downloads.length, totalCount, limit, offset }
    });

    return new Response(JSON.stringify({
      success: true,
      downloads: downloads.map(doc => ({
        fileId: doc._id,
        filename: doc.filename,
        sourceUrl: doc.sourceUrl,
        downloadedAt: doc.downloadedAt,
        contentType: doc.contentType,
        fileSizeKB: Math.round(doc.fileSizeBytes / 1024),
        status: doc.status
      })),
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      }
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error("Failed to retrieve downloads", {
      metadata: { error: errorMessage }
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