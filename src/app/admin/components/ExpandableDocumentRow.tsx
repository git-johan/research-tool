"use client";

import React, { useState } from "react";
import { DocumentDoc } from "@/lib/db";

interface ExpandableDocumentRowProps {
  document: DocumentDoc;
  formatDate: (date: string | Date) => string;
  getStatusColor: (status: string) => string;
  formatStatusDisplay: (status: string) => string;
}

export function ExpandableDocumentRow({
  document,
  formatDate,
  getStatusColor,
  formatStatusDisplay,
}: ExpandableDocumentRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getSourceTypeColor = (sourceType?: string) => {
    switch (sourceType) {
      case 'web': return 'text-blue-600 bg-blue-100';
      case 'upload': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getSourceTypeDisplay = (sourceType?: string) => {
    switch (sourceType) {
      case 'web': return 'Web';
      case 'upload': return 'Upload';
      default: return 'Unknown';
    }
  };

  return (
    <div className="border border-[var(--border-color)] rounded">
      {/* Main Row */}
      <div
        className="flex items-center justify-between p-2 bg-[var(--bg-secondary)] rounded cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium text-[var(--text-primary)] truncate">
              {document.filename}
            </div>
            {document.sourceType && (
              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getSourceTypeColor(document.sourceType)}`}>
                {getSourceTypeDisplay(document.sourceType)}
              </span>
            )}
          </div>
          <div className="text-xs text-[var(--text-secondary)]">
            {formatDate(document.uploadedAt)} • {document.chunkCount || 0} chunks
            {document.originalUrl && (
              <span className="ml-2">• from {new URL(document.originalUrl).hostname}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 ml-2">
          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(document.status)}`}>
            {formatStatusDisplay(document.status)}
          </span>
          <div className="text-xs text-[var(--text-secondary)]">
            {isExpanded ? '▼' : '▶'}
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 bg-[var(--bg-primary)] border-t border-[var(--border-color)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Basic Information */}
            <div className="space-y-3">
              <h4 className="font-medium text-[var(--text-primary)] text-sm">Basic Information</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">File Size:</span>
                  <span className="text-[var(--text-primary)] font-medium">{formatBytes(document.fileSizeBytes)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">MIME Type:</span>
                  <span className="text-[var(--text-primary)] font-medium">{document.mimeType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Encoding:</span>
                  <span className="text-[var(--text-primary)] font-medium">{document.encoding}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Client ID:</span>
                  <span className="text-[var(--text-primary)] font-medium truncate">{document.clientId}</span>
                </div>
              </div>
            </div>

            {/* Source Information */}
            <div className="space-y-3">
              <h4 className="font-medium text-[var(--text-primary)] text-sm">Source Information</h4>
              <div className="space-y-2 text-xs">
                {document.originalUrl ? (
                  <div>
                    <div className="text-[var(--text-secondary)] mb-1">Source URL:</div>
                    <div className="text-[var(--text-primary)] font-medium break-all bg-[var(--bg-secondary)] p-2 rounded">
                      <a href={document.originalUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {document.originalUrl}
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Original Path:</span>
                    <span className="text-[var(--text-primary)] font-medium truncate">{document.originalPath}</span>
                  </div>
                )}
                {document.scrapedAt && (
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Scraped At:</span>
                    <span className="text-[var(--text-primary)] font-medium">{formatDate(document.scrapedAt)}</span>
                  </div>
                )}
                {document.contentHash && (
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Content Hash:</span>
                    <span className="text-[var(--text-primary)] font-medium font-mono">{document.contentHash}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Processing Information */}
            <div className="space-y-3">
              <h4 className="font-medium text-[var(--text-primary)] text-sm">Processing Information</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Uploaded:</span>
                  <span className="text-[var(--text-primary)] font-medium">{formatDate(document.uploadedAt)}</span>
                </div>
                {document.processedAt && (
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Processed:</span>
                    <span className="text-[var(--text-primary)] font-medium">{formatDate(document.processedAt)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Chunks:</span>
                  <span className="text-[var(--text-primary)] font-medium">{document.chunkCount || 0}</span>
                </div>
                {document.error && (
                  <div>
                    <div className="text-red-600 mb-1">Error:</div>
                    <div className="text-red-800 bg-red-50 p-2 rounded">{document.error}</div>
                  </div>
                )}
              </div>
            </div>

            {/* AI Metadata (for web documents) */}
            {(document.metadata.title || document.metadata.topics || document.metadata.summary) && (
              <div className="space-y-3">
                <h4 className="font-medium text-[var(--text-primary)] text-sm">AI-Extracted Metadata</h4>
                <div className="space-y-2 text-xs">
                  {document.metadata.title && (
                    <div>
                      <div className="text-[var(--text-secondary)] mb-1">Title:</div>
                      <div className="text-[var(--text-primary)] font-medium">{document.metadata.title}</div>
                    </div>
                  )}
                  {document.metadata.content_type && (
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">Content Type:</span>
                      <span className="text-[var(--text-primary)] font-medium">{document.metadata.content_type}</span>
                    </div>
                  )}
                  {document.metadata.word_count && (
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">Word Count:</span>
                      <span className="text-[var(--text-primary)] font-medium">{document.metadata.word_count}</span>
                    </div>
                  )}
                  {document.metadata.topics && document.metadata.topics.length > 0 && (
                    <div>
                      <div className="text-[var(--text-secondary)] mb-1">Topics:</div>
                      <div className="flex flex-wrap gap-1">
                        {document.metadata.topics.map((topic, index) => (
                          <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {document.metadata.key_concepts && document.metadata.key_concepts.length > 0 && (
                    <div>
                      <div className="text-[var(--text-secondary)] mb-1">Key Concepts:</div>
                      <div className="flex flex-wrap gap-1">
                        {document.metadata.key_concepts.map((concept, index) => (
                          <span key={index} className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                            {concept}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {document.metadata.summary && (
                    <div>
                      <div className="text-[var(--text-secondary)] mb-1">Summary:</div>
                      <div className="text-[var(--text-primary)] bg-[var(--bg-secondary)] p-2 rounded text-xs">
                        {document.metadata.summary}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Text Preview */}
            {document.metadata.textPreview && (
              <div className="space-y-3 lg:col-span-2">
                <h4 className="font-medium text-[var(--text-primary)] text-sm">Text Preview</h4>
                <div className="text-xs text-[var(--text-primary)] bg-[var(--bg-secondary)] p-2 rounded">
                  {document.metadata.textPreview}
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}