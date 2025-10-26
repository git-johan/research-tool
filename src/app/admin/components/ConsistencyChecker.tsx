"use client";

import React from "react";

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

interface ConsistencyData {
  success: boolean;
  report: ConsistencyReport;
  error?: string;
}

interface ConsistencyCheckerProps {
  data: ConsistencyData;
}

export function ConsistencyChecker({ data }: ConsistencyCheckerProps) {
  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-600 bg-green-50 border-green-200';
      case 'issues': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'orphaned_file': return '📄';
      case 'missing_file': return '❌';
      case 'missing_chunks': return '🧩';
      case 'failed_processing': return '⚠️';
      case 'inconsistent_count': return '📊';
      default: return '❓';
    }
  };

  const formatIssueType = (type: string) => {
    return type.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
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
        <h3 className="text-lg font-medium text-[var(--text-primary)] mb-4">Health Check</h3>
        <div className="text-red-600">
          Error: {data?.error || 'Failed to run consistency check'}
        </div>
      </div>
    );
  }

  const report = data.report;

  return (
    <div className="space-y-6">
      {/* Overall Health Status */}
      <div className={`border rounded-lg p-6 ${getHealthColor(report.overallHealth)}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">System Health Status</h3>
          <div className="text-2xl font-bold">
            {report.overallHealth.charAt(0).toUpperCase() + report.overallHealth.slice(1)}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{report.summary.filesystemFiles}</div>
            <div className="text-sm">Files</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{report.summary.mongoDocuments}</div>
            <div className="text-sm">Documents</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{report.summary.chromaChunks}</div>
            <div className="text-sm">Chunks</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{report.totalIssues}</div>
            <div className="text-sm">Issues</div>
          </div>
        </div>

        {/* Processing Pipeline Status */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {Object.entries(report.summary.processingPipeline).map(([status, count]) => (
            <div key={status} className="bg-white bg-opacity-70 p-2 rounded text-center">
              <div className="font-semibold">{count}</div>
              <div className="text-xs">{formatStatusDisplay(status)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Issues Breakdown */}
      {report.issues.length > 0 && (
        <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg p-6">
          <h4 className="text-lg font-medium text-[var(--text-primary)] mb-4">
            Issues Found ({report.totalIssues})
          </h4>

          {/* Issues by Severity */}
          <div className="mb-4 grid grid-cols-3 gap-4">
            {['high', 'medium', 'low'].map(severity => {
              const count = report.issues.filter(issue => issue.severity === severity).length;
              return (
                <div key={severity} className={`p-3 rounded border ${getSeverityColor(severity)}`}>
                  <div className="font-semibold text-center">{count}</div>
                  <div className="text-sm text-center capitalize">{severity} Severity</div>
                </div>
              );
            })}
          </div>

          {/* Issues List */}
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {report.issues.map((issue, index) => (
              <div
                key={index}
                className={`p-3 rounded border ${getSeverityColor(issue.severity)}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getIssueIcon(issue.type)}</span>
                    <div>
                      <div className="font-medium">{formatIssueType(issue.type)}</div>
                      <div className="text-sm opacity-75">ID: {issue.itemId}</div>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(issue.severity)}`}>
                    {issue.severity}
                  </span>
                </div>

                <div className="text-sm mb-2">{issue.description}</div>

                {/* Issue Details */}
                {issue.details && Object.keys(issue.details).length > 0 && (
                  <div className="text-xs bg-white bg-opacity-50 p-2 rounded">
                    <strong>Details:</strong>
                    <div className="mt-1 font-mono">
                      {Object.entries(issue.details).map(([key, value]) => (
                        <div key={key}>
                          {key}: {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {report.recommendations.length > 0 && (
        <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg p-6">
          <h4 className="text-lg font-medium text-[var(--text-primary)] mb-4">
            Recommendations
          </h4>
          <div className="space-y-2">
            {report.recommendations.map((recommendation, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-[var(--bg-secondary)] rounded"
              >
                <span className="text-lg">💡</span>
                <div className="text-sm text-[var(--text-primary)]">{recommendation}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Healthy State */}
      {report.totalIssues === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
          <div className="text-4xl mb-4">✅</div>
          <h4 className="text-lg font-medium text-green-800 mb-2">System is Healthy</h4>
          <div className="text-green-600">All systems are functioning correctly with no issues detected.</div>
        </div>
      )}
    </div>
  );
}