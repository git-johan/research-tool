import { NextRequest } from "next/server";
import { Logger } from "@/lib/logger";
import { initializeChromaCollection } from "@/lib/document-processing";

interface DocumentChunkInfo {
  documentId: string;
  filename: string;
  chunkCount: number;
  totalWordCount: number;
  averageDistance?: number;
}

interface ChromaDBStats {
  collectionExists: boolean;
  totalChunks: number;
  uniqueDocuments: number;
  documentChunks: DocumentChunkInfo[];
  collectionMetadata: any;
  sampleChunks: Array<{
    id: string;
    documentId: string;
    filename: string;
    wordCount: number;
    preview: string;
  }>;
  embeddingDimensions?: number;
  isHealthy: boolean;
}

interface ChromaDBResponse {
  success: boolean;
  stats: ChromaDBStats;
  error?: string;
}

export async function GET(req: NextRequest) {
  const requestId = Logger.createRequestId();
  const logger = Logger.withContext({
    requestId,
    component: "admin-chromadb-api",
    action: "inspect-vectors"
  });

  try {
    logger.info("Starting ChromaDB inspection");

    let stats: ChromaDBStats;

    try {
      const collection = await initializeChromaCollection();

      // Get collection count
      const countResult = await collection.count();
      logger.debug(`ChromaDB collection count: ${countResult}`);

      // Get all items to analyze
      const allItems = await collection.get({
        include: ["documents", "metadatas"]
      });

      // Group by document
      const documentMap = new Map<string, {
        filename: string;
        chunks: Array<{ id: string; wordCount: number; text: string }>;
      }>();

      if (allItems.documents && allItems.metadatas && allItems.ids) {
        for (let i = 0; i < allItems.ids.length; i++) {
          const id = allItems.ids[i];
          const document = allItems.documents[i];
          const metadata = allItems.metadatas[i] as any;

          if (metadata && metadata.documentId) {
            const docId = metadata.documentId;
            if (!documentMap.has(docId)) {
              documentMap.set(docId, {
                filename: metadata.filename || 'unknown',
                chunks: []
              });
            }
            documentMap.get(docId)!.chunks.push({
              id,
              wordCount: metadata.wordCount || 0,
              text: document || ''
            });
          }
        }
      }

      // Convert to DocumentChunkInfo array
      const documentChunks: DocumentChunkInfo[] = Array.from(documentMap.entries())
        .map(([documentId, data]) => ({
          documentId,
          filename: data.filename,
          chunkCount: data.chunks.length,
          totalWordCount: data.chunks.reduce((sum, chunk) => sum + chunk.wordCount, 0)
        }))
        .sort((a, b) => b.chunkCount - a.chunkCount);

      // Get sample chunks for preview
      const sampleChunks = Array.from(documentMap.values())
        .flatMap(doc => doc.chunks.map(chunk => ({
          ...chunk,
          filename: doc.filename,
          documentId: documentMap.get(doc.filename)?.filename || 'unknown'
        })))
        .slice(0, 5)
        .map(chunk => ({
          id: chunk.id,
          documentId: chunk.documentId,
          filename: chunk.filename,
          wordCount: chunk.wordCount,
          preview: chunk.text.substring(0, 150) + (chunk.text.length > 150 ? '...' : '')
        }));

      // Test embedding dimensions by querying a single item
      let embeddingDimensions: number | undefined;
      if (countResult > 0) {
        try {
          const testQuery = await collection.query({
            queryTexts: ["test"],
            nResults: 1,
            include: ["embeddings"]
          });
          if (testQuery.embeddings && testQuery.embeddings[0] && testQuery.embeddings[0][0]) {
            embeddingDimensions = testQuery.embeddings[0][0].length;
          }
        } catch (error) {
          logger.warn("Could not determine embedding dimensions", {
            metadata: { error: error instanceof Error ? error.message : 'Unknown' }
          });
        }
      }

      stats = {
        collectionExists: true,
        totalChunks: countResult,
        uniqueDocuments: documentMap.size,
        documentChunks,
        collectionMetadata: {}, // Collection metadata would go here if available
        sampleChunks,
        embeddingDimensions,
        isHealthy: countResult > 0 && documentMap.size > 0
      };

    } catch (error) {
      logger.warn("ChromaDB collection not accessible", {
        metadata: { error: error instanceof Error ? error.message : 'Unknown' }
      });

      stats = {
        collectionExists: false,
        totalChunks: 0,
        uniqueDocuments: 0,
        documentChunks: [],
        collectionMetadata: {},
        sampleChunks: [],
        isHealthy: false
      };
    }

    logger.info("ChromaDB inspection completed", {
      metadata: {
        collectionExists: stats.collectionExists,
        totalChunks: stats.totalChunks,
        uniqueDocuments: stats.uniqueDocuments
      }
    });

    const response: ChromaDBResponse = {
      success: true,
      stats
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown ChromaDB error';
    logger.error("ChromaDB inspection failed", {
      metadata: { error: errorMessage }
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      } as ChromaDBResponse),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const requestId = Logger.createRequestId();
  const logger = Logger.withContext({
    requestId,
    component: "admin-chromadb-api",
    action: "reset-collection"
  });

  try {
    logger.info("Starting ChromaDB collection reset");

    let deletedCount = 0;
    let collectionExists = false;

    try {
      const collection = await initializeChromaCollection();
      collectionExists = true;

      // Get count before deletion
      const totalCount = await collection.count();
      deletedCount = totalCount;

      // Delete all items from the collection
      if (totalCount > 0) {
        // Get all item IDs first
        const allItems = await collection.get({
          include: []
        });

        if (allItems.ids && allItems.ids.length > 0) {
          await collection.delete({
            ids: allItems.ids
          });
        }
      }

      logger.info("ChromaDB collection reset completed", {
        metadata: { deletedChunks: deletedCount }
      });

    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        logger.info("ChromaDB collection does not exist, nothing to reset");
      } else {
        throw error;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: collectionExists
          ? `Successfully reset collection and deleted ${deletedCount} chunks`
          : "No collection found - already clean",
        deletedChunks: deletedCount,
        collectionExists
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown ChromaDB reset error';
    logger.error("ChromaDB collection reset failed", {
      metadata: { error: errorMessage }
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}