/**
 * File Extractor Router
 * Routes different file types to appropriate extraction processors
 */

import { extractPDFContent } from './pdf-extractor';
import { extractHTMLContent } from './html-extractor';
import { extractTextOrMarkdownContent } from './text-extractor';
import fs from 'fs/promises';

// Define supported MIME types and their extractors
export const SUPPORTED_MIME_TYPES = {
  // PDF files
  'application/pdf': 'pdf',
  // HTML files
  'text/html': 'html',
  // Text files
  'text/plain': 'text',
  // Markdown files
  'text/markdown': 'markdown',
  'text/x-markdown': 'markdown',
} as const;

export type SupportedMimeType = keyof typeof SUPPORTED_MIME_TYPES;
export type ExtractorType = typeof SUPPORTED_MIME_TYPES[SupportedMimeType];

/**
 * Standard interface for all file extractors
 */
export interface FileExtractor {
  extract(filePath: string): Promise<ExtractedContent>;
}

/**
 * Standard format for extracted content
 */
export interface ExtractedContent {
  text: string;
  metadata: {
    title?: string;
    author?: string;
    createdAt?: Date;
    modifiedAt?: Date;
    pageCount?: number;
    wordCount: number;
    extractionTime: number;
    [key: string]: any;
  };
}

/**
 * Get the appropriate extractor type for a given MIME type
 */
export function getExtractorType(mimeType: string): ExtractorType | null {
  const normalizedMimeType = mimeType.toLowerCase().split(';')[0].trim();
  return SUPPORTED_MIME_TYPES[normalizedMimeType as SupportedMimeType] || null;
}

/**
 * Check if a MIME type is supported
 */
export function isSupportedMimeType(mimeType: string): boolean {
  return getExtractorType(mimeType) !== null;
}

/**
 * Main extraction router - directs files to appropriate extractors
 */
export async function extractContent(
  filePath: string,
  mimeType: string
): Promise<ExtractedContent> {
  const extractorType = getExtractorType(mimeType);

  if (!extractorType) {
    throw new Error(`Unsupported file type: ${mimeType}`);
  }

  const startTime = Date.now();

  try {
    switch (extractorType) {
      case 'pdf':
        // Read PDF file as buffer and extract content
        const pdfBuffer = await fs.readFile(filePath);
        const pdfResult = await extractPDFContent(pdfBuffer);
        return {
          text: pdfResult.text,
          metadata: {
            title: pdfResult.metadata.title,
            author: pdfResult.metadata.author,
            createdAt: pdfResult.metadata.creationDate,
            modifiedAt: pdfResult.metadata.modificationDate,
            pageCount: pdfResult.metadata.totalPages,
            wordCount: pdfResult.totalWordCount,
            extractionTime: pdfResult.extractionTime,
            ...pdfResult.metadata
          }
        };

      case 'html':
        return await extractHTMLContent(filePath);

      case 'text':
      case 'markdown':
        return await extractTextOrMarkdownContent(filePath, mimeType);

      default:
        throw new Error(`Extractor not implemented for type: ${extractorType}`);
    }
  } catch (error) {
    const extractionTime = Date.now() - startTime;
    throw new Error(`Extraction failed after ${extractionTime}ms: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get list of all supported file extensions
 */
export function getSupportedExtensions(): string[] {
  return [
    '.pdf',
    '.html', '.htm',
    '.txt',
    '.md', '.markdown'
  ];
}

/**
 * Check if a file extension is supported
 */
export function isSupportedExtension(extension: string): boolean {
  const normalizedExt = extension.toLowerCase();
  return getSupportedExtensions().includes(normalizedExt);
}