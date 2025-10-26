/**
 * PDF Text Extractor
 * Extracts text content from PDF files using pdf-parse library
 * Provides structured output similar to web content processor
 */

import { PDFParse } from 'pdf-parse';

export interface PDFMetadata {
  title?: string;
  author?: string;
  subject?: string;
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
  totalPages: number;
}

export interface PDFExtractionResult {
  text: string;
  metadata: PDFMetadata;
  pages: Array<{
    pageNumber: number;
    text: string;
    wordCount: number;
  }>;
  totalWordCount: number;
  extractionTime: number;
}

/**
 * Extract text and metadata from PDF buffer
 * @param pdfBuffer - PDF file as Buffer
 * @returns Structured PDF content and metadata
 */
export async function extractPDFContent(pdfBuffer: Buffer): Promise<PDFExtractionResult> {
  const startTime = Date.now();

  try {
    console.log(`📄 Extracting content from PDF (${pdfBuffer.length} bytes)`);

    // Parse PDF with pdf-parse
    const parser = new PDFParse({ data: pdfBuffer });
    const data = await parser.getText();

    console.log(`✅ PDF parsed successfully: ${data.totalPages || 'unknown'} pages, ${data.text.length} characters`);

    // Get additional info if available
    const infoResult = await parser.getInfo().catch(() => ({ info: {}, totalPages: 1 }));

    // Extract metadata
    const metadata: PDFMetadata = {
      title: infoResult.info?.Title || undefined,
      author: infoResult.info?.Author || undefined,
      subject: infoResult.info?.Subject || undefined,
      creator: infoResult.info?.Creator || undefined,
      producer: infoResult.info?.Producer || undefined,
      creationDate: infoResult.info?.CreationDate ? tryParseDate(infoResult.info.CreationDate) : undefined,
      modificationDate: infoResult.info?.ModDate ? tryParseDate(infoResult.info.ModDate) : undefined,
      totalPages: data.totalPages || infoResult.totalPages || 1,
    };

    // Split text into pages (approximation since pdf-parse doesn't provide page-by-page text)
    const pages = createPageApproximation(data.text, metadata.totalPages);

    // Calculate word count
    const totalWordCount = countWords(data.text);

    const extractionTime = Date.now() - startTime;

    console.log(`📊 PDF extraction completed:`);
    console.log(`   Pages: ${metadata.totalPages}`);
    console.log(`   Text length: ${data.text.length} characters`);
    console.log(`   Word count: ${totalWordCount}`);
    console.log(`   Extraction time: ${extractionTime}ms`);

    if (metadata.title) console.log(`   Title: "${metadata.title}"`);
    if (metadata.author) console.log(`   Author: "${metadata.author}"`);

    return {
      text: data.text,
      metadata,
      pages,
      totalWordCount,
      extractionTime,
    };

  } catch (error) {
    const extractionTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown PDF extraction error';

    console.error(`❌ PDF extraction failed after ${extractionTime}ms: ${errorMessage}`);
    throw new Error(`PDF extraction failed: ${errorMessage}`);
  }
}

/**
 * Fetch PDF from URL and extract content
 * @param url - URL to PDF file
 * @returns Structured PDF content and metadata
 */
export async function extractPDFFromURL(url: string): Promise<PDFExtractionResult> {
  console.log(`🌐 Fetching PDF from: ${url}`);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/pdf,*/*',
      },
      timeout: 30000, // 30 second timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Check content type
    const contentType = response.headers.get('content-type');
    if (contentType && !contentType.includes('application/pdf')) {
      console.warn(`⚠️ Content-Type is "${contentType}", not application/pdf`);
    }

    // Get PDF as buffer
    const arrayBuffer = await response.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);

    console.log(`✅ PDF fetched: ${pdfBuffer.length} bytes`);

    // Extract content from buffer
    return await extractPDFContent(pdfBuffer);

  } catch (error: any) {
    console.error(`❌ Failed to fetch PDF from URL: ${error.message}`);
    throw error;
  }
}

/**
 * Create page approximation by splitting text evenly
 * Since pdf-parse doesn't provide page-by-page text, we approximate
 */
function createPageApproximation(text: string, totalPages: number): Array<{
  pageNumber: number;
  text: string;
  wordCount: number;
}> {
  if (totalPages <= 1) {
    return [{
      pageNumber: 1,
      text: text,
      wordCount: countWords(text),
    }];
  }

  const pages: Array<{ pageNumber: number; text: string; wordCount: number }> = [];
  const textLength = text.length;
  const charsPerPage = Math.ceil(textLength / totalPages);

  for (let i = 0; i < totalPages; i++) {
    const startIndex = i * charsPerPage;
    const endIndex = Math.min((i + 1) * charsPerPage, textLength);
    const pageText = text.slice(startIndex, endIndex);

    pages.push({
      pageNumber: i + 1,
      text: pageText,
      wordCount: countWords(pageText),
    });
  }

  return pages;
}

/**
 * Count words in text
 */
function countWords(text: string): number {
  return text.split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Safely parse date from PDF metadata
 */
function tryParseDate(dateValue: any): Date | undefined {
  try {
    if (!dateValue) return undefined;
    const date = new Date(dateValue);
    return isNaN(date.getTime()) ? undefined : date;
  } catch {
    return undefined;
  }
}

/**
 * Clean and normalize PDF text
 * PDFs often have formatting artifacts that need cleaning
 */
export function cleanPDFText(text: string): string {
  return text
    // Remove excessive whitespace
    .replace(/\s+/g, ' ')
    // Remove page breaks and form feeds
    .replace(/[\f\r]/g, '\n')
    // Normalize line breaks
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    // Remove leading/trailing whitespace
    .trim();
}

/**
 * Extract title from PDF content if not available in metadata
 * Looks for title-like text at the beginning of the document
 */
export function extractTitleFromContent(text: string): string | null {
  // Split into lines and look for potential title in first few lines
  const lines = text.split('\n').filter(line => line.trim().length > 0);

  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i].trim();

    // Skip if line is too short or too long
    if (line.length < 10 || line.length > 200) continue;

    // Skip if line looks like metadata, headers, or page numbers
    if (/^(page|abstract|introduction|doi:|http:|www\.|©|\d+\s*$)/i.test(line)) continue;

    // Skip if line is all caps (likely header/footer)
    if (line === line.toUpperCase() && line.length > 20) continue;

    // This might be a title
    return line;
  }

  return null;
}