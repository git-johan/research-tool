/**
 * Clean Extraction Storage
 * Handles saving and loading extraction results with 3-object structure
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * Complete extraction result with 3 clean objects
 */
export interface ExtractionResult {
  document: {
    fileId: string;
    filename: string;
    status: string;
    sourceType: "upload" | "download";
    mimeType: string;
    fileSizeBytes: number;
    contentHash: string;
    clientId?: string;
    uploadedAt?: Date;
    downloadedAt?: Date;
    createdAt?: Date;
  };
  file: {
    originalPath: string;
    exists: boolean;
    actualSize?: number;
    createdAt?: Date;
    modifiedAt?: Date;
  };
  extraction: {
    extractedAt: Date;
    extractionTime: number;
    contentType: string;
    text: string;
    metadata: {
      title?: string;
      author?: string;
      wordCount: number;
      lineCount?: number;
      contentLength: number;
      originalFileSize: number;
      pageCount?: number;
      [key: string]: any;
    };
  };
}

/**
 * Save extraction result to file
 */
export async function saveExtractionResult(
  fileId: string,
  result: ExtractionResult
): Promise<string> {
  const extractionsDir = path.join(process.cwd(), 'files', 'extractions');

  // Ensure extractions directory exists
  await fs.mkdir(extractionsDir, { recursive: true });

  const extractionPath = path.join(extractionsDir, `${fileId}.json`);

  // Convert dates to ISO strings for JSON storage
  const serializedResult = {
    ...result,
    document: {
      ...result.document,
      uploadedAt: result.document.uploadedAt?.toISOString(),
      downloadedAt: result.document.downloadedAt?.toISOString(),
      createdAt: result.document.createdAt?.toISOString(),
    },
    file: {
      ...result.file,
      createdAt: result.file.createdAt?.toISOString(),
      modifiedAt: result.file.modifiedAt?.toISOString(),
    },
    extraction: {
      ...result.extraction,
      extractedAt: result.extraction.extractedAt.toISOString(),
    }
  };

  await fs.writeFile(extractionPath, JSON.stringify(serializedResult, null, 2), 'utf-8');
  return extractionPath;
}

/**
 * Load extraction result from file
 */
export async function loadExtractionResult(fileId: string): Promise<ExtractionResult | null> {
  const extractionPath = path.join(process.cwd(), 'files', 'extractions', `${fileId}.json`);

  try {
    const content = await fs.readFile(extractionPath, 'utf-8');
    const parsed = JSON.parse(content);

    // Convert ISO strings back to Date objects
    return {
      ...parsed,
      document: {
        ...parsed.document,
        uploadedAt: parsed.document.uploadedAt ? new Date(parsed.document.uploadedAt) : undefined,
        downloadedAt: parsed.document.downloadedAt ? new Date(parsed.document.downloadedAt) : undefined,
        createdAt: parsed.document.createdAt ? new Date(parsed.document.createdAt) : undefined,
      },
      file: {
        ...parsed.file,
        createdAt: parsed.file.createdAt ? new Date(parsed.file.createdAt) : undefined,
        modifiedAt: parsed.file.modifiedAt ? new Date(parsed.file.modifiedAt) : undefined,
      },
      extraction: {
        ...parsed.extraction,
        extractedAt: new Date(parsed.extraction.extractedAt),
      }
    };
  } catch (error) {
    return null;
  }
}

/**
 * Check if extraction exists for fileId
 */
export async function extractionExists(fileId: string): Promise<boolean> {
  const extractionPath = path.join(process.cwd(), 'files', 'extractions', `${fileId}.json`);
  try {
    await fs.access(extractionPath);
    return true;
  } catch {
    return false;
  }
}