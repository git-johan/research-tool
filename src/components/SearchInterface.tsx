"use client";

import React, { useState } from "react";

interface SearchResult {
  id: string;
  documentId: string;
  filename: string;
  chunkPreview: string;
  text: string;
  wordCount: number;
  distance: number;
}

interface SearchResponse {
  success: boolean;
  query: string;
  results: {
    chunks: SearchResult[];
    totalResults: number;
  };
  error?: string;
  message?: string;
}

export default function SearchInterface() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());

  // Web document processing state
  const [webUrl, setWebUrl] = useState("");
  const [isProcessingWeb, setIsProcessingWeb] = useState(false);
  const [webSuccess, setWebSuccess] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!query.trim()) {
      setError("Please enter a search query");
      return;
    }

    setIsLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const response = await fetch("/api/documents/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: query.trim(),
          nResults: 10
        }),
      });

      const data: SearchResponse = await response.json();

      if (data.success) {
        setResults(data.results.chunks);
        setError(null);
      } else {
        setError(data.message || "Search failed");
        setResults([]);
      }
    } catch (err) {
      setError("Failed to perform search. Please try again.");
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleExpanded = (resultId: string) => {
    const newExpanded = new Set(expandedResults);
    if (newExpanded.has(resultId)) {
      newExpanded.delete(resultId);
    } else {
      newExpanded.add(resultId);
    }
    setExpandedResults(newExpanded);
  };

  const formatDistance = (distance: number) => {
    return ((1 - distance) * 100).toFixed(1);
  };

  const handleProcessWebUrl = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!webUrl.trim()) {
      setError("Please enter a valid URL");
      return;
    }

    // Basic URL validation
    try {
      new URL(webUrl.trim());
    } catch {
      setError("Please enter a valid URL (e.g., https://example.com)");
      return;
    }

    setIsProcessingWeb(true);
    setError(null);
    setWebSuccess(null);

    try {
      const response = await fetch("/api/documents/web", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: webUrl.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        const message = data.message
          ? `${data.message}: "${data.title}" (${data.chunkCount} chunks available)`
          : `Successfully processed: "${data.title}" (${data.chunkCount} chunks created)`;
        setWebSuccess(message);
        setWebUrl(""); // Clear the input
        setError(null);
      } else {
        setError(data.error || "Failed to process web document");
        setWebSuccess(null);
      }
    } catch (err) {
      setError("Failed to process web document. Please try again.");
      setWebSuccess(null);
    } finally {
      setIsProcessingWeb(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
          Research Assistant
        </h1>
        <p className="text-[var(--text-secondary)]">
          Add web content and search through documents using semantic similarity
        </p>
      </div>

      {/* Web Document Processor */}
      <div className="mb-8 p-6 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">
          Add Web Content
        </h2>
        <p className="text-[var(--text-secondary)] mb-4 text-sm">
          Process articles, research papers, or any web content to make them searchable
        </p>

        <form onSubmit={handleProcessWebUrl} className="mb-4">
          <div className="flex gap-3">
            <input
              type="url"
              value={webUrl}
              onChange={(e) => setWebUrl(e.target.value)}
              placeholder="Enter URL (e.g., https://example.com/article)"
              className="flex-1 px-4 py-3 border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--link-color)] focus:border-transparent bg-[var(--bg-primary)] text-[var(--text-primary)]"
              disabled={isProcessingWeb}
            />
            <button
              type="submit"
              disabled={isProcessingWeb || !webUrl.trim()}
              className="px-6 py-3 bg-[var(--link-color)] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              {isProcessingWeb ? "Processing..." : "Add URL"}
            </button>
          </div>
        </form>

        {/* Web Success Message */}
        {webSuccess && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-700 text-sm">{webSuccess}</p>
          </div>
        )}

        {/* Processing Status */}
        {isProcessingWeb && (
          <div className="text-center py-4">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--link-color)]"></div>
            <p className="mt-2 text-[var(--text-secondary)] text-sm">
              Processing web content with AI analysis...
            </p>
          </div>
        )}
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter your search query..."
            className="flex-1 px-4 py-3 text-lg border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--link-color)] focus:border-transparent bg-[var(--bg-primary)] text-[var(--text-primary)]"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="px-6 py-3 bg-[var(--link-color)] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {isLoading ? "Searching..." : "Search"}
          </button>
        </div>
      </form>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--link-color)]"></div>
          <p className="mt-2 text-[var(--text-secondary)]">Searching documents...</p>
        </div>
      )}

      {/* Results */}
      {!isLoading && hasSearched && (
        <div>
          {results.length > 0 ? (
            <>
              <div className="mb-4">
                <p className="text-[var(--text-secondary)]">
                  Found {results.length} results for "{query}"
                </p>
              </div>

              <div className="space-y-4">
                {results.map((result) => {
                  const isExpanded = expandedResults.has(result.id);

                  return (
                    <div
                      key={result.id}
                      className="border border-[var(--border-color)] rounded-lg p-4 bg-[var(--bg-primary)] hover:border-[var(--border-color-hover)] transition-colors"
                    >
                      {/* Result Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <h3 className="font-medium text-[var(--text-primary)]">
                            {result.filename}
                          </h3>
                          <span className="px-2 py-1 bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-sm rounded">
                            {formatDistance(result.distance)}% match
                          </span>
                        </div>
                        <button
                          onClick={() => toggleExpanded(result.id)}
                          className="text-[var(--link-color)] hover:text-[var(--link-color-hover)] text-sm font-medium"
                        >
                          {isExpanded ? "Show Less" : "Show More"}
                        </button>
                      </div>

                      {/* Preview Text */}
                      <div className="text-[var(--text-primary)] leading-relaxed">
                        {isExpanded ? (
                          <div className="whitespace-pre-wrap">{result.text}</div>
                        ) : (
                          <div className="text-[var(--text-secondary)]">
                            {result.chunkPreview}...
                          </div>
                        )}
                      </div>

                      {/* Metadata */}
                      <div className="mt-3 text-xs text-[var(--text-tertiary)] flex gap-4">
                        <span>Document: {result.documentId.substring(0, 8)}...</span>
                        <span>Words: {result.wordCount}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-[var(--text-secondary)]">
                No results found for "{query}". Try a different search term.
              </p>
            </div>
          )}
        </div>
      )}

      {/* No Search Yet */}
      {!hasSearched && !isLoading && (
        <div className="text-center py-12">
          <p className="text-[var(--text-secondary)]">
            Enter a search query above to find relevant content in the interview documents.
          </p>
        </div>
      )}
    </div>
  );
}