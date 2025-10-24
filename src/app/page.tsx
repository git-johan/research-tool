"use client";

import { ChatProvider, useChat } from "@/context/ChatContext";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { TypingIndicator } from "@/components/TypingIndicator";
import { ChatHeader } from "@/components/ChatHeader";
import { useScrollToBottom } from "@/hooks/useScrollToBottom";
import { useInitialGreeting } from "@/hooks/useInitialGreeting";
import { useShareConversation } from "@/hooks/useShareConversation";

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
    clearMessages,
  } = useChat();

  // Auto-scroll to bottom when new messages arrive
  const messagesEndRef = useScrollToBottom([messages]);

  // Handle initial greeting
  useInitialGreeting({
    messages,
    isLoadingMessages,
    isLoadingPersonas,
    sessionToken,
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
        <div className="px-4 md:px-8 pt-2 pb-2">
          {messages.map((message, index) => {
            // Show header if it's the first message or if the previous message was from a different sender
            const showHeader =
              index === 0 || messages[index - 1].role !== message.role;

            // Get the selected persona
            const selectedPersona = personas.find(
              (p) => p._id === selectedPersonaId,
            );

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

      {/* Input - Fixed at bottom */}
      <div className="w-full sm:max-w-[900px] px-2 md:px-8 pt-2 pb-1">
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
