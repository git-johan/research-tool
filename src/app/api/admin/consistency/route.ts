import { NextRequest } from "next/server";
import { Logger } from "@/lib/logger";

interface ConsistencyIssue {
  type: 'orphaned_file' | 'missing_file' | 'missing_chunks' | 'failed_processing' | 'inconsistent_count';
  severity: 'high' | 'medium' | 'low';
  description: string;
  itemId: string;
  details: any;
}

interface ConsistencyReport {
  overallHealth: 'healthy' | 'issues' | 'critical';
  totalIssues: number;
  issues: ConsistencyIssue[];
  summary: {
    filesystemFiles: number;
    mongoDocuments: number;
    chromaChunks: number;
    processingPipeline: {
      uploading: number;
      ready_for_processing: number;
      processing_embeddings: number;
      completed: number;
      failed: number;
    };
  };
  recommendations: string[];
}

interface ConsistencyResponse {
  success: boolean;
  report: ConsistencyReport;
  error?: string;
}

export async function GET(req: NextRequest) {
  const requestId = Logger.createRequestId();
  const logger = Logger.withContext({
    requestId,
    component: "admin-consistency-api",
    action: "check-consistency"
  });

  try {
    logger.info("Starting cross-system consistency check");

    // Fetch data from all three APIs
    const baseUrl = req.url.replace('/api/admin/consistency', '');

    const [filesystemRes, mongodbRes, chromadbRes] = await Promise.all([
      fetch(`${baseUrl}/api/admin/filesystem`),
      fetch(`${baseUrl}/api/admin/mongodb`),
      fetch(`${baseUrl}/api/admin/chromadb`)
    ]);

    const filesystemData = await filesystemRes.json();
    const mongodbData = await mongodbRes.json();
    const chromadbData = await chromadbRes.json();

    const issues: ConsistencyIssue[] = [];
    const recommendations: string[] = [];

    // Check if all APIs succeeded
    if (!filesystemData.success || !mongodbData.success || !chromadbData.success) {
      issues.push({
        type: 'failed_processing',
        severity: 'high',
        description: 'One or more admin APIs failed to respond',
        itemId: 'system',
        details: {
          filesystem: filesystemData.success,
          mongodb: mongodbData.success,
          chromadb: chromadbData.success
        }
      });
    }

    // Extract data for comparison
    const files = filesystemData.files || [];
    const documents = mongodbData.stats?.recentDocuments || [];
    const statusBreakdown = mongodbData.stats?.statusBreakdown || {};
    const chromaStats = chromadbData.stats || {};

    // Check for orphaned files (files not referenced in MongoDB)
    const documentPaths = new Set(documents.map((doc: any) => doc.originalPath));
    const orphanedFiles = files.filter((file: any) => !documentPaths.has(file.path));

    orphanedFiles.forEach((file: any) => {
      issues.push({
        type: 'orphaned_file',
        severity: 'medium',
        description: `File exists in uploads but not referenced in MongoDB`,
        itemId: file.name,
        details: { filePath: file.path, size: file.size }
      });
    });

    // Check for missing files (MongoDB references missing files)
    const existingFilePaths = new Set(files.map((file: any) => file.path));
    const missingFiles = documents.filter((doc: any) => !existingFilePaths.has(doc.originalPath));

    missingFiles.forEach((doc: any) => {
      issues.push({
        type: 'missing_file',
        severity: 'high',
        description: `MongoDB document references missing file`,
        itemId: doc._id,
        details: { filename: doc.filename, expectedPath: doc.originalPath }
      });
    });

    // Check for documents that should have chunks but don't
    const readyDocuments = documents.filter((doc: any) => doc.status === 'completed');
    const chromaDocuments = chromaStats.documentChunks || [];
    const chromaDocIds = new Set(chromaDocuments.map((doc: any) => doc.documentId));

    const missingChunks = readyDocuments.filter((doc: any) => !chromaDocIds.has(doc._id));

    missingChunks.forEach((doc: any) => {
      issues.push({
        type: 'missing_chunks',
        severity: 'high',
        description: `Document marked as completed but has no chunks in ChromaDB`,
        itemId: doc._id,
        details: { filename: doc.filename, status: doc.status }
      });
    });

    // Check for failed processing
    const failedDocuments = documents.filter((doc: any) => doc.status === 'failed');
    failedDocuments.forEach((doc: any) => {
      issues.push({
        type: 'failed_processing',
        severity: 'medium',
        description: `Document processing failed`,
        itemId: doc._id,
        details: { filename: doc.filename, error: doc.error }
      });
    });

    // Check for inconsistent chunk counts
    readyDocuments.forEach((doc: any) => {
      const chromaDoc = chromaDocuments.find((cd: any) => cd.documentId === doc._id);
      if (chromaDoc && doc.chunkCount && doc.chunkCount !== chromaDoc.chunkCount) {
        issues.push({
          type: 'inconsistent_count',
          severity: 'medium',
          description: `Chunk count mismatch between MongoDB and ChromaDB`,
          itemId: doc._id,
          details: {
            filename: doc.filename,
            mongoCount: doc.chunkCount,
            chromaCount: chromaDoc.chunkCount
          }
        });
      }
    });

    // Generate recommendations
    if (orphanedFiles.length > 0) {
      recommendations.push(`Clean up ${orphanedFiles.length} orphaned files from uploads directory`);
    }

    if (missingFiles.length > 0) {
      recommendations.push(`Re-upload ${missingFiles.length} missing files or update MongoDB references`);
    }

    if (missingChunks.length > 0) {
      recommendations.push(`Reprocess ${missingChunks.length} documents to generate missing chunks`);
    }

    if (failedDocuments.length > 0) {
      recommendations.push(`Retry processing for ${failedDocuments.length} failed documents`);
    }

    if (issues.length === 0) {
      recommendations.push("System is healthy - no issues detected");
    }

    // Determine overall health
    const highSeverityCount = issues.filter(i => i.severity === 'high').length;
    const overallHealth = highSeverityCount > 0 ? 'critical' :
                         issues.length > 0 ? 'issues' : 'healthy';

    const report: ConsistencyReport = {
      overallHealth,
      totalIssues: issues.length,
      issues,
      summary: {
        filesystemFiles: files.length,
        mongoDocuments: documents.length,
        chromaChunks: chromaStats.totalChunks || 0,
        processingPipeline: statusBreakdown
      },
      recommendations
    };

    logger.info("Consistency check completed", {
      metadata: {
        overallHealth,
        totalIssues: issues.length,
        highSeverityIssues: highSeverityCount
      }
    });

    const response: ConsistencyResponse = {
      success: true,
      report
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown consistency check error';
    logger.error("Consistency check failed", {
      metadata: { error: errorMessage }
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      } as ConsistencyResponse),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}