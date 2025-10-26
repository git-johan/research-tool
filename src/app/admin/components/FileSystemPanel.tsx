"use client";

import React from "react";

interface FileInfo {
  name: string;
  path: string;
  size: number;
  created: Date;
  modified: Date;
  extension: string;
}

interface FileSystemData {
  success: boolean;
  uploadDirectory: string;
  totalFiles: number;
  totalSize: number;
  files: FileInfo[];
  error?: string;
}

interface FileSystemPanelProps {
  data: FileSystemData;
  compact?: boolean;
}

export function FileSystemPanel({ data, compact = false }: FileSystemPanelProps) {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString();
  };

  if (!data || !data.success) {
    return (
      <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg p-6">
        <h3 className="text-lg font-medium text-[var(--text-primary)] mb-4">File System</h3>
        <div className="text-red-600">
          Error: {data?.error || 'Failed to load filesystem data'}
        </div>
      </div>
    );
  }

  const displayFiles = compact ? data.files.slice(0, 5) : data.files;

  return (
    <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-[var(--text-primary)]">File System</h3>
        <div className="text-sm text-[var(--text-secondary)]">
          {data.totalFiles} files • {formatBytes(data.totalSize)}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mb-4 grid grid-cols-2 gap-4">
        <div className="bg-[var(--bg-secondary)] p-3 rounded">
          <div className="text-[var(--text-secondary)] text-xs">Upload Directory</div>
          <div className="text-sm font-mono text-[var(--text-primary)] truncate">
            {data.uploadDirectory}
          </div>
        </div>
        <div className="bg-[var(--bg-secondary)] p-3 rounded">
          <div className="text-[var(--text-secondary)] text-xs">Total Size</div>
          <div className="text-sm font-medium text-[var(--text-primary)]">
            {formatBytes(data.totalSize)}
          </div>
        </div>
      </div>

      {/* Files List */}
      {data.files.length > 0 ? (
        <div className="space-y-2">
          <div className="text-sm font-medium text-[var(--text-primary)] mb-2">
            Recent Files {compact && `(${displayFiles.length} of ${data.totalFiles})`}
          </div>
          {displayFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 bg-[var(--bg-secondary)] rounded"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[var(--text-primary)] truncate">
                  {file.name}
                </div>
                <div className="text-xs text-[var(--text-secondary)]">
                  {formatDate(file.modified)} • {file.extension}
                </div>
              </div>
              <div className="text-xs text-[var(--text-secondary)] ml-2">
                {formatBytes(file.size)}
              </div>
            </div>
          ))}

          {compact && data.files.length > 5 && (
            <div className="text-center py-2">
              <div className="text-sm text-[var(--text-secondary)]">
                ... and {data.files.length - 5} more files
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="text-[var(--text-secondary)]">No files found in uploads directory</div>
        </div>
      )}

      {/* File Type Breakdown */}
      {!compact && data.files.length > 0 && (
        <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
          <div className="text-sm font-medium text-[var(--text-primary)] mb-2">File Types</div>
          <div className="flex flex-wrap gap-2">
            {(() => {
              const extensions = data.files.reduce((acc, file) => {
                const ext = file.extension || 'no extension';
                acc[ext] = (acc[ext] || 0) + 1;
                return acc;
              }, {} as Record<string, number>);

              return Object.entries(extensions).map(([ext, count]) => (
                <span
                  key={ext}
                  className="px-2 py-1 bg-[var(--bg-surface)] text-xs rounded"
                >
                  {ext}: {count}
                </span>
              ));
            })()}
          </div>
        </div>
      )}
    </div>
  );
}