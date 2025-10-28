import { NextRequest } from "next/server";
import { Logger } from "@/lib/logger";
import { getDb, updateDocumentStatus } from "@/lib/db";
import { processAndStoreDocument } from "@/lib/document-processing";
import fs from "fs/promises";

interface ProcessResponse {
  success: boolean;
  processed: number;
  failed: number;
  results: Array<{
    documentId: string;
    filename: string;
    status: 'success' | 'failed';
    error?: string;
    chunkCount?: number;
  }>;
  error?: string;
}

export async function POST(req: NextRequest) {
  const requestId = Logger.createRequestId();
  const logger = Logger.withContext({
    requestId,
    component: "process-api",
    action: "process-documents"
  });

  try {
    logger.info("Starting document processing request");

    const db = await getDb();
    const collection = db.collection("documents");

    // Find all documents with "ready_for_processing" status
    const documentsToProcess = await collection.find({ status: "ready_for_processing" }).toArray();

    logger.info(`Found ${documentsToProcess.length} documents ready for processing`);

    if (documentsToProcess.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          processed: 0,
          failed: 0,
          results: [],
          message: "No documents found with 'ready_for_processing' status"
        } as ProcessResponse),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    const results: ProcessResponse['results'] = [];
    let processedCount = 0;
    let failedCount = 0;

    // Process each document
    for (const doc of documentsToProcess) {
      try {
        logger.info(`Processing document: ${doc.filename}`, {
          metadata: { documentId: doc._id }
        });

        // Update status to processing embeddings
        await updateDocumentStatus(doc._id, "processing_embeddings");

        // Read the file content
        const fileContent = await fs.readFile(doc.originalPath, 'utf-8');

        // Process and store the document (chunks + embeddings)
        const processingResult = await processAndStoreDocument(
          doc._id,
          fileContent,
          doc.filename,
          logger
        );

        // Update status to completed
        await updateDocumentStatus(doc._id, "completed", {
          processedAt: new Date(),
          chunkCount: processingResult.chunkCount
        });

        results.push({
          documentId: doc._id,
          filename: doc.filename,
          status: 'success',
          chunkCount: processingResult.chunkCount
        });

        processedCount++;

        logger.info(`Successfully processed document: ${doc.filename}`, {
          metadata: {
            documentId: doc._id,
            chunkCount: processingResult.chunkCount
          }
        });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown processing error';

        logger.error(`Failed to process document: ${doc.filename}`, {
          metadata: {
            documentId: doc._id,
            error: errorMessage
          }
        });

        // Update status to failed
        await updateDocumentStatus(doc._id, "failed", {
          error: errorMessage,
          processedAt: new Date()
        });

        results.push({
          documentId: doc._id,
          filename: doc.filename,
          status: 'failed',
          error: errorMessage
        });

        failedCount++;
      }
    }

    logger.info("Document processing completed", {
      metadata: {
        totalDocuments: documentsToProcess.length,
        processed: processedCount,
        failed: failedCount
      }
    });

    const response: ProcessResponse = {
      success: true,
      processed: processedCount,
      failed: failedCount,
      results
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown processing error';
    logger.error("Document processing request failed", {
      metadata: { error: errorMessage }
    });

    return new Response(
      JSON.stringify({
        success: false,
        processed: 0,
        failed: 0,
        results: [],
        error: errorMessage
      } as ProcessResponse),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}