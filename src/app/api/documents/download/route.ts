import { NextRequest } from "next/server";
import { Logger } from "@/lib/logger";
import { getDb } from "@/lib/db";
import { downloadFile, isValidDownloadUrl, DownloadMetadata } from "@/lib/url-downloader";
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
  error?: string;
}

// Configuration constants
const UPLOADS_DIR = path.join(process.cwd(), "uploads");
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

    // Download the file
    logger.info("Starting file download", {
      metadata: { url }
    });

    const downloadResult = await downloadFile(url, UPLOADS_DIR, {
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

    // Store download record in MongoDB
    const db = await getDb();
    const collection = db.collection("documents");

    const fileId = crypto.randomUUID();
    const downloadRecord = {
      _id: fileId,
      filename: downloadResult.filename!,
      originalPath: downloadResult.filePath!,
      sourceUrl: url,
      downloadedAt: new Date(downloadResult.metadata.downloadedAt),
      contentType: downloadResult.metadata.contentType,
      fileSizeBytes: downloadResult.metadata.fileSizeBytes,
      status: "downloaded" as const,
      sourceType: "download" as const,

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
        downloadTimeMs: downloadResult.metadata.downloadTime
      }
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
        status: "downloaded"
      })
      .sort({ downloadedAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();

    const totalCount = await collection.countDocuments({
      sourceType: "download",
      status: "downloaded"
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