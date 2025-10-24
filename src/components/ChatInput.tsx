"use client";

import { useState, FormEvent, KeyboardEvent, useRef, useEffect } from "react";
import { useChat } from "@/context/ChatContext";

export function ChatInput() {
  const [input, setInput] = useState("");
  const { sendMessage, isLoading } = useChat();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
          className="w-full min-h-[44px] bg-[#0E0E0E] px-[13px] py-[12px] pr-[52px] rounded-[20px] border-none font-normal text-[16px] leading-[20px] outline-none resize-none text-white placeholder:text-white placeholder:opacity-50"
          style={{
            fontFamily: 'SF Compact Text, SF Pro Text, -apple-system, BlinkMacSystemFont, sans-serif',
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
            className="absolute right-[8px] w-[28px] h-[28px] rounded-full bg-white flex items-center justify-center disabled:opacity-30 transition-opacity"
            style={{ top: '8px' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 11L7 3M7 3L4 6M7 3L10 6" stroke="#0E0E0E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}

        {/* Stop Button - shown when loading (inactive for now) */}
        {isLoading && (
          <button
            type="button"
            disabled={true}
            className="absolute right-[8px] w-[28px] h-[28px] rounded-full bg-white flex items-center justify-center opacity-30"
            style={{ top: '8px' }}
          >
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="8" height="8" fill="#0E0E0E"/>
            </svg>
          </button>
        )}
      </div>
    </form>
  );
}
