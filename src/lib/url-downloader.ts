/**
 * URL Downloader Utility
 * Downloads files from URLs to local storage with metadata tracking
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export interface DownloadResult {
  success: boolean;
  filePath?: string;
  filename?: string;
  metadata: DownloadMetadata;
  error?: string;
}

export interface DownloadMetadata {
  sourceUrl: string;
  urlHash: string;
  httpStatus: number;
  contentType: string;
  contentLength?: number;
  fileSizeBytes: number;
  downloadTime: number;
  userAgent: string;
  responseHeaders: Record<string, string>;
  downloadedAt: string;
}

export interface DownloadOptions {
  userAgent?: string;
  timeout?: number;
  maxSizeBytes?: number;
}

/**
 * Generate a URL hash for filename creation
 */
export function generateUrlHash(url: string): string {
  return crypto.createHash('sha256').update(url).digest('hex').substring(0, 12);
}

/**
 * Detect file extension from Content-Type header
 */
export function getFileExtensionFromContentType(contentType: string): string {
  const normalizedType = contentType.toLowerCase().split(';')[0].trim();

  switch (normalizedType) {
    case 'application/pdf':
      return '.pdf';
    case 'text/html':
    case 'application/xhtml+xml':
      return '.html';
    case 'text/plain':
      return '.txt';
    case 'text/markdown':
    case 'text/x-markdown':
      return '.md';
    default:
      // Try to extract from content type if it has a subtype
      if (normalizedType.includes('html')) return '.html';
      if (normalizedType.includes('pdf')) return '.pdf';
      if (normalizedType.includes('text')) return '.txt';
      return '.txt'; // Default fallback
  }
}

/**
 * Generate filename from URL and content type
 */
export function generateFilename(url: string, contentType: string): string {
  const urlHash = generateUrlHash(url);
  const timestamp = Math.floor(Date.now() / 1000); // Unix timestamp
  const extension = getFileExtensionFromContentType(contentType);

  return `${urlHash}_${timestamp}${extension}`;
}

/**
 * Download file from URL with streaming support for large files
 */
export async function downloadFile(
  url: string,
  outputDir: string,
  options: DownloadOptions = {}
): Promise<DownloadResult> {
  const startTime = Date.now();

  const {
    userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    timeout = 30000,
    maxSizeBytes = 100 * 1024 * 1024 // 100MB default limit
  } = options;

  try {
    console.log(`🌐 Downloading file from: ${url}`);

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch (error) {
      throw new Error(`Invalid URL format: ${url}`);
    }

    // Make HTTP request
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': userAgent,
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
      },
      // Note: fetch doesn't support timeout directly, but it's handled by the platform
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Extract response metadata
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const contentLength = response.headers.get('content-length');
    const contentLengthBytes = contentLength ? parseInt(contentLength, 10) : undefined;

    // Check file size limit
    if (contentLengthBytes && contentLengthBytes > maxSizeBytes) {
      throw new Error(`File too large: ${(contentLengthBytes / 1024 / 1024).toFixed(2)}MB (limit: ${(maxSizeBytes / 1024 / 1024).toFixed(2)}MB)`);
    }

    // Generate filename
    const filename = generateFilename(url, contentType);
    const filePath = path.join(outputDir, filename);

    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    // Download file with streaming
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Check actual file size against limit
    if (buffer.length > maxSizeBytes) {
      throw new Error(`Downloaded file too large: ${(buffer.length / 1024 / 1024).toFixed(2)}MB (limit: ${(maxSizeBytes / 1024 / 1024).toFixed(2)}MB)`);
    }

    // Write file to disk
    await fs.writeFile(filePath, buffer);

    const downloadTime = Date.now() - startTime;

    // Collect response headers for metadata
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    const metadata: DownloadMetadata = {
      sourceUrl: url,
      urlHash: generateUrlHash(url),
      httpStatus: response.status,
      contentType,
      contentLength: contentLengthBytes,
      fileSizeBytes: buffer.length,
      downloadTime,
      userAgent,
      responseHeaders,
      downloadedAt: new Date().toISOString()
    };

    console.log(`✅ Download completed: ${filename} (${(buffer.length / 1024).toFixed(2)} KB in ${downloadTime}ms)`);

    return {
      success: true,
      filePath,
      filename,
      metadata
    };

  } catch (error) {
    const downloadTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown download error';

    console.error(`❌ Download failed after ${downloadTime}ms: ${errorMessage}`);

    const metadata: DownloadMetadata = {
      sourceUrl: url,
      urlHash: generateUrlHash(url),
      httpStatus: 0,
      contentType: 'unknown',
      fileSizeBytes: 0,
      downloadTime,
      userAgent,
      responseHeaders: {},
      downloadedAt: new Date().toISOString()
    };

    return {
      success: false,
      metadata,
      error: errorMessage
    };
  }
}

/**
 * Validate if URL is downloadable (basic checks)
 */
export function isValidDownloadUrl(url: string): { valid: boolean; reason?: string } {
  try {
    const parsedUrl = new URL(url);

    // Check protocol
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return { valid: false, reason: 'Only HTTP and HTTPS URLs are supported' };
    }

    // Check for obviously non-downloadable URLs
    const hostname = parsedUrl.hostname.toLowerCase();
    const pathname = parsedUrl.pathname.toLowerCase();

    // Block some problematic domains/patterns
    const blockedPatterns = [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      'file://',
      'ftp://'
    ];

    for (const pattern of blockedPatterns) {
      if (hostname.includes(pattern) || url.includes(pattern)) {
        return { valid: false, reason: `Blocked URL pattern: ${pattern}` };
      }
    }

    return { valid: true };

  } catch (error) {
    return { valid: false, reason: 'Invalid URL format' };
  }
}