"use client";

import React from "react";

interface DocumentChunkInfo {
  documentId: string;
  filename: string;
  chunkCount: number;
  totalWordCount: number;
  averageDistance?: number;
}

interface SampleChunk {
  id: string;
  documentId: string;
  filename: string;
  wordCount: number;
  preview: string;
}

interface ChromaDBStats {
  collectionExists: boolean;
  totalChunks: number;
  uniqueDocuments: number;
  documentChunks: DocumentChunkInfo[];
  collectionMetadata: any;
  sampleChunks: SampleChunk[];
  embeddingDimensions?: number;
  isHealthy: boolean;
}

interface ChromaDBData {
  success: boolean;
  stats: ChromaDBStats;
  error?: string;
}

interface ChromaDBPanelProps {
  data: ChromaDBData;
  compact?: boolean;
}

export function ChromaDBPanel({ data, compact = false }: ChromaDBPanelProps) {
  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  const getHealthColor = (isHealthy: boolean) => {
    return isHealthy ? 'text-green-600' : 'text-red-600';
  };

  if (!data || !data.success) {
    return (
      <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg p-6">
        <h3 className="text-lg font-medium text-[var(--text-primary)] mb-4">ChromaDB</h3>
        <div className="text-red-600">
          Error: {data?.error || 'Failed to load ChromaDB data'}
        </div>
      </div>
    );
  }

  const stats = data.stats;
  const displayDocuments = compact ? stats.documentChunks.slice(0, 3) : stats.documentChunks.slice(0, 10);
  const displayChunks = compact ? stats.sampleChunks.slice(0, 2) : stats.sampleChunks;

  return (
    <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-[var(--text-primary)]">ChromaDB</h3>
        <div className="text-sm text-[var(--text-secondary)]">
          {stats.totalChunks} chunks • {stats.uniqueDocuments} documents
        </div>
      </div>

      {/* Health & Connection Status */}
      <div className="mb-4 grid grid-cols-2 gap-4">
        <div className="bg-[var(--bg-secondary)] p-3 rounded">
          <div className="text-[var(--text-secondary)] text-xs">Collection Status</div>
          <div className={`text-sm font-medium ${getHealthColor(stats.collectionExists && stats.isHealthy)}`}>
            {stats.collectionExists ? (stats.isHealthy ? 'Healthy' : 'Issues Detected') : 'Not Found'}
          </div>
        </div>
        <div className="bg-[var(--bg-secondary)] p-3 rounded">
          <div className="text-[var(--text-secondary)] text-xs">Embedding Dimensions</div>
          <div className="text-sm font-medium text-[var(--text-primary)]">
            {stats.embeddingDimensions || 'Unknown'}
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="mb-4">
        <div className="text-sm font-medium text-[var(--text-primary)] mb-2">Vector Database Stats</div>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-[var(--bg-secondary)] p-2 rounded text-center">
            <div className="text-lg font-bold text-[var(--text-primary)]">{formatNumber(stats.totalChunks)}</div>
            <div className="text-xs text-[var(--text-secondary)]">Total Chunks</div>
          </div>
          <div className="bg-[var(--bg-secondary)] p-2 rounded text-center">
            <div className="text-lg font-bold text-[var(--text-primary)]">{formatNumber(stats.uniqueDocuments)}</div>
            <div className="text-xs text-[var(--text-secondary)]">Documents</div>
          </div>
          <div className="bg-[var(--bg-secondary)] p-2 rounded text-center">
            <div className="text-lg font-bold text-[var(--text-primary)]">
              {stats.totalChunks > 0 ? Math.round(stats.totalChunks / stats.uniqueDocuments) : 0}
            </div>
            <div className="text-xs text-[var(--text-secondary)]">Avg Chunks/Doc</div>
          </div>
        </div>
      </div>

      {/* Document Breakdown */}
      {stats.documentChunks.length > 0 && (
        <div className="mb-4">
          <div className="text-sm font-medium text-[var(--text-primary)] mb-2">
            Document Breakdown {compact && `(${displayDocuments.length} of ${stats.documentChunks.length})`}
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {displayDocuments.map((doc) => (
              <div
                key={doc.documentId}
                className="flex items-center justify-between p-2 bg-[var(--bg-secondary)] rounded"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {doc.filename}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    {formatNumber(doc.totalWordCount)} words
                  </div>
                </div>
                <div className="text-sm font-medium text-[var(--text-primary)]">
                  {doc.chunkCount} chunks
                </div>
              </div>
            ))}
          </div>
          {compact && stats.documentChunks.length > 3 && (
            <div className="text-center py-2">
              <div className="text-sm text-[var(--text-secondary)]">
                ... and {stats.documentChunks.length - 3} more documents
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sample Chunks Preview */}
      {!compact && stats.sampleChunks.length > 0 && (
        <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
          <div className="text-sm font-medium text-[var(--text-primary)] mb-2">
            Sample Chunks ({stats.sampleChunks.length})
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {displayChunks.map((chunk) => (
              <div
                key={chunk.id}
                className="p-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="text-xs font-medium text-[var(--text-primary)] truncate">
                    {chunk.filename}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    {chunk.wordCount} words
                  </div>
                </div>
                <div className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {chunk.preview}
                </div>
                <div className="text-xs text-[var(--text-muted)] mt-1 font-mono">
                  ID: {chunk.id}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {stats.totalChunks === 0 && (
        <div className="text-center py-8">
          <div className="text-[var(--text-secondary)]">No chunks found in ChromaDB collection</div>
          <div className="text-xs text-[var(--text-muted)] mt-1">
            {stats.collectionExists ? 'Collection exists but is empty' : 'Collection not initialized'}
          </div>
        </div>
      )}
    </div>
  );
}