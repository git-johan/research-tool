import { NextRequest } from "next/server";
import { Logger } from "@/lib/logger";
import { getDb } from "@/lib/db";
import { processAndStoreDocument } from "@/lib/processing/indexer";

interface PDFDocumentResponse {
  success: boolean;
  documentId?: string;
  title?: string;
  chunkCount?: number;
  processingTime?: number;
  error?: string;
  message?: string;
}

interface PDFDocumentRequest {
  url: string;
}

/**
 * Extract PDF content using a server-side only approach
 */
async function extractPDFFromURL(url: string) {
  console.log(`🌐 Fetching PDF from: ${url}`);

  // Fetch PDF
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'application/pdf,*/*',
    },
    timeout: 30000,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const pdfBuffer = Buffer.from(arrayBuffer);

  console.log(`✅ PDF fetched: ${pdfBuffer.length} bytes`);

  // Use pdfjs-dist for better Next.js compatibility
  const pdfjsLib = require('pdfjs-dist');

  const startTime = Date.now();

  try {
    const pdfDocument = await pdfjsLib.getDocument({ data: pdfBuffer }).promise;

    let fullText = '';
    const numPages = pdfDocument.numPages;

    // Extract text from each page
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += pageText + '\n';
    }

    // Get metadata
    const metadata = await pdfDocument.getMetadata();

    const extractionTime = Date.now() - startTime;
    const wordCount = fullText.split(/\s+/).filter(word => word.length > 0).length;

    return {
      text: fullText.trim(),
      title: metadata?.info?.Title || `PDF Document ${Date.now()}`,
      metadata: {
        totalPages: numPages,
        author: metadata?.info?.Author,
        creator: metadata?.info?.Creator,
        producer: metadata?.info?.Producer,
        creationDate: metadata?.info?.CreationDate ? tryParseDate(metadata.info.CreationDate) : undefined,
        modificationDate: metadata?.info?.ModDate ? tryParseDate(metadata.info.ModDate) : undefined,
      },
      wordCount,
      extractionTime
    };
  } catch (pdfError) {
    console.error('PDF parsing error:', pdfError);
    throw new Error(`Failed to parse PDF: ${pdfError.message}`);
  }
}

function tryParseDate(dateValue: any): Date | undefined {
  try {
    if (!dateValue) return undefined;
    const date = new Date(dateValue);
    return isNaN(date.getTime()) ? undefined : date;
  } catch {
    return undefined;
  }
}

export async function POST(req: NextRequest) {
  const requestId = Logger.createRequestId();
  const logger = Logger.withContext({
    requestId,
    component: "pdf-documents-api",
    action: "process-pdf-document"
  });

  try {
    const body: PDFDocumentRequest = await req.json();
    const { url } = body;

    if (!url) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "URL is required"
        } as PDFDocumentResponse),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid URL format"
        } as PDFDocumentResponse),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    logger.info("Starting PDF document processing", {
      metadata: { url }
    });

    const startTime = Date.now();

    // Check for existing documents from the same URL
    const db = await getDb();
    const collection = db.collection("documents");

    const existingDoc = await collection.findOne({
      originalUrl: url,
      status: { $in: ["processing_embeddings", "completed"] }
    });

    if (existingDoc) {
      logger.info("Found existing document for URL", {
        metadata: {
          url,
          existingDocId: existingDoc._id,
          status: existingDoc.status
        }
      });

      return new Response(
        JSON.stringify({
          success: true,
          documentId: existingDoc._id,
          title: existingDoc.metadata?.title || existingDoc.filename,
          chunkCount: existingDoc.chunkCount || 0,
          processingTime: 0,
          message: "Document already exists for this URL"
        } as PDFDocumentResponse),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Extract PDF content
    const pdfResult = await extractPDFFromURL(url);

    // Create document record
    const documentId = crypto.randomUUID();
    const documentRecord = {
      _id: documentId,
      filename: pdfResult.title || `pdf-${Date.now()}.pdf`,
      originalPath: url,
      fileSizeBytes: pdfResult.text.length,
      encoding: "utf-8",
      mimeType: "application/pdf",
      uploadedAt: new Date(),
      sourceType: "web" as const,
      originalUrl: url,
      scrapedAt: new Date(),
      contentHash: generateContentHash(pdfResult.text),
      status: "processing_embeddings" as const,
      clientId: "pdf-processor",
      documentType: "research",
      metadata: {
        textPreview: pdfResult.text.substring(0, 200),
        title: pdfResult.title,
        content_type: "research",
        topics: [], // Could be enhanced with AI analysis
        summary: `PDF document with ${pdfResult.wordCount} words across ${pdfResult.metadata.totalPages} pages`,
        key_concepts: [],
        question_types: [],
        word_count: pdfResult.wordCount,
        ai_processing_time_ms: 0,
        source_content_type: "pdf",
        total_pages: pdfResult.metadata.totalPages,
        pdf_author: pdfResult.metadata.author,
        pdf_creator: pdfResult.metadata.creator,
        pdf_producer: pdfResult.metadata.producer,
        pdf_creation_date: pdfResult.metadata.creationDate,
        pdf_modification_date: pdfResult.metadata.modificationDate,
      }
    };

    await collection.insertOne(documentRecord);

    logger.info("Created PDF document record", {
      metadata: {
        documentId: documentId,
        title: pdfResult.title,
        pages: pdfResult.metadata.totalPages
      }
    });

    // Process the content through existing pipeline (chunking + embeddings)
    const processingResult = await processAndStoreDocument(
      documentId,
      pdfResult.text,
      documentRecord.filename,
      logger
    );

    // Update document status to completed
    await collection.updateOne(
      { _id: documentId },
      {
        $set: {
          status: "completed",
          processedAt: new Date(),
          chunkCount: processingResult.chunkCount
        }
      }
    );

    const totalTime = Date.now() - startTime;

    logger.info("PDF document processing completed", {
      metadata: {
        documentId: documentId,
        chunkCount: processingResult.chunkCount,
        totalTime
      }
    });

    const response: PDFDocumentResponse = {
      success: true,
      documentId: documentId,
      title: pdfResult.title,
      chunkCount: processingResult.chunkCount,
      processingTime: totalTime,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown processing error';
    logger.error("PDF document processing failed", {
      metadata: { error: errorMessage }
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      } as PDFDocumentResponse),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}

function generateContentHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}