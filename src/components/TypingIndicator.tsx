"use client";

import { PersonaAvatar } from "./PersonaAvatar";

interface TypingIndicatorProps {
  personaName?: string;
  personaColor?: string;
}

export function TypingIndicator({ personaName, personaColor }: TypingIndicatorProps) {
  return (
    <div className="animate-fade-in mb-4 mt-6 first:mt-0">
      <div className="flex items-center gap-3">
        {personaName && personaColor && (
          <PersonaAvatar name={personaName} color={personaColor} size="small" />
        )}
        <div className="flex items-center gap-2">
          {personaName && (
            <span className="text-sm opacity-70 font-medium">{personaName} is typing</span>
          )}
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
