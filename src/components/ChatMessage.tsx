"use client";

import { Message } from "@/context/ChatContext";
import { MarkdownPreview } from "./MarkdownPreview";
import { PersonaAvatar } from "./PersonaAvatar";
import { generatePersonaBubbleStyles } from "@/lib/colorUtils";
import { useTheme } from "@/hooks/useTheme";

interface ChatMessageProps {
  message: Message;
  showHeader?: boolean;
  personaName?: string;
  personaColor?: string;
  personaAvatarImage?: string;
}

export function ChatMessage({ message, showHeader = true, personaName, personaColor, personaAvatarImage }: ChatMessageProps) {
  const isUser = message.role === "user";
  const theme = useTheme();
  // Use message.personaName (from group chat) or fallback to passed personaName
  const displayName = message.personaName || personaName;

  // Generate bubble styles for persona messages with theme awareness
  const bubbleStyles = personaColor ? generatePersonaBubbleStyles(personaColor, theme) : null;

  return (
    <div className={`animate-fade-in ${showHeader ? "mb-4 mt-6 first:mt-0" : "mb-2"} ${isUser ? "flex justify-end" : ""}`}>
      {isUser ? (
        <div className="px-3 sm:px-[17px] py-3 sm:pt-[14px] sm:pb-[17px] rounded-lg whitespace-pre-wrap break-words text-[16px] leading-[20px] max-w-[calc(100vw-2rem)] sm:max-w-[650px]" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          {message.content}
        </div>
      ) : (
        <div className="flex gap-3 items-start">
          {/* Show avatar for group chat messages */}
          {message.personaName && personaColor && (
            <PersonaAvatar
              name={message.personaName}
              color={personaColor}
              avatarImage={personaAvatarImage}
              size="medium"
            />
          )}
          <div className="flex flex-col">
            {message.personaName && (
              <div className="text-sm font-semibold mb-2 opacity-70">
                {message.personaName}
              </div>
            )}
            <div
              className="px-3 sm:px-[17px] py-3 sm:pt-[14px] sm:pb-[17px] rounded-lg max-w-[calc(100vw-2rem)] sm:max-w-[650px]"
              style={{
                backgroundColor: bubbleStyles?.backgroundColor || 'var(--bg-secondary)',
                color: bubbleStyles?.textColor || 'var(--text-primary)'
              }}
            >
              <MarkdownPreview
                content={message.content}
                className="text-inherit"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}