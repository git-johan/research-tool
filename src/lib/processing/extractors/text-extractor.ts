/**
 * Text and Markdown Content Extractor
 * Handles plain text (.txt) and markdown (.md) files
 */

import fs from 'fs/promises';
import { ExtractedContent } from './index';

/**
 * Extract content from plain text files
 */
export async function extractTextContent(filePath: string): Promise<ExtractedContent> {
  const startTime = Date.now();

  try {
    // Read text file
    const textContent = await fs.readFile(filePath, 'utf-8');

    // For plain text, the content is already clean
    const cleanedText = textContent
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\r/g, '\n')
      .trim();

    const extractionTime = Date.now() - startTime;
    const wordCount = cleanedText.split(/\s+/).filter(word => word.length > 0).length;

    // Try to extract a title from the first line if it looks like a title
    let title = 'Text Document';
    const lines = cleanedText.split('\n');

    if (lines.length > 0) {
      const firstLine = lines[0].trim();
      // If first line is short and doesn't end with punctuation, use as title
      if (firstLine.length > 0 && firstLine.length < 100 && !/[.!?;]$/.test(firstLine)) {
        title = firstLine;
      }
    }

    return {
      text: cleanedText,
      metadata: {
        title,
        wordCount,
        extractionTime,
        lineCount: lines.length,
        contentLength: cleanedText.length,
        originalFileSize: textContent.length
      }
    };

  } catch (error) {
    const extractionTime = Date.now() - startTime;
    throw new Error(`Text extraction failed after ${extractionTime}ms: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract content from markdown files with basic formatting preservation
 */
export async function extractMarkdownContent(filePath: string): Promise<ExtractedContent> {
  const startTime = Date.now();

  try {
    // Read markdown file
    const markdownContent = await fs.readFile(filePath, 'utf-8');

    // Clean up markdown content while preserving essential formatting
    let processedContent = markdownContent
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\r/g, '\n')
      .trim();

    // Extract title from first heading or filename
    let title = 'Markdown Document';
    const titleMatch = processedContent.match(/^#\s+(.+)$/m);
    if (titleMatch) {
      title = titleMatch[1].trim();
    }

    // For search purposes, we want to keep the markdown mostly intact
    // but clean up some formatting that might interfere with search
    const searchableText = processedContent
      // Remove HTML comments
      .replace(/<!--[\s\S]*?-->/g, '')
      // Convert markdown links to just the text part for better searchability
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove extra whitespace but preserve paragraph breaks
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim();

    const extractionTime = Date.now() - startTime;
    const wordCount = searchableText.split(/\s+/).filter(word => word.length > 0).length;
    const lines = searchableText.split('\n');

    // Count markdown elements for metadata
    const headingCount = (searchableText.match(/^#+\s/gm) || []).length;
    const linkCount = (markdownContent.match(/\[([^\]]+)\]\([^)]+\)/g) || []).length;
    const codeBlockCount = (markdownContent.match(/```/g) || []).length / 2;

    return {
      text: searchableText,
      metadata: {
        title,
        wordCount,
        extractionTime,
        lineCount: lines.length,
        contentLength: searchableText.length,
        originalFileSize: markdownContent.length,
        // Markdown-specific metadata
        headingCount,
        linkCount,
        codeBlockCount,
        hasTableOfContents: /\[toc\]/i.test(markdownContent)
      }
    };

  } catch (error) {
    const extractionTime = Date.now() - startTime;
    throw new Error(`Markdown extraction failed after ${extractionTime}ms: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Auto-detect and extract content from text or markdown files based on extension
 */
export async function extractTextOrMarkdownContent(filePath: string, mimeType: string): Promise<ExtractedContent> {
  const isMarkdown = mimeType === 'text/markdown' ||
                    mimeType === 'text/x-markdown' ||
                    filePath.toLowerCase().endsWith('.md') ||
                    filePath.toLowerCase().endsWith('.markdown');

  if (isMarkdown) {
    return extractMarkdownContent(filePath);
  } else {
    return extractTextContent(filePath);
  }
}