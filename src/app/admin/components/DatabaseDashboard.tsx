"use client";

import React, { useState, useEffect } from "react";
import { FileSystemPanel } from "./FileSystemPanel";
import { MongoDBPanel } from "./MongoDBPanel";
import { ChromaDBPanel } from "./ChromaDBPanel";
import { ConsistencyChecker } from "./ConsistencyChecker";
import { ConfirmationDialog } from "./ConfirmationDialog";
import { FileUploader } from "./FileUploader";
import { SearchTestPanel } from "./SearchTestPanel";

interface DashboardData {
  filesystem: any;
  mongodb: any;
  chromadb: any;
  consistency: any;
}

export function DatabaseDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'filesystem' | 'mongodb' | 'chromadb' | 'consistency' | 'upload' | 'search'>('overview');
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [filesystemRes, mongodbRes, chromadbRes, consistencyRes] = await Promise.all([
        fetch('/api/admin/filesystem'),
        fetch('/api/admin/mongodb'),
        fetch('/api/admin/chromadb'),
        fetch('/api/admin/consistency')
      ]);

      const [filesystem, mongodb, chromadb, consistency] = await Promise.all([
        filesystemRes.json(),
        mongodbRes.json(),
        chromadbRes.json(),
        consistencyRes.json()
      ]);

      setData({ filesystem, mongodb, chromadb, consistency });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getHealthStatus = () => {
    if (!data) return 'unknown';

    const fsHealthy = data.filesystem.success;
    const mongoHealthy = data.mongodb.success;
    const chromaHealthy = data.chromadb.success && data.chromadb.stats.isHealthy;
    const consistencyHealth = data.consistency.success ? data.consistency.report.overallHealth : 'critical';

    if (!fsHealthy || !mongoHealthy || !chromaHealthy || consistencyHealth === 'critical') {
      return 'critical';
    }
    if (consistencyHealth === 'issues') {
      return 'issues';
    }
    return 'healthy';
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'issues': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const handleDelete = async (endpoint: string, type: string) => {
    setDeleteLoading(type);
    try {
      const response = await fetch(`/api/admin/${endpoint}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete ${type}`);
      }

      const result = await response.json();
      console.log(`${type} deletion result:`, result);

      // Refresh data after successful deletion
      await fetchData();
    } catch (error) {
      setError(error instanceof Error ? error.message : `Failed to delete ${type}`);
    } finally {
      setDeleteLoading(null);
    }
  };

  const openConfirmDialog = (type: string, endpoint: string) => {
    const messages = {
      filesystem: 'This will permanently delete ALL files in the uploads directory. This action cannot be undone.',
      mongodb: 'This will permanently delete ALL document records from the MongoDB database. This action cannot be undone.',
      chromadb: 'This will permanently delete ALL vector embeddings from the ChromaDB collection. This action cannot be undone.'
    };

    setConfirmDialog({
      isOpen: true,
      title: `Delete ${type.charAt(0).toUpperCase() + type.slice(1)} Data`,
      message: messages[type as keyof typeof messages] || 'This action cannot be undone.',
      onConfirm: () => handleDelete(endpoint, type)
    });
  };

  const handleUploadComplete = async () => {
    // Refresh data after upload completion
    await fetchData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--link-color)]"></div>
          <p className="mt-2 text-[var(--text-secondary)]">Loading database information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Dashboard</h3>
        <p className="text-red-700 mb-4">{error}</p>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const healthStatus = getHealthStatus();

  return (
    <div className="space-y-6">
      {/* Header with Health Status */}
      <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">Database Dashboard</h2>
          <div className="flex items-center gap-4">
            <div className={`text-lg font-medium ${getHealthColor(healthStatus)}`}>
              System Status: {healthStatus.charAt(0).toUpperCase() + healthStatus.slice(1)}
            </div>
            <div className="flex gap-2">
              <button
                onClick={fetchData}
                disabled={loading || deleteLoading !== null}
                className="px-4 py-2 bg-[var(--link-color)] text-white rounded hover:opacity-90 disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Refresh'}
              </button>

              {/* Quick Delete Actions */}
              <div className="flex gap-1">
                <button
                  onClick={() => openConfirmDialog('filesystem', 'filesystem')}
                  disabled={deleteLoading !== null}
                  className="px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                  title="Delete all uploaded files"
                >
                  {deleteLoading === 'filesystem' ? '...' : '🗑️ Files'}
                </button>
                <button
                  onClick={() => openConfirmDialog('mongodb', 'mongodb')}
                  disabled={deleteLoading !== null}
                  className="px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                  title="Delete all MongoDB documents"
                >
                  {deleteLoading === 'mongodb' ? '...' : '🗑️ Docs'}
                </button>
                <button
                  onClick={() => openConfirmDialog('chromadb', 'chromadb')}
                  disabled={deleteLoading !== null}
                  className="px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                  title="Delete all vector embeddings"
                >
                  {deleteLoading === 'chromadb' ? '...' : '🗑️ Vectors'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        {data && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-[var(--bg-secondary)] p-4 rounded">
              <div className="text-[var(--text-secondary)] text-sm">Files</div>
              <div className="text-2xl font-bold text-[var(--text-primary)]">
                {data.filesystem.totalFiles || 0}
              </div>
            </div>
            <div className="bg-[var(--bg-secondary)] p-4 rounded">
              <div className="text-[var(--text-secondary)] text-sm">Documents</div>
              <div className="text-2xl font-bold text-[var(--text-primary)]">
                {data.mongodb.stats?.totalDocuments || 0}
              </div>
            </div>
            <div className="bg-[var(--bg-secondary)] p-4 rounded">
              <div className="text-[var(--text-secondary)] text-sm">Chunks</div>
              <div className="text-2xl font-bold text-[var(--text-primary)]">
                {data.chromadb.stats?.totalChunks || 0}
              </div>
            </div>
            <div className="bg-[var(--bg-secondary)] p-4 rounded">
              <div className="text-[var(--text-secondary)] text-sm">Issues</div>
              <div className={`text-2xl font-bold ${getHealthColor(data.consistency.report?.overallHealth || 'unknown')}`}>
                {data.consistency.report?.totalIssues || 0}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-[var(--border-color)]">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'upload', label: 'Upload' },
            { id: 'filesystem', label: 'Files' },
            { id: 'mongodb', label: 'MongoDB' },
            { id: 'chromadb', label: 'ChromaDB' },
            { id: 'consistency', label: 'Health Check' },
            { id: 'search', label: 'Search Test' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-[var(--link-color)] text-[var(--link-color)]'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-color)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-96">
        {activeTab === 'overview' && data && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <FileSystemPanel data={data.filesystem} compact />
            <MongoDBPanel data={data.mongodb} compact />
            <ChromaDBPanel data={data.chromadb} compact />
          </div>
        )}
        {activeTab === 'upload' && <FileUploader onUploadComplete={handleUploadComplete} />}
        {activeTab === 'search' && <SearchTestPanel />}
        {activeTab === 'filesystem' && <FileSystemPanel data={data?.filesystem} />}
        {activeTab === 'mongodb' && <MongoDBPanel data={data?.mongodb} />}
        {activeTab === 'chromadb' && <ChromaDBPanel data={data?.chromadb} />}
        {activeTab === 'consistency' && <ConsistencyChecker data={data?.consistency} />}
      </div>


      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText="Delete"
        type="danger"
      />
    </div>
  );
}