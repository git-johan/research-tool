"use client";

import { Persona } from "@/context/ChatContext";
import { PersonaSelector } from "./PersonaSelector";
import { ClearButton } from "./ClearButton";
import { ShareButton } from "./ShareButton";
import { SettingsButton } from "./SettingsButton";
import { SearchButton } from "./SearchButton";

interface ChatHeaderProps {
  personas: Persona[];
  selectedPersonaId: string | null;
  isLoadingPersonas: boolean;
  hasMessages: boolean;
  onPersonaChange: (personaId: string | null) => void;
  onClearMessages: () => void;
  onShareConversation: () => void;
  isCopying: boolean;
}

export function ChatHeader({
  personas,
  selectedPersonaId,
  isLoadingPersonas,
  hasMessages,
  onPersonaChange,
  onClearMessages,
  onShareConversation,
  isCopying,
}: ChatHeaderProps) {
  return (
    <div
      className="sticky top-0 w-full flex items-center justify-between px-4 py-2 border-b z-10"
      style={{
        borderColor: "var(--border-color)",
        backgroundColor: "var(--bg-primary)",
      }}
    >
      {/* Left - Persona Selector */}
      <div className="flex items-center">
        <PersonaSelector
          personas={personas}
          selectedPersonaId={selectedPersonaId}
          isLoadingPersonas={isLoadingPersonas}
          onPersonaChange={onPersonaChange}
        />
      </div>

      {/* Right - Action Icons */}
      <div className="flex items-center gap-1">
        <SearchButton />
        {hasMessages && (
          <>
            <ClearButton onClick={onClearMessages} />
            <ShareButton onClick={onShareConversation} isCopying={isCopying} />
          </>
        )}
        <SettingsButton />
      </div>
    </div>
  );
}
