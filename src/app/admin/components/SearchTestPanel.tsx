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

export function SearchTestPanel() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());

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
          nResults: 10 // More results to see full ranking
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

  return (
    <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-[var(--text-primary)]">Search Test</h3>
        <div className="text-sm text-[var(--text-secondary)]">
          Test document search & embeddings
        </div>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="mb-4">
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Test search query..."
            className="flex-1 px-3 py-2 border border-[var(--border-color)] rounded focus:outline-none focus:ring-1 focus:ring-[var(--link-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="px-4 py-2 bg-[var(--link-color)] text-white rounded font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity text-sm"
          >
            {isLoading ? "..." : "Search"}
          </button>
        </div>
      </form>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--link-color)]"></div>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">Searching...</p>
        </div>
      )}

      {/* Results */}
      {!isLoading && hasSearched && (
        <div className="max-h-[600px] overflow-y-auto">
          {results.length > 0 ? (
            <>
              <div className="mb-3">
                <p className="text-xs text-[var(--text-secondary)]">
                  Found {results.length} results for "{query}"
                </p>
              </div>

              <div className="space-y-3">
                {results.map((result) => {
                  const isExpanded = expandedResults.has(result.id);

                  return (
                    <div
                      key={result.id}
                      className="border border-[var(--border-color)] rounded p-3 bg-[var(--bg-secondary)] hover:border-[var(--border-color-hover)] transition-colors"
                    >
                      {/* Result Header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[var(--text-primary)] text-sm">
                            {result.filename}
                          </span>
                          <span className="px-2 py-0.5 bg-[var(--bg-primary)] text-[var(--text-secondary)] text-xs rounded">
                            {formatDistance(result.distance)}%
                          </span>
                        </div>
                        <button
                          onClick={() => toggleExpanded(result.id)}
                          className="text-[var(--link-color)] hover:text-[var(--link-color-hover)] text-xs"
                        >
                          {isExpanded ? "Less" : "More"}
                        </button>
                      </div>

                      {/* Preview Text */}
                      <div className="text-[var(--text-primary)] text-sm leading-relaxed">
                        {isExpanded ? (
                          <div className="whitespace-pre-wrap max-h-32 overflow-y-auto text-xs">
                            {result.text}
                          </div>
                        ) : (
                          <div className="text-[var(--text-secondary)] text-xs">
                            {result.chunkPreview}...
                          </div>
                        )}
                      </div>

                      {/* Metadata */}
                      <div className="mt-2 text-xs text-[var(--text-tertiary)] flex gap-3">
                        <span>ID: {result.documentId.substring(0, 8)}...</span>
                        <span>Words: {result.wordCount}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-xs text-[var(--text-secondary)]">
                No results found for "{query}"
              </p>
            </div>
          )}
        </div>
      )}

      {/* No Search Yet */}
      {!hasSearched && !isLoading && (
        <div className="text-center py-6">
          <p className="text-xs text-[var(--text-secondary)]">
            Enter a search query to test if document processing is working correctly.
          </p>
        </div>
      )}
    </div>
  );
}