"use client";

import { Message } from "@/context/ChatContext";
import { MarkdownPreview } from "./MarkdownPreview";

interface ChatMessageProps {
  message: Message;
  showHeader?: boolean;
  personaName?: string;
}

export function ChatMessage({ message, showHeader = true, personaName }: ChatMessageProps) {
  const isUser = message.role === "user";
  const senderLabel = `${personaName || "AI Assistant"} (AI)`;

  return (
    <div className={`animate-fade-in ${showHeader ? "mb-4 mt-6 first:mt-0" : "mb-2"} ${isUser ? "flex justify-end" : ""}`}>
      <div className={`flex flex-col items-start ${!isUser && showHeader ? "gap-[5px]" : ""}`}>
        {showHeader && !isUser && (
          <div className="text-[16px] leading-[20px] mb-3 mt-2" style={{ fontFamily: 'SF Compact Text, SF Pro Text, -apple-system, BlinkMacSystemFont, sans-serif', color: 'var(--text-secondary)' }}>
            {senderLabel}
          </div>
        )}
        {isUser ? (
          <div className="px-3 sm:px-[17px] py-3 sm:pt-[14px] sm:pb-[17px] rounded-lg whitespace-pre-wrap break-words text-[16px] leading-[20px] max-w-[calc(100vw-2rem)] sm:max-w-[650px]" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            {message.content}
          </div>
        ) : (
          <MarkdownPreview
            content={message.content}
            className="max-w-[calc(100vw-2rem)] sm:max-w-[650px]"
          />
        )}
      </div>
    </div>
  );
}
