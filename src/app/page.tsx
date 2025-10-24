"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChatProvider, useChat } from "@/context/ChatContext";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { TypingIndicator } from "@/components/TypingIndicator";

function ChatInterface() {
  const {
    messages,
    isLoading,
    isLoadingMessages,
    sessionToken,
    selectedPersonaId,
    personas,
    isLoadingPersonas,
    setSelectedPersona,
    sendInitialGreeting,
    clearMessages
  } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasStarted = useRef(false);
  const lastSessionToken = useRef<string>("");
  const [isCopying, setIsCopying] = useState(false);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Reset hasStarted when session changes (new persona selected)
  useEffect(() => {
    if (sessionToken && sessionToken !== lastSessionToken.current) {
      hasStarted.current = false;
      lastSessionToken.current = sessionToken;
    }
  }, [sessionToken]);

  // Send initial AI greeting when chat starts
  useEffect(() => {
    // Only send greeting if we've finished loading messages and there are no messages
    // Also wait for personas to finish loading
    if (!hasStarted.current && !isLoadingMessages && !isLoadingPersonas && messages.length === 0 && sessionToken) {
      hasStarted.current = true;
      sendInitialGreeting();
    }
  }, [messages, isLoadingMessages, isLoadingPersonas, sessionToken, sendInitialGreeting]);

  const handleCopyLink = async () => {
    if (!sessionToken || messages.length === 0) return;

    setIsCopying(true);
    try {
      // Generate share link
      const response = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sessionToken }),
      });

      if (response.ok) {
        const data = await response.json();
        const publicUrl = `${window.location.origin}/shared/${data.shareId}`;
        await navigator.clipboard.writeText(publicUrl);

        // Brief feedback
        setTimeout(() => setIsCopying(false), 1500);
      } else {
        setIsCopying(false);
        alert("Failed to generate share link");
      }
    } catch (error) {
      console.error("Error copying link:", error);
      setIsCopying(false);
      alert("Failed to copy link");
    }
  };

  return (
    <div className="flex flex-col h-screen items-center relative">
      {/* Header with Persona Selector and Controls */}
      <div className="absolute top-8 left-8 right-8 z-10 flex items-center justify-between">
        {/* Left side - Persona selector */}
        <div className="flex items-center gap-3">
          {isLoadingPersonas ? (
            <div className="text-gray-400 text-[16px] leading-[20px] h-[36px] flex items-center" style={{ fontFamily: 'SF Compact Text, SF Pro Text, -apple-system, BlinkMacSystemFont, sans-serif' }}>Loading personas...</div>
          ) : personas.length === 0 ? (
            <Link
              href="/setup"
              className="bg-white text-black rounded-full px-4 py-2 text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              Add Personas to Start
            </Link>
          ) : (
            <>
              <select
                value={selectedPersonaId || ""}
                onChange={(e) => setSelectedPersona(e.target.value || null)}
                className="bg-[#1A1A1A] text-white rounded-full pl-4 pr-10 h-[36px] text-[16px] leading-[20px] font-medium border border-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-600 flex items-center"
                style={{ fontFamily: 'SF Compact Text, SF Pro Text, -apple-system, BlinkMacSystemFont, sans-serif' }}
              >
                <option value="">Select a persona...</option>
                {personas.map((persona) => (
                  <option key={persona._id} value={persona._id}>
                    {persona.name} - {persona.role}
                  </option>
                ))}
              </select>
              <Link
                href="/setup"
                className="text-gray-400 hover:text-white text-[16px] leading-[20px] transition-colors flex items-center h-[36px]"
                style={{ fontFamily: 'SF Compact Text, SF Pro Text, -apple-system, BlinkMacSystemFont, sans-serif' }}
              >
                Manage
              </Link>
            </>
          )}
        </div>

        {/* Right side - Clear and Share buttons */}
        {messages.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={clearMessages}
              className="bg-[#1A1A1A] text-gray-400 hover:text-white rounded-full px-[13px] pt-[4px] pb-[6px] text-[16px] leading-[20px] border border-gray-700 hover:border-gray-600 transition-colors flex items-center gap-1"
              style={{ fontFamily: 'SF Compact Text, SF Pro Text, -apple-system, BlinkMacSystemFont, sans-serif' }}
              title="Clear conversation"
            >
              Clear
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 4H14M12.5 4V13C12.5 13.5523 12.0523 14 11.5 14H4.5C3.94772 14 3.5 13.5523 3.5 13V4M5.5 4V2.5C5.5 2.22386 5.72386 2 6 2H10C10.2761 2 10.5 2.22386 10.5 2.5V4M6.5 7V11M9.5 7V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button
              onClick={handleCopyLink}
              disabled={isCopying}
              className="bg-[#1A1A1A] text-gray-400 hover:text-white rounded-full px-[13px] pt-[4px] pb-[6px] text-[16px] leading-[20px] border border-gray-700 hover:border-gray-600 transition-colors disabled:opacity-50 flex items-center gap-1"
              style={{ fontFamily: 'SF Compact Text, SF Pro Text, -apple-system, BlinkMacSystemFont, sans-serif' }}
            >
              {isCopying ? "Copied!" : (
                <>
                  Share
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 2V10M8 2L5 5M8 2L11 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M13 10V13C13 13.5523 12.5523 14 12 14H4C3.44772 14 3 13.5523 3 13V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto pt-8 w-full max-w-[900px] px-8">
        <div>
          {messages.map((message, index) => {
            // Check if this message should show header
            // Show header if it's the first message or if the previous message was from a different sender
            const showHeader = index === 0 || messages[index - 1].role !== message.role;

            // Get the selected persona
            const selectedPersona = personas.find(p => p._id === selectedPersonaId);

            return (
              <ChatMessage
                key={message.id}
                message={message}
                showHeader={showHeader}
                personaName={selectedPersona?.name}
              />
            );
          })}

          {isLoading && <TypingIndicator />}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="w-full max-w-[900px] px-8 pb-8 pt-[30px]">
        <ChatInput />
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <ChatProvider>
      <ChatInterface />
    </ChatProvider>
  );
}
