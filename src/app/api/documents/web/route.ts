import { NextRequest } from "next/server";
import { Logger } from "@/lib/logger";
import { getDb } from "@/lib/db";
import { processAndStoreDocument } from "@/lib/document-processing";
import { processWebContent } from "../../../../scripts/web-content-processor";

interface WebDocumentResponse {
  success: boolean;
  documentId?: string;
  title?: string;
  chunkCount?: number;
  processingTime?: number;
  cost?: number;
  error?: string;
  message?: string;
}

interface WebDocumentRequest {
  url: string;
  options?: {
    extractStructuredData?: boolean;
    preserveFormatting?: boolean;
  };
}

export async function POST(req: NextRequest) {
  const requestId = Logger.createRequestId();
  const logger = Logger.withContext({
    requestId,
    component: "web-documents-api",
    action: "process-web-document"
  });

  try {
    const body: WebDocumentRequest = await req.json();
    const { url, options = {} } = body;

    if (!url) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "URL is required"
        } as WebDocumentResponse),
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
        } as WebDocumentResponse),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    logger.info("Starting web document processing", {
      metadata: { url, options }
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

      // Return existing document info instead of processing again
      return new Response(
        JSON.stringify({
          success: true,
          documentId: existingDoc._id,
          title: existingDoc.metadata?.title || existingDoc.filename,
          chunkCount: existingDoc.chunkCount || 0,
          processingTime: 0,
          message: "Document already exists for this URL"
        } as WebDocumentResponse),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Process web content using our web processor
    const processedContent = await processWebContent(url);

    // Create document record in database (db and collection already initialized above)

    const documentId = crypto.randomUUID();
    const documentRecord = {
      _id: documentId,
      filename: processedContent.title || `web-${Date.now()}.txt`,
      originalPath: url, // Store URL instead of file path
      fileSizeBytes: processedContent.content.length,
      encoding: "utf-8",
      mimeType: "text/html",
      uploadedAt: new Date(),
      sourceType: "web" as const,
      originalUrl: url,
      scrapedAt: new Date(processedContent.metadata.scraped_at),
      contentHash: generateContentHash(processedContent.content),
      status: "processing_embeddings" as const,
      clientId: "web-processor", // Default client for web-processed documents
      documentType: processedContent.metadata.content_type,
      // Enhanced metadata from GPT-5 processing
      metadata: {
        textPreview: processedContent.content.substring(0, 200),
        title: processedContent.title,
        content_type: processedContent.metadata.content_type,
        topics: processedContent.metadata.topics,
        summary: processedContent.metadata.summary,
        key_concepts: processedContent.metadata.key_concepts,
        question_types: processedContent.metadata.question_types,
        word_count: processedContent.metadata.word_count,
        ai_processing_time_ms: processedContent.metadata.processing_time_ms
      }
    };

    await collection.insertOne(documentRecord);

    logger.info("Created document record", {
      metadata: {
        documentId: documentId,
        title: processedContent.title,
        contentType: processedContent.metadata.content_type
      }
    });

    // Process the content through existing pipeline (chunking + embeddings)
    const processingResult = await processAndStoreDocument(
      documentId,
      processedContent.content,
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

    logger.info("Web document processing completed", {
      metadata: {
        documentId: documentId,
        chunkCount: processingResult.chunkCount,
        totalTime
      }
    });

    const response: WebDocumentResponse = {
      success: true,
      documentId: documentId,
      title: processedContent.title,
      chunkCount: processingResult.chunkCount,
      processingTime: totalTime,
      // Note: We could add cost tracking here if needed
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown processing error';
    logger.error("Web document processing failed", {
      metadata: { error: errorMessage }
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      } as WebDocumentResponse),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}

/**
 * Generate a simple hash of content for change detection
 */
function generateContentHash(content: string): string {
  // Simple hash function - in production you might want crypto.createHash
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}