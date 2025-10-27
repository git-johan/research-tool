/**
 * PDF Text Extractor
 * Extracts text content from PDF files using pdf-extraction library
 * Node.js-native approach designed specifically for server environments
 */

import pdf from 'pdf-extraction';

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

    // Use pdf-extraction library - Node.js native, no webpack issues
    const extractionResult = await pdf(pdfBuffer);

    console.log(`✅ PDF parsed successfully: ${extractionResult.numpages} pages, ${extractionResult.text.length} characters`);
    console.log(`🔍 First 500 characters of extracted text:`, JSON.stringify(extractionResult.text.substring(0, 500)));

    // Extract metadata from pdf-extraction result
    const metadata: PDFMetadata = {
      title: extractionResult.info?.Title || extractTitleFromContent(extractionResult.text) || undefined,
      author: extractionResult.info?.Author || undefined,
      subject: extractionResult.info?.Subject || undefined,
      creator: extractionResult.info?.Creator || undefined,
      producer: extractionResult.info?.Producer || undefined,
      creationDate: extractionResult.info?.CreationDate ? tryParseDate(extractionResult.info.CreationDate) : undefined,
      modificationDate: extractionResult.info?.ModDate ? tryParseDate(extractionResult.info.ModDate) : undefined,
      totalPages: extractionResult.numpages,
    };

    // Since pdf-extraction doesn't provide per-page text, create a single page entry
    const pages = [{
      pageNumber: 1,
      text: extractionResult.text,
      wordCount: countWords(extractionResult.text),
    }];

    // Calculate total word count
    const totalWordCount = countWords(extractionResult.text);

    const extractionTime = Date.now() - startTime;

    console.log(`📊 PDF extraction completed:`);
    console.log(`   Pages: ${metadata.totalPages}`);
    console.log(`   Text length: ${extractionResult.text.length} characters`);
    console.log(`   Word count: ${totalWordCount}`);
    console.log(`   Extraction time: ${extractionTime}ms`);

    if (metadata.title) console.log(`   Title: "${metadata.title}"`);
    if (metadata.author) console.log(`   Author: "${metadata.author}"`);

    return {
      text: extractionResult.text,
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