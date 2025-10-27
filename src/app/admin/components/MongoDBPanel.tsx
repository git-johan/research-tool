"use client";

import React from "react";
import { ExpandableDocumentRow } from "./ExpandableDocumentRow";

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

interface DocumentDoc {
  _id: string;
  filename: string;
  originalPath: string;
  fileSizeBytes: number;
  encoding: string;
  mimeType: string;
  uploadedAt: Date;
  processedAt?: Date;
  chunkCount?: number;
  status: "uploading" | "ready_for_processing" | "processing_embeddings" | "completed" | "failed";
  error?: string;
  clientId: string;
  documentType?: string;
  tags?: string[];

  // Web document specific fields
  sourceType?: "web" | "upload";
  originalUrl?: string;
  scrapedAt?: Date;
  contentHash?: string;

  metadata: {
    textPreview: string;
    wordCount?: number;
    lineCount?: number;

    // Enhanced metadata from AI processing
    title?: string;
    content_type?: string;
    topics?: string[];
    summary?: string;
    key_concepts?: string[];
    question_types?: string[];
    word_count?: number;
    ai_processing_time_ms?: number;
    source_content_type?: string;

    // PDF-specific metadata
    total_pages?: number;
    pdf_author?: string;
    pdf_creator?: string;
    pdf_producer?: string;
    pdf_creation_date?: string;
    pdf_modification_date?: string;
  };
}

interface MongoDBData {
  success: boolean;
  stats: {
    totalDocuments: number;
    statusBreakdown: StatusBreakdown;
    clientGroups: ClientGroup[];
    recentDocuments: DocumentDoc[];
    failedDocuments: DocumentDoc[];
    averageProcessingTime?: number;
    totalChunks: number;
  };
  error?: string;
}

interface MongoDBPanelProps {
  data: MongoDBData;
  compact?: boolean;
}

export function MongoDBPanel({ data, compact = false }: MongoDBPanelProps) {
  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString();
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50';
      case 'ready_for_processing': return 'text-blue-600 bg-blue-50';
      case 'processing_embeddings': return 'text-purple-600 bg-purple-50';
      case 'uploading': return 'text-yellow-600 bg-yellow-50';
      case 'failed': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const formatStatusDisplay = (status: string) => {
    switch (status) {
      case 'ready_for_processing': return 'ready for processing';
      case 'processing_embeddings': return 'processing embeddings';
      default: return status;
    }
  };

  if (!data || !data.success) {
    return (
      <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg p-6">
        <h3 className="text-lg font-medium text-[var(--text-primary)] mb-4">MongoDB</h3>
        <div className="text-red-600">
          Error: {data?.error || 'Failed to load MongoDB data'}
        </div>
      </div>
    );
  }

  const stats = data.stats;
  const displayDocuments = compact ? stats.recentDocuments.slice(0, 3) : stats.recentDocuments.slice(0, 10);

  return (
    <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-[var(--text-primary)]">MongoDB</h3>
        <div className="text-sm text-[var(--text-secondary)]">
          {stats.totalDocuments} documents • {stats.totalChunks} chunks
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="mb-4">
        <div className="text-sm font-medium text-[var(--text-primary)] mb-2">Status Distribution</div>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(stats.statusBreakdown).map(([status, count]) => (
            <div key={status} className="flex items-center justify-between p-2 bg-[var(--bg-secondary)] rounded">
              <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(status)}`}>
                {formatStatusDisplay(status)}
              </span>
              <span className="text-sm font-medium text-[var(--text-primary)]">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Processing Stats */}
      {!compact && (
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div className="bg-[var(--bg-secondary)] p-3 rounded">
            <div className="text-[var(--text-secondary)] text-xs">Avg Processing Time</div>
            <div className="text-sm font-medium text-[var(--text-primary)]">
              {stats.averageProcessingTime ? formatDuration(stats.averageProcessingTime) : 'N/A'}
            </div>
          </div>
          <div className="bg-[var(--bg-secondary)] p-3 rounded">
            <div className="text-[var(--text-secondary)] text-xs">Client Groups</div>
            <div className="text-sm font-medium text-[var(--text-primary)]">
              {stats.clientGroups.length}
            </div>
          </div>
        </div>
      )}

      {/* Recent Documents */}
      {stats.recentDocuments.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-[var(--text-primary)] mb-2">
            Recent Documents {compact && `(${displayDocuments.length} of ${stats.recentDocuments.length})`}
          </div>
          {displayDocuments.map((doc) => (
            <ExpandableDocumentRow
              key={doc._id}
              document={doc}
              formatDate={formatDate}
              getStatusColor={getStatusColor}
              formatStatusDisplay={formatStatusDisplay}
            />
          ))}
        </div>
      )}

      {/* Failed Documents */}
      {!compact && stats.failedDocuments.length > 0 && (
        <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
          <div className="text-sm font-medium text-[var(--text-primary)] mb-2">
            Failed Documents ({stats.failedDocuments.length})
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {stats.failedDocuments.map((doc) => (
              <ExpandableDocumentRow
                key={doc._id}
                document={doc}
                formatDate={formatDate}
                getStatusColor={getStatusColor}
                formatStatusDisplay={formatStatusDisplay}
              />
            ))}
          </div>
        </div>
      )}

      {/* Client Groups */}
      {!compact && stats.clientGroups.length > 0 && (
        <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
          <div className="text-sm font-medium text-[var(--text-primary)] mb-2">
            Client Groups ({stats.clientGroups.length})
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {stats.clientGroups.map((group) => (
              <div
                key={group.clientId}
                className="flex items-center justify-between p-2 bg-[var(--bg-secondary)] rounded"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {group.clientId}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    {formatDate(group.latestUpload)}
                  </div>
                </div>
                <div className="text-sm font-medium text-[var(--text-primary)]">
                  {group.documentCount}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}