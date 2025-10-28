import crypto from "crypto";
import fs from "fs/promises";
import { getDb } from "@/lib/db";

/**
 * Calculate SHA-256 hash of file content
 */
export async function calculateFileHash(filePath: string): Promise<string> {
  try {
    const fileBuffer = await fs.readFile(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  } catch (error) {
    throw new Error(`Failed to calculate file hash: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Calculate SHA-256 hash of buffer content
 */
export function calculateBufferHash(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Check for existing document by content hash across all source types
 */
export async function findDuplicateByContentHash(contentHash: string): Promise<any | null> {
  try {
    const db = await getDb();
    const collection = db.collection("documents");

    const existingFile = await collection.findOne({
      contentHash: contentHash,
      status: "imported" // Only check successfully imported files
    });

    return existingFile;
  } catch (error) {
    console.warn(`Failed to check for content duplicate: ${error}`);
    return null;
  }
}

/**
 * Check for existing download by source URL (original behavior)
 */
export async function findDuplicateBySourceUrl(sourceUrl: string): Promise<any | null> {
  try {
    const db = await getDb();
    const collection = db.collection("documents");

    const existingFile = await collection.findOne({
      sourceUrl: sourceUrl,
      sourceType: "download",
      status: "imported"
    });

    return existingFile;
  } catch (error) {
    console.warn(`Failed to check for URL duplicate: ${error}`);
    return null;
  }
}

/**
 * Check for existing upload by filename and client (original behavior)
 */
export async function findDuplicateByFilename(filename: string, clientId: string): Promise<any | null> {
  try {
    const db = await getDb();
    const collection = db.collection("documents");

    const existingFile = await collection.findOne({
      filename: filename,
      clientId: clientId,
      sourceType: "upload",
      status: "imported"
    });

    return existingFile;
  } catch (error) {
    console.warn(`Failed to check for filename duplicate: ${error}`);
    return null;
  }
}

export type DuplicateType = 'content' | 'url' | 'filename' | null;

export interface DuplicateCheckResult {
  duplicate: any | null;
  duplicateType: DuplicateType;
  message?: string;
}

/**
 * Comprehensive duplicate check: content hash first, then source-specific
 */
export async function findExistingDocument(params: {
  contentHash?: string;
  sourceUrl?: string;
  filename?: string;
  clientId?: string;
}): Promise<DuplicateCheckResult> {
  const { contentHash, sourceUrl, filename, clientId } = params;

  // 1. First check for content duplicate (highest priority - cross-source)
  if (contentHash) {
    const contentDuplicate = await findDuplicateByContentHash(contentHash);
    if (contentDuplicate) {
      return {
        duplicate: contentDuplicate,
        duplicateType: 'content',
        message: `File with identical content already exists (source: ${contentDuplicate.sourceType})`
      };
    }
  }

  // 2. Check for URL duplicate (for downloads - source-specific)
  if (sourceUrl) {
    const urlDuplicate = await findDuplicateBySourceUrl(sourceUrl);
    if (urlDuplicate) {
      return {
        duplicate: urlDuplicate,
        duplicateType: 'url',
        message: 'File from this URL already downloaded'
      };
    }
  }

  // 3. Check for filename duplicate (for uploads - source-specific)
  if (filename && clientId) {
    const filenameDuplicate = await findDuplicateByFilename(filename, clientId);
    if (filenameDuplicate) {
      return {
        duplicate: filenameDuplicate,
        duplicateType: 'filename',
        message: 'File with this name already uploaded'
      };
    }
  }

  return {
    duplicate: null,
    duplicateType: null
  };
}