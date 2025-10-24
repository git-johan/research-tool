"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { MarkdownPreview } from "@/components/MarkdownPreview";
import { PersonaAvatar } from "@/components/PersonaAvatar";

interface Persona {
  _id: string;
  name: string;
  role: string;
  transcriptData: string;
  color: string;
  createdAt: string;
}

export default function EditPersonaPage() {
  const params = useParams();
  const router = useRouter();
  const personaId = params.id as string;

  const [persona, setPersona] = useState<Persona | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [transcriptData, setTranscriptData] = useState("");
  const [selectedColor, setSelectedColor] = useState("");

  // Available colors for personas
  const availableColors = [
    "#3B82F6", // blue
    "#8B5CF6", // purple
    "#EC4899", // pink
    "#10B981", // green
    "#F59E0B", // amber
    "#EF4444", // red
    "#06B6D4", // cyan
    "#6366F1", // indigo
    "#F97316", // orange
    "#14B8A6", // teal
  ];

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load persona
  useEffect(() => {
    loadPersona();
  }, [personaId]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current && !isPreviewMode) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [transcriptData, isPreviewMode]);

  const loadPersona = async () => {
    try {
      const response = await fetch("/api/personas");
      if (response.ok) {
        const data = await response.json();
        const foundPersona = data.personas.find((p: Persona) => p._id === personaId);

        if (foundPersona) {
          setPersona(foundPersona);
          setName(foundPersona.name);
          setRole(foundPersona.role);
          setTranscriptData(foundPersona.transcriptData);
          setSelectedColor(foundPersona.color || "");
        } else {
          alert("Persona not found");
          router.push("/setup");
        }
      }
    } catch (error) {
      console.error("Failed to load persona:", error);
      alert("Failed to load persona");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !role || !transcriptData) {
      alert("Please fill in all fields");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/personas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personaId, name, role, transcriptData, color: selectedColor }),
      });

      if (response.ok) {
        router.push("/setup");
      } else {
        const errorText = await response.text();
        alert(`Failed to update persona: ${errorText}`);
      }
    } catch (error) {
      console.error("Failed to update persona:", error);
      alert("Failed to update persona");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-4 sm:p-8 flex items-center justify-center">
        <div style={{ color: "var(--text-secondary)" }}>Loading...</div>
      </div>
    );
  }

  if (!persona) {
    return null;
  }

  return (
    <div className="min-h-screen p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <h1 className="text-3xl font-bold">Edit Persona</h1>
          <Link
            href="/setup"
            className="bg-[#FFFFFF] bg-opacity-50 rounded-full px-[13px] pt-[4px] pb-[6px] text-[16px] leading-[20px] text-[#1A1A1A] transition-opacity hover:opacity-80 w-full sm:w-auto text-center"
            style={{
              fontFamily:
                "SF Compact Text, SF Pro Text, -apple-system, BlinkMacSystemFont, sans-serif",
            }}
          >
            Back to Setup
          </Link>
        </div>

        {/* Edit Form */}
        <div
          className="rounded-lg p-4 sm:p-6"
          style={{ backgroundColor: "var(--bg-secondary)" }}
        >
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label
                className="block text-sm mb-2"
                style={{ color: "var(--text-secondary)" }}
              >
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Sarah Johnson"
                className="w-full rounded-lg px-4 py-3 focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: "var(--bg-surface)",
                  color: "var(--text-primary)",
                }}
              />
            </div>

            <div>
              <label
                className="block text-sm mb-2"
                style={{ color: "var(--text-secondary)" }}
              >
                Role
              </label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g., Product Manager at Tech Startup"
                className="w-full rounded-lg px-4 py-3 focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: "var(--bg-surface)",
                  color: "var(--text-primary)",
                }}
              />
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                Avatar Color
              </label>
              <div className="flex items-center gap-4">
                <div className="flex gap-2 flex-wrap">
                  {availableColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      className={`w-10 h-10 rounded-full transition-all ${
                        selectedColor === color ? "ring-2 ring-white ring-offset-2" : "hover:scale-110"
                      }`}
                      style={{
                        backgroundColor: color,
                        ringOffsetColor: 'var(--bg-secondary)'
                      }}
                      title={color}
                    />
                  ))}
                </div>
                {name && selectedColor && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Preview:</span>
                    <PersonaAvatar
                      name={name || "?"}
                      color={selectedColor}
                      size="medium"
                    />
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  className="block text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Interview Transcript / Notes
                </label>
                <button
                  type="button"
                  onClick={() => setIsPreviewMode(!isPreviewMode)}
                  className="text-sm px-3 py-1 rounded-md transition-colors"
                  style={{
                    backgroundColor: isPreviewMode
                      ? "var(--bg-surface)"
                      : "transparent",
                    color: "var(--text-secondary)",
                  }}
                >
                  {isPreviewMode ? "Edit" : "Preview"}
                </button>
              </div>

              {isPreviewMode ? (
                <div
                  className="w-full rounded-lg px-4 py-3 min-h-[300px] overflow-auto"
                  style={{
                    backgroundColor: "var(--bg-surface)",
                    color: "var(--text-primary)",
                  }}
                >
                  <MarkdownPreview content={transcriptData} />
                </div>
              ) : (
                <textarea
                  ref={textareaRef}
                  value={transcriptData}
                  onChange={(e) => setTranscriptData(e.target.value)}
                  placeholder="Paste interview transcript, notes, or any context about this person..."
                  className="w-full rounded-lg px-4 py-3 focus:outline-none focus:ring-2 resize-none min-h-[300px]"
                  style={{
                    backgroundColor: "var(--bg-surface)",
                    color: "var(--text-primary)",
                  }}
                />
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 bg-white text-black rounded-lg px-4 py-3 font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
              <Link
                href="/setup"
                className="flex-1 text-center rounded-lg px-4 py-3 font-medium transition-colors"
                style={{
                  backgroundColor: "var(--bg-surface)",
                  color: "var(--text-primary)",
                }}
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
