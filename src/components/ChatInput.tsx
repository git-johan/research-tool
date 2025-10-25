"use client";

import { useState, FormEvent, KeyboardEvent, useRef, useEffect } from "react";
import { useChat } from "@/context/ChatContext";
import { SendArrowIcon, StopIcon } from "./icons";
import { useTheme } from "@/hooks/useTheme";
import { generatePersonaBubbleStyles } from "@/lib/colorUtils";

export function ChatInput() {
  const [input, setInput] = useState("");
  const { sendMessage, isLoading } = useChat();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const theme = useTheme();

  // Use the same background color as persona bubbles
  const bubbleStyles = generatePersonaBubbleStyles("", theme);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = '44px';
      const scrollHeight = textarea.scrollHeight;
      textarea.style.height = scrollHeight + 'px';
    }
  }, [input]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const message = input.trim();
    setInput("");
    await sendMessage(message);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Aa"
          className="w-full min-h-[44px] px-[13px] py-[12px] pr-[52px] rounded-[20px] border-none font-normal text-[16px] leading-[20px] outline-none resize-none"
          style={{
            fontFamily: 'SF Compact Text, SF Pro Text, -apple-system, BlinkMacSystemFont, sans-serif',
            backgroundColor: bubbleStyles.backgroundColor,
            color: bubbleStyles.textColor,
            opacity: input.trim() ? 1 : 0.5,
            border: 'none',
            outline: 'none',
            boxShadow: 'none',
            overflow: 'hidden'
          }}
          disabled={isLoading}
          autoFocus
          rows={1}
        />

        {/* Send Button - shown when not loading */}
        {!isLoading && (
          <button
            type="submit"
            disabled={!input.trim()}
            className="absolute right-[8px] w-[28px] h-[28px] rounded-full flex items-center justify-center disabled:opacity-30 transition-opacity"
            style={{ top: '8px', backgroundColor: '#007AFF' }}
          >
            <SendArrowIcon />
          </button>
        )}

        {/* Stop Button - shown when loading (inactive for now) */}
        {isLoading && (
          <button
            type="button"
            disabled={true}
            className="absolute right-[8px] w-[28px] h-[28px] rounded-full flex items-center justify-center opacity-30"
            style={{ top: '8px', backgroundColor: '#007AFF' }}
          >
            <StopIcon />
          </button>
        )}
      </div>
    </form>
  );
}
