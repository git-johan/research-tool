import SearchInterface from "@/components/SearchInterface";

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Header */}
      <div className="bg-[var(--bg-primary)] border-b border-[var(--border-color)]">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <a
                href="/"
                className="text-[var(--link-color)] hover:text-[var(--link-color-hover)] font-medium"
              >
                ← Back to Chat
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="py-8">
        <SearchInterface />
      </div>
    </div>
  );
}