import { NextRequest } from "next/server";
import { Logger } from "@/lib/logger";
import { getDb, DocumentDoc } from "@/lib/db";

interface StatusBreakdown {
  uploading: number;
  ready_for_processing: number;
  processing_embeddings: number;
  completed: number;
  failed: number;
}

interface ClientGroup {
  clientId: string;
  documentCount: number;
  latestUpload: Date;
  statuses: StatusBreakdown;
}

interface ProcessingStats {
  totalDocuments: number;
  statusBreakdown: StatusBreakdown;
  clientGroups: ClientGroup[];
  recentDocuments: DocumentDoc[];
  failedDocuments: DocumentDoc[];
  averageProcessingTime?: number;
  totalChunks: number;
}

interface MongoDBResponse {
  success: boolean;
  stats: ProcessingStats;
  error?: string;
}

export async function GET(req: NextRequest) {
  const requestId = Logger.createRequestId();
  const logger = Logger.withContext({
    requestId,
    component: "admin-mongodb-api",
    action: "inspect-documents"
  });

  try {
    logger.info("Starting MongoDB inspection");

    const db = await getDb();
    const collection = db.collection<DocumentDoc>("documents");

    // Get all documents
    const allDocuments = await collection.find({}).sort({ uploadedAt: -1 }).toArray();

    // Calculate status breakdown
    const statusBreakdown: StatusBreakdown = {
      uploading: 0,
      ready_for_processing: 0,
      processing_embeddings: 0,
      completed: 0,
      failed: 0
    };

    allDocuments.forEach(doc => {
      statusBreakdown[doc.status]++;
    });

    // Group by clientId
    const clientMap = new Map<string, {
      documents: DocumentDoc[];
      statuses: StatusBreakdown;
    }>();

    allDocuments.forEach(doc => {
      const clientId = doc.clientId || 'unknown';
      if (!clientMap.has(clientId)) {
        clientMap.set(clientId, {
          documents: [],
          statuses: { uploading: 0, ready_for_processing: 0, processing_embeddings: 0, completed: 0, failed: 0 }
        });
      }
      const clientData = clientMap.get(clientId)!;
      clientData.documents.push(doc);
      clientData.statuses[doc.status]++;
    });

    // Helper function to get upload/download date safely
    const getUploadDate = (doc: any): Date | null => {
      // Handle both uploadedAt (upload API) and downloadedAt (download API)
      const dateField = doc.uploadedAt || doc.downloadedAt;
      return dateField ? new Date(dateField) : null;
    };

    // Convert to ClientGroup array
    const clientGroups: ClientGroup[] = Array.from(clientMap.entries()).map(([clientId, data]) => {
      // Get all valid upload dates for this client
      const validDates = data.documents
        .map(d => getUploadDate(d))
        .filter(date => date !== null)
        .map(date => date!.getTime());

      const latestUpload = validDates.length > 0
        ? new Date(Math.max(...validDates))
        : new Date(0); // Fallback to epoch if no valid dates

      return {
        clientId,
        documentCount: data.documents.length,
        latestUpload,
        statuses: data.statuses
      };
    }).sort((a, b) => b.latestUpload.getTime() - a.latestUpload.getTime());

    // Get recent documents (last 10)
    const recentDocuments = allDocuments.slice(0, 10);

    // Get failed documents
    const failedDocuments = allDocuments
      .filter(doc => doc.status === 'failed')
      .slice(0, 5); // Latest 5 failed documents

    // Calculate total chunks
    const totalChunks = allDocuments
      .filter(doc => doc.chunkCount)
      .reduce((sum, doc) => sum + (doc.chunkCount || 0), 0);

    // Calculate average processing time for completed documents
    const completedDocs = allDocuments.filter(doc =>
      doc.status === 'ready' && doc.processedAt && (doc.uploadedAt || doc.downloadedAt)
    );

    let averageProcessingTime: number | undefined;
    if (completedDocs.length > 0) {
      // Filter documents that have both upload and processed dates
      const validProcessingTimes = completedDocs
        .map(doc => {
          const uploadDate = getUploadDate(doc);
          const processedDate = doc.processedAt ? new Date(doc.processedAt) : null;

          if (uploadDate && processedDate) {
            return processedDate.getTime() - uploadDate.getTime();
          }
          return null;
        })
        .filter(time => time !== null);

      if (validProcessingTimes.length > 0) {
        const totalProcessingTime = validProcessingTimes.reduce((sum, time) => sum + time!, 0);
        averageProcessingTime = totalProcessingTime / validProcessingTimes.length;
      }
    }

    const stats: ProcessingStats = {
      totalDocuments: allDocuments.length,
      statusBreakdown,
      clientGroups,
      recentDocuments,
      failedDocuments,
      averageProcessingTime,
      totalChunks
    };

    logger.info("MongoDB inspection completed", {
      metadata: {
        totalDocuments: allDocuments.length,
        totalClients: clientGroups.length,
        failedCount: failedDocuments.length
      }
    });

    const response: MongoDBResponse = {
      success: true,
      stats
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown MongoDB error';
    logger.error("MongoDB inspection failed", {
      metadata: { error: errorMessage }
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      } as MongoDBResponse),
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
    component: "admin-mongodb-api",
    action: "wipe-documents"
  });

  try {
    logger.info("Starting MongoDB documents wipe");

    const db = await getDb();
    const collection = db.collection<DocumentDoc>("documents");

    // Get count before deletion
    const totalDocuments = await collection.countDocuments();

    // Delete all documents
    const deleteResult = await collection.deleteMany({});

    logger.info("MongoDB documents wipe completed", {
      metadata: {
        documentsDeleted: deleteResult.deletedCount,
        totalDocuments
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully deleted ${deleteResult.deletedCount} documents`,
        deletedCount: deleteResult.deletedCount,
        totalDocuments
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown MongoDB wipe error';
    logger.error("MongoDB documents wipe failed", {
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