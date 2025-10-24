"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { MarkdownPreview } from "@/components/MarkdownPreview";
import { EditButton } from "@/components/EditButton";

interface Persona {
  _id: string;
  name: string;
  role: string;
  transcriptData: string;
  createdAt: string;
}

export default function SetupPage() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [transcriptData, setTranscriptData] = useState("");

  // Load personas
  useEffect(() => {
    loadPersonas();
  }, []);

  const loadPersonas = async () => {
    try {
      const response = await fetch("/api/personas");
      if (response.ok) {
        const data = await response.json();
        setPersonas(data.personas || []);
      }
    } catch (error) {
      console.error("Failed to load personas:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !role || !transcriptData) {
      alert("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/personas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, role, transcriptData }),
      });

      if (response.ok) {
        // Clear form
        setName("");
        setRole("");
        setTranscriptData("");
        // Reload personas
        await loadPersonas();
      } else {
        alert("Failed to create persona");
      }
    } catch (error) {
      console.error("Failed to create persona:", error);
      alert("Failed to create persona");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (personaId: string) => {
    if (!confirm("Are you sure you want to delete this persona?")) {
      return;
    }

    try {
      const response = await fetch(`/api/personas?personaId=${personaId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await loadPersonas();
      } else {
        alert("Failed to delete persona");
      }
    } catch (error) {
      console.error("Failed to delete persona:", error);
      alert("Failed to delete persona");
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <h1 className="text-3xl font-bold">Persona Setup</h1>
          <Link
            href="/"
            className="bg-[#FFFFFF] bg-opacity-50 rounded-full px-[13px] pt-[4px] pb-[6px] text-[16px] leading-[20px] text-[#1A1A1A] transition-opacity hover:opacity-80 w-full sm:w-auto text-center"
            style={{ fontFamily: 'SF Compact Text, SF Pro Text, -apple-system, BlinkMacSystemFont, sans-serif' }}
          >
            Back to Chat
          </Link>
        </div>

        {/* Add Persona Form */}
        <div className="rounded-lg p-4 sm:p-6 mb-6 sm:mb-8" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          <h2 className="text-xl font-semibold mb-4">Add New Persona</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Sarah Johnson"
                className="w-full rounded-lg px-4 py-3 focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Role</label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g., Product Manager at Tech Startup"
                className="w-full rounded-lg px-4 py-3 focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Interview Transcript / Notes</label>
              <textarea
                value={transcriptData}
                onChange={(e) => setTranscriptData(e.target.value)}
                placeholder="Paste interview transcript, notes, or any context about this person..."
                rows={12}
                className="w-full rounded-lg px-4 py-3 focus:outline-none focus:ring-2 resize-y"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-white text-black rounded-lg px-4 py-3 font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Adding..." : "Add Persona"}
            </button>
          </form>
        </div>

        {/* Persona List */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Existing Personas ({personas.length})</h2>
          {isLoading ? (
            <div style={{ color: 'var(--text-secondary)' }}>Loading...</div>
          ) : personas.length === 0 ? (
            <div className="rounded-lg p-4 sm:p-6" style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-secondary)' }}>
              No personas yet. Add your first persona above to get started.
            </div>
          ) : (
            <div className="space-y-4">
              {personas.map((persona) => (
                <div key={persona._id} className="rounded-lg p-4 sm:p-6" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">{persona.name}</h3>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{persona.role}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <EditButton href={`/personas/${persona._id}`} />
                      <button
                        onClick={() => handleDelete(persona._id)}
                        className="text-red-400 hover:text-red-300 text-sm px-2"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="text-sm overflow-hidden" style={{ color: 'var(--text-tertiary)' }}>
                    <div className="line-clamp-3">
                      <MarkdownPreview content={persona.transcriptData} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
