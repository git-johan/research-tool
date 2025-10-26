"use client";

import React, { useState, useRef } from "react";

interface UploadResult {
  filename: string;
  success: boolean;
  documentId?: string;
  error?: string;
  size?: number;
  wordCount?: number;
}

interface FileUploaderProps {
  onUploadComplete?: (results: UploadResult[]) => void;
}

export function FileUploader({ onUploadComplete }: FileUploaderProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const fileArray = Array.from(files).filter(file =>
        file.type === 'text/plain' || file.name.endsWith('.txt')
      );
      setSelectedFiles(fileArray);
      setUploadResults([]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    const results: UploadResult[] = [];

    for (const file of selectedFiles) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('clientId', 'manual-upload');

        const response = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const result = await response.json();
          results.push({
            filename: file.name,
            success: true,
            documentId: result.documentId,
            size: result.size,
            wordCount: result.wordCount
          });
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          results.push({
            filename: file.name,
            success: false,
            error: errorData.error || `HTTP ${response.status}`
          });
        }
      } catch (error) {
        results.push({
          filename: file.name,
          success: false,
          error: error instanceof Error ? error.message : 'Upload failed'
        });
      }
    }

    setUploadResults(results);
    setUploading(false);
    onUploadComplete?.(results);
  };

  const handleClear = () => {
    setSelectedFiles([]);
    setUploadResults([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg p-6">
      <h3 className="text-lg font-medium text-[var(--text-primary)] mb-4">
        Upload Files
      </h3>

      {/* File Selection */}
      <div className="mb-4">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".txt,text/plain"
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className="inline-flex items-center px-4 py-2 bg-[var(--link-color)] text-white rounded hover:opacity-90 cursor-pointer"
        >
          📁 Select Files
        </label>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Select multiple .txt files to upload
        </p>
      </div>

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-[var(--text-primary)]">
              Selected Files ({selectedFiles.length})
            </h4>
            <button
              onClick={handleClear}
              className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              Clear All
            </button>
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto border border-[var(--border-color)] rounded p-2">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-[var(--bg-secondary)] rounded"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {file.name}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    {formatFileSize(file.size)}
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveFile(index)}
                  className="ml-2 text-red-600 hover:text-red-800"
                  title="Remove file"
                >
                  ✗
                </button>
              </div>
            ))}
          </div>

          <div className="mt-3 flex gap-2">
            <button
              onClick={handleUpload}
              disabled={uploading || selectedFiles.length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : `Upload ${selectedFiles.length} Files`}
            </button>
          </div>
        </div>
      )}

      {/* Upload Results */}
      {uploadResults.length > 0 && (
        <div className="mt-4 border-t border-[var(--border-color)] pt-4">
          <h4 className="text-sm font-medium text-[var(--text-primary)] mb-2">
            Upload Results
          </h4>

          {/* Summary */}
          <div className="mb-3 flex gap-4 text-sm">
            <span className="text-green-600">
              ✓ {uploadResults.filter(r => r.success).length} successful
            </span>
            <span className="text-red-600">
              ✗ {uploadResults.filter(r => !r.success).length} failed
            </span>
          </div>

          <div className="space-y-2 max-h-40 overflow-y-auto">
            {uploadResults.map((result, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-2 rounded ${
                  result.success
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {result.filename}
                  </div>
                  {result.success ? (
                    <div className="text-xs text-green-600">
                      {result.wordCount} words • ID: {result.documentId?.substring(0, 8)}...
                    </div>
                  ) : (
                    <div className="text-xs text-red-600">
                      {result.error}
                    </div>
                  )}
                </div>
                <div className={`text-sm font-medium ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                  {result.success ? '✓' : '✗'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}