"use client";

import Link from "next/link";
import { Persona } from "@/context/ChatContext";

interface PersonaSelectorProps {
  personas: Persona[];
  selectedPersonaId: string | null;
  isLoadingPersonas: boolean;
  onPersonaChange: (personaId: string | null) => void;
}

export function PersonaSelector({
  personas,
  selectedPersonaId,
  isLoadingPersonas,
  onPersonaChange,
}: PersonaSelectorProps) {
  if (isLoadingPersonas) {
    return (
      <div
        className="text-[16px] font-medium"
        style={{ color: "var(--text-secondary)" }}
      >
        Loading...
      </div>
    );
  }

  if (personas.length === 0) {
    return (
      <Link
        href="/setup"
        className="text-[16px] font-semibold hover:opacity-70 transition-opacity"
        style={{ color: "var(--text-primary)" }}
      >
        Add Persona →
      </Link>
    );
  }

  return (
    <select
      value={selectedPersonaId || ""}
      onChange={(e) => onPersonaChange(e.target.value || null)}
      className="text-[16px] font-semibold bg-transparent border-none outline-none cursor-pointer appearance-none hover:opacity-70 transition-opacity"
      style={{
        fontFamily:
          "SF Compact Text, SF Pro Text, -apple-system, BlinkMacSystemFont, sans-serif",
        color: "var(--text-primary)",
        width: "fit-content",
        paddingRight: "1.25rem",
        backgroundPosition: "right 0.25rem center",
      }}
    >
      <option value="">Select Persona</option>
      {personas.map((persona) => (
        <option key={persona._id} value={persona._id}>
          {persona.name}
        </option>
      ))}
    </select>
  );
}
