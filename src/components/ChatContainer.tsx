"use client";

import React from "react";
import { ChatProvider, useChat, Message, Persona } from "@/context/ChatContext";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { TypingIndicator } from "@/components/TypingIndicator";
import { ChatHeader } from "@/components/ChatHeader";
import { useScrollToBottom } from "@/hooks/useScrollToBottom";
import { useInitialGreeting } from "@/hooks/useInitialGreeting";
import { useShareConversation } from "@/hooks/useShareConversation";
import { useMessageRenderer } from "@/hooks/useMessageRenderer";

interface ChatContainerProps {
  mode: "main" | "shared";
  initialMessages?: Message[];
  shareId?: string;
  // For shared mode, these are passed as props instead of using context
  sharedPersonas?: Persona[];
  // For shared individual chats, the persona context from session
  sessionPersonaId?: string | null;
}

// Main chat interface that uses ChatContext
function MainChatInterface() {
  const {
    messages,
    isLoading,
    isLoadingMessages,
    sessionToken,
    selectedPersonaId,
    personas,
    isLoadingPersonas,
    typingPersonas,
    setSelectedPersona,
    sendInitialGreeting,
    clearMessages,
  } = useChat();

  // Use unified message renderer for consistent styling
  const renderedMessages = useMessageRenderer(messages, personas, selectedPersonaId);

  // Auto-scroll to bottom when new messages arrive or typing indicators change
  const messagesEndRef = useScrollToBottom([messages, typingPersonas]);

  // Handle initial greeting
  useInitialGreeting({
    messages,
    isLoadingMessages,
    isLoadingPersonas,
    sessionToken,
    selectedPersonaId,
    sendInitialGreeting,
  });

  // Handle share conversation
  const { handleShare, isCopying } = useShareConversation(
    sessionToken,
    messages.length > 0,
  );

  return (
    <div className="flex flex-col h-dvh items-center">
      {/* Header */}
      <ChatHeader
        personas={personas}
        selectedPersonaId={selectedPersonaId}
        isLoadingPersonas={isLoadingPersonas}
        hasMessages={messages.length > 0}
        onPersonaChange={setSelectedPersona}
        onClearMessages={clearMessages}
        onShareConversation={handleShare}
        isCopying={isCopying}
      />

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto w-full sm:max-w-[900px] relative">
        <div className="pl-2 pr-3 md:pl-4 md:pr-5 pt-6 pb-2">
          {/* Show placeholder for empty group chat */}
          {selectedPersonaId === "GROUP" && messages.length === 0 && !isLoading && !isLoadingMessages && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center opacity-50">
                <p className="text-lg mb-2">Group Chat Mode</p>
                <p className="text-sm">Ask your personas about a problem you're facing...</p>
              </div>
            </div>
          )}

          {renderedMessages}

          {/* Show typing indicators for each persona */}
          {typingPersonas.map((persona) => (
            <TypingIndicator
              key={persona.personaId}
              personaName={persona.personaName}
              personaColor={persona.personaColor}
              personaAvatarImage={persona.personaAvatarImage}
            />
          ))}

          {/* Show generic loading for non-group chat */}
          {isLoading && selectedPersonaId !== "GROUP" && <TypingIndicator />}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input - Fixed at bottom */}
      <div className="w-full sm:max-w-[900px] px-2 md:px-8 pt-2 pb-1">
        <ChatInput />
      </div>
    </div>
  );
}

// Shared chat interface that doesn't use ChatContext
function SharedChatInterface({
  initialMessages,
  sharedPersonas,
  sessionPersonaId
}: {
  initialMessages: Message[],
  sharedPersonas: Persona[],
  sessionPersonaId?: string | null
}) {
  // Use unified message renderer with session persona context for individual chats
  const renderedMessages = useMessageRenderer(initialMessages, sharedPersonas, sessionPersonaId);

  // Auto-scroll to bottom when new messages arrive
  const messagesEndRef = useScrollToBottom([initialMessages]);

  return (
    <div className="flex flex-col h-dvh items-center">
      {/* Shared mode header */}
      <div className="w-full bg-[var(--bg-primary)]" style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)' }}>
        <div className="max-w-[900px] mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-[var(--text-primary)]">Shared Conversation</h1>
              <p className="text-sm text-[var(--text-secondary)]">Read-only view</p>
            </div>
            <a
              href="/"
              className="bg-[var(--text-primary)] bg-opacity-50 rounded-full px-[13px] pt-[4px] pb-[6px] text-[16px] leading-[20px] text-[var(--bg-primary)] transition-opacity hover:opacity-80 flex items-center gap-1"
              style={{ fontFamily: 'SF Compact Text, SF Pro Text, -apple-system, BlinkMacSystemFont, sans-serif' }}
            >
              Start Your Own Chat
            </a>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto w-full sm:max-w-[900px] relative">
        <div className="pl-2 pr-3 md:pl-4 md:pr-5 pt-8 pb-2">
          {/* Show empty message for shared mode */}
          {initialMessages.length === 0 && (
            <div className="text-center text-[var(--text-secondary)] py-12">
              This conversation is empty.
            </div>
          )}

          {renderedMessages}

          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  );
}

export default function ChatContainer({ mode, initialMessages, shareId, sharedPersonas, sessionPersonaId }: ChatContainerProps) {
  if (mode === "shared") {
    // For shared mode, render without ChatProvider since we have static data
    return (
      <SharedChatInterface
        initialMessages={initialMessages || []}
        sharedPersonas={sharedPersonas || []}
        sessionPersonaId={sessionPersonaId}
      />
    );
  }

  // For main mode, wrap with ChatProvider
  return (
    <ChatProvider>
      <MainChatInterface />
    </ChatProvider>
  );
}