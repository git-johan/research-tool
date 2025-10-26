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
      className="text-[16px] font-semibold bg-transparent border-none outline-none cursor-pointer appearance-none hover:opacity-70 transition-opacity w-auto pr-5"
      style={{
        fontFamily: '"SF Pro Text", "SF Compact Text", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
        color: "var(--text-primary)",
        backgroundPosition: "right 0.25rem center",
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
        WebkitFontFeatureSettings: '"kern" 1, "liga" 1, "calt" 1',
        fontFeatureSettings: '"kern" 1, "liga" 1, "calt" 1',
        WebkitTextSizeAdjust: "100%",
        textRendering: "optimizeLegibility",
        fontDisplay: "swap",
        WebkitAppearance: "none",
        appearance: "none",
      }}
      data-persona-selector="true"
    >
      <option value="">Select Persona</option>
      {personas.length >= 2 && (
        <option value="GROUP">All Personas (Group Chat)</option>
      )}
      {personas.map((persona) => (
        <option key={persona._id} value={persona._id}>
          {persona.name}
        </option>
      ))}
    </select>
  );
}
