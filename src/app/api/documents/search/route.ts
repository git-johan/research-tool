import { NextRequest } from "next/server";
import { Logger } from "@/lib/logger";
import { searchDocumentChunks } from "@/lib/document-processing";

export async function POST(req: NextRequest) {
  const requestId = Logger.createRequestId();
  const logger = Logger.withContext({
    requestId,
    component: "document-search-api",
    action: "search-documents"
  });

  try {
    logger.info("Starting document search request");

    // Parse request body
    const { query, nResults = 5 }: { query: string; nResults?: number } = await req.json();

    // Validate required fields
    if (!query) {
      logger.warn("No search query provided in request");
      return new Response(
        JSON.stringify({
          success: false,
          error: "NO_QUERY",
          message: "Search query is required"
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    logger.info("Document search request details", {
      metadata: { query, nResults }
    });

    // Perform search
    const results = await searchDocumentChunks(query, nResults, logger);

    logger.info("Document search completed successfully", {
      metadata: {
        query,
        resultsFound: results.chunks.length,
        processingComplete: true
      }
    });

    // Return search results
    return new Response(
      JSON.stringify({
        success: true,
        query,
        results: {
          chunks: results.chunks.map((chunk, index) => ({
            id: chunk.id,
            documentId: chunk.documentId,
            filename: chunk.metadata.filename,
            chunkPreview: chunk.metadata.chunkPreview,
            text: chunk.text,
            wordCount: chunk.wordCount,
            distance: results.distances[index]
          })),
          totalResults: results.chunks.length
        }
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown server error';
    logger.error("Unexpected error in document search API", {
      metadata: { error: errorMessage }
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: "SEARCH_ERROR",
        message: "An unexpected error occurred during search"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}