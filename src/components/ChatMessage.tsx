"use client";

import { Message } from "@/context/ChatContext";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatMessageProps {
  message: Message;
  showHeader?: boolean;
  personaName?: string;
}

export function ChatMessage({ message, showHeader = true, personaName }: ChatMessageProps) {
  const isUser = message.role === "user";

  console.log("ChatMessage render:", { role: message.role, isUser, content: message.content.substring(0, 50) });

  const senderLabel = `${personaName || "AI Assistant"} (AI)`;

  return (
    <div className={`animate-fade-in ${showHeader ? "mb-4 mt-6 first:mt-0" : "mb-2"} ${isUser ? "flex justify-end" : ""}`}>
      <div className={`flex flex-col items-start ${!isUser && showHeader ? "gap-[5px]" : ""}`}>
        {showHeader && !isUser && (
          <div className="text-[16px] leading-[20px] text-gray-400 mb-3 mt-2" style={{ fontFamily: 'SF Compact Text, SF Pro Text, -apple-system, BlinkMacSystemFont, sans-serif' }}>
            {senderLabel}
          </div>
        )}
        {isUser ? (
          <div className="px-[17px] pt-[14px] pb-[17px] rounded-lg bg-[#0E0E0E] whitespace-pre-wrap break-words text-[16px] leading-[20px] max-w-[650px]">
            {message.content}
          </div>
        ) : (
          <div className="prose max-w-[650px]">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
