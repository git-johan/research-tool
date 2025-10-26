import { DatabaseDashboard } from "./components/DatabaseDashboard";

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      {/* Header */}
      <header className="bg-[var(--bg-primary)] border-b border-[var(--border-color)] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-[var(--text-primary)]">
                Research Tool Admin
              </h1>
            </div>
            <div className="text-sm text-[var(--text-secondary)]">
              Database Inspection Interface
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
            System Administration
          </h2>
          <p className="text-[var(--text-secondary)]">
            Unified interface to inspect and monitor your research tool's database systems including local file storage, MongoDB documents, and ChromaDB vector embeddings.
          </p>
        </div>

        <DatabaseDashboard />
      </main>
    </div>
  );
}