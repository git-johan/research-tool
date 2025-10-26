import React from "react";
import { Message, Persona } from "@/context/ChatContext";
import { ChatMessage } from "@/components/ChatMessage";

/**
 * Unified message rendering hook that ensures consistent styling
 * between main chat and shared view
 */
export function useMessageRenderer(
  messages: Message[],
  personas: Persona[],
  selectedPersonaId?: string | null
) {
  return React.useMemo(() => {
    return messages.map((message, index) => {
      // Show header if it's the first message or if the previous message was from a different sender
      const showMessageHeader =
        index === 0 || messages[index - 1].role !== message.role;

      // UNIFIED persona matching logic - ensures identical data flow for both views
      let messagePersona: Persona | undefined;

      if (message.personaId) {
        // Group chat message - find persona by ID
        messagePersona = personas.find((p) => p._id === message.personaId);
      } else if (selectedPersonaId) {
        // Individual chat - use selected persona (only for main view)
        messagePersona = personas.find((p) => p._id === selectedPersonaId);
      }

      // Return ChatMessage with identical props structure
      return (
        <ChatMessage
          key={message.id || `${message.timestamp}-${index}`}
          message={message}
          showHeader={showMessageHeader}
          personaName={messagePersona?.name || message.personaName}
          personaColor={messagePersona?.color}
          personaAvatarImage={messagePersona?.avatarImage}
        />
      );
    });
  }, [messages, personas, selectedPersonaId]);
}