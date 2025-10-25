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
    typingPersonas,
    setSelectedPersona,
    sendInitialGreeting,
    clearMessages,
  } = useChat();


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
        <div className="px-4 md:px-8 pt-6 pb-2">
          {/* Show placeholder for empty group chat */}
          {selectedPersonaId === "GROUP" && messages.length === 0 && !isLoading && !isLoadingMessages && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center opacity-50">
                <p className="text-lg mb-2">Group Chat Mode</p>
                <p className="text-sm">Ask your personas about a problem you're facing...</p>
              </div>
            </div>
          )}

          {messages.map((message, index) => {
            // Show header if it's the first message or if the previous message was from a different sender
            const showHeader =
              index === 0 || messages[index - 1].role !== message.role;

            // Get the persona for this message (for color)
            let messagePersona;
            if (message.personaId) {
              // Group chat message - find persona by ID
              messagePersona = personas.find((p) => p._id === message.personaId);
            } else {
              // Individual chat - use selected persona
              messagePersona = personas.find((p) => p._id === selectedPersonaId);
            }

            return (
              <ChatMessage
                key={message.id}
                message={message}
                showHeader={showHeader}
                personaName={messagePersona?.name}
                personaColor={messagePersona?.color}
                personaAvatarImage={messagePersona?.avatarImage}
              />
            );
          })}

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

export default function Home() {
  return (
    <ChatProvider>
      <ChatInterface />
    </ChatProvider>
  );
}
