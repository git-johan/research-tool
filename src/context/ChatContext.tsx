"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { getSessionToken } from "@/lib/session";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  personaId?: string;
  personaName?: string;
}

export interface Persona {
  _id: string;
  name: string;
  role: string;
  transcriptData: string;
  color: string;
  createdAt: string;
}

export interface TypingPersona {
  personaId: string;
  personaName: string;
  personaColor: string;
}

interface ChatContextType {
  messages: Message[];
  isLoading: boolean;
  isLoadingMessages: boolean;
  sessionToken: string;
  selectedPersonaId: string | null;
  personas: Persona[];
  isLoadingPersonas: boolean;
  typingPersonas: TypingPersona[];
  addMessage: (role: "user" | "assistant", content: string) => void;
  sendMessage: (content: string) => Promise<void>;
  sendInitialGreeting: () => Promise<void>;
  clearMessages: () => void;
  setSelectedPersona: (personaId: string | null) => void;
  loadPersonas: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionToken, setSessionToken] = useState<string>("");
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [isLoadingPersonas, setIsLoadingPersonas] = useState(true);
  const [typingPersonas, setTypingPersonas] = useState<TypingPersona[]>([]);
  const [clientId, setClientId] = useState<string>("");
  const currentSessionRef = React.useRef<string>("");

  // Load personas function
  const loadPersonas = useCallback(async () => {
    try {
      const response = await fetch("/api/personas");
      if (response.ok) {
        const data = await response.json();
        setPersonas(data.personas || []);
      }
    } catch (error) {
      console.error("Failed to load personas:", error);
    } finally {
      setIsLoadingPersonas(false);
    }
  }, []);

  // Function to switch to a session for a specific persona
  const switchToPersonaSession = useCallback(async (personaId: string | null) => {
    if (!clientId) return; // Wait for clientId to be initialized

    setIsLoadingMessages(true);
    try {
      // Get or create session for this persona
      const sessionEndpoint = personaId
        ? `/api/session?personaId=${personaId}&clientId=${clientId}`
        : `/api/session?personaId=null&clientId=${clientId}`;

      const response = await fetch(sessionEndpoint);
      if (response.ok) {
        const data = await response.json();

        // Update session token and track current session
        setSessionToken(data.sessionId);
        currentSessionRef.current = data.sessionId;

        // Load messages for this session
        if (data.messages && Array.isArray(data.messages)) {
          const loadedMessages = data.messages.map((msg: any) => ({
            id: `${new Date(msg.timestamp).getTime()}-${Math.random()}`,
            role: msg.role,
            content: msg.content,
            timestamp: new Date(msg.timestamp),
            ...(msg.personaId && { personaId: msg.personaId }),
            ...(msg.personaName && { personaName: msg.personaName }),
          }));
          setMessages(loadedMessages);
        } else {
          setMessages([]);
        }
      }
    } catch (error) {
      console.error("Failed to switch session:", error);
    } finally {
      setIsLoadingMessages(false);
    }
  }, [clientId]);

  // Watch for persona selection changes and switch sessions
  useEffect(() => {
    if (!isLoadingPersonas) {
      switchToPersonaSession(selectedPersonaId);
    }
  }, [selectedPersonaId, isLoadingPersonas, switchToPersonaSession]);

  // Initialize clientId from localStorage on mount
  useEffect(() => {
    const id = getSessionToken();
    setClientId(id);
  }, []);

  // Initialize - load personas first, then session will be loaded by the effect above
  useEffect(() => {
    loadPersonas();
  }, [loadPersonas]);

  const addMessage = useCallback((role: "user" | "assistant", content: string) => {
    const newMessage: Message = {
      id: `${Date.now()}-${Math.random()}`,
      role,
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);
  }, []);

  const setSelectedPersona = useCallback((personaId: string | null) => {
    setSelectedPersonaId(personaId);
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      // Add user message immediately (optimistic update)
      addMessage("user", content);
      setIsLoading(true);

      // Capture current session at call time
      const requestSessionId = sessionToken;

      try {
        // Prepare conversation history
        const conversationMessages = [
          ...messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          { role: "user" as const, content },
        ];

        // Call streaming API
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: conversationMessages,
            sessionId: requestSessionId,
            selectedPersonaId: selectedPersonaId
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to get response");
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error("No response body");
        }

        const isGroupChat = selectedPersonaId === "GROUP";

        if (isGroupChat) {
          // GROUP CHAT MODE: Handle multiple persona responses with typing indicators
          const personaResponses = new Map<string, { content: string; name: string; color: string; id: string }>();

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // Check if session changed
            if (currentSessionRef.current !== requestSessionId) {
              console.log("Session changed during streaming, stopping UI updates");
              break;
            }

            const chunk = decoder.decode(value);
            const lines = chunk.split("\n");

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") {
                  continue; // Don't break - wait for stream to close naturally
                }

                try {
                  const parsed = JSON.parse(data);

                  if (parsed.type === "typing_start") {
                    // Add persona to typing list
                    setTypingPersonas((prev) => {
                      if (prev.some((p) => p.personaId === parsed.personaId)) {
                        return prev;
                      }
                      return [...prev, {
                        personaId: parsed.personaId,
                        personaName: parsed.personaName,
                        personaColor: parsed.personaColor,
                      }];
                    });
                  } else if (parsed.type === "typing_stop") {
                    // Remove persona from typing list
                    setTypingPersonas((prev) =>
                      prev.filter((p) => p.personaId !== parsed.personaId)
                    );
                  } else if (parsed.type === "complete_response" && parsed.personaId) {
                    // Add complete response immediately
                    if (currentSessionRef.current === requestSessionId) {
                      const newMessage = {
                        id: `${Date.now()}-${parsed.personaId}-${Math.random()}`,
                        role: "assistant" as const,
                        content: parsed.content,
                        timestamp: new Date(),
                        personaName: parsed.personaName,
                        personaId: parsed.personaId,
                      };

                      setMessages((prev) => [...prev, newMessage]);
                    }
                  } else if (parsed.type === "error") {
                    // Remove from typing on error
                    setTypingPersonas((prev) =>
                      prev.filter((p) => p.personaId !== parsed.personaId)
                    );
                  }
                } catch (e) {
                  // Skip invalid JSON
                }
              }
            }
          }

          // Clear all typing indicators when done
          setTypingPersonas([]);
        } else {
          // INDIVIDUAL CHAT MODE: Original behavior
          let assistantMessage = "";
          let assistantMessageId = `${Date.now()}-${Math.random()}`;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            if (currentSessionRef.current !== requestSessionId) {
              console.log("Session changed during streaming, stopping UI updates");
              break;
            }

            const chunk = decoder.decode(value);
            const lines = chunk.split("\n");

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") {
                  continue; // Don't break - wait for stream to close naturally
                }

                try {
                  const parsed = JSON.parse(data);
                  if (parsed.chunk) {
                    assistantMessage += parsed.chunk;

                    if (currentSessionRef.current === requestSessionId) {
                      setMessages((prev) => {
                        const filtered = prev.filter((m) => m.id !== assistantMessageId);
                        return [
                          ...filtered,
                          {
                            id: assistantMessageId,
                            role: "assistant" as const,
                            content: assistantMessage,
                            timestamp: new Date(),
                          },
                        ];
                      });
                    }
                  }
                } catch (e) {
                  // Skip invalid JSON
                }
              }
            }
          }
        }
      } catch (error) {
        console.error("Error sending message:", error);
        addMessage(
          "assistant",
          "Sorry, I encountered an error. Please try again."
        );
      } finally {
        setIsLoading(false);
      }
    },
    [messages, addMessage, sessionToken, selectedPersonaId]
  );

  const sendInitialGreeting = useCallback(async () => {
    if (!sessionToken || selectedPersonaId === undefined) return;

    setIsLoading(true);

    // Capture current session at call time
    const requestSessionId = sessionToken;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "[INITIAL_GREETING]" }],
          sessionId: requestSessionId,
          selectedPersonaId: selectedPersonaId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get initial greeting");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      const isGroupChat = selectedPersonaId === "GROUP";

      if (isGroupChat) {
        // GROUP CHAT MODE: Handle multiple persona greetings with typing
        const personaResponses = new Map<string, { content: string; name: string; color: string; id: string }>();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          if (currentSessionRef.current !== requestSessionId) {
            console.log("Session changed during initial greeting, stopping UI updates");
            break;
          }

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") break;

              try {
                const parsed = JSON.parse(data);

                if (parsed.type === "typing_start") {
                  setTypingPersonas((prev) => {
                    if (prev.some((p) => p.personaId === parsed.personaId)) {
                      return prev;
                    }
                    return [...prev, {
                      personaId: parsed.personaId,
                      personaName: parsed.personaName,
                      personaColor: parsed.personaColor,
                    }];
                  });
                } else if (parsed.type === "typing_stop") {
                  setTypingPersonas((prev) =>
                    prev.filter((p) => p.personaId !== parsed.personaId)
                  );
                } else if (parsed.type === "complete_response" && parsed.personaId) {
                  // Add complete response immediately
                  if (currentSessionRef.current === requestSessionId) {
                    const newMessage = {
                      id: `${Date.now()}-${parsed.personaId}-${Math.random()}`,
                      role: "assistant" as const,
                      content: parsed.content,
                      timestamp: new Date(),
                      personaName: parsed.personaName,
                    };

                    setMessages((prev) => [...prev, newMessage]);
                  }
                } else if (parsed.type === "error") {
                  setTypingPersonas((prev) =>
                    prev.filter((p) => p.personaId !== parsed.personaId)
                  );
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }

        // Clear all typing indicators
        setTypingPersonas([]);
      } else {
        // INDIVIDUAL CHAT MODE: Original behavior
        let greeting = "";
        let greetingMessageId = `${Date.now()}-${Math.random()}`;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          if (currentSessionRef.current !== requestSessionId) {
            console.log("Session changed during initial greeting, stopping UI updates");
            break;
          }

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") break;

              try {
                const parsed = JSON.parse(data);
                if (parsed.chunk) {
                  greeting += parsed.chunk;

                  if (currentSessionRef.current === requestSessionId) {
                    setMessages((prev) => {
                      const filtered = prev.filter((m) => m.id !== greetingMessageId);
                      return [
                        ...filtered,
                        {
                          id: greetingMessageId,
                          role: "assistant" as const,
                          content: greeting,
                          timestamp: new Date(),
                        },
                      ];
                    });
                  }
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Failed to get initial greeting:", error);
    } finally {
      setIsLoading(false);
    }
  }, [sessionToken, selectedPersonaId]);

  const clearMessages = useCallback(async () => {
    if (!sessionToken) return;

    try {
      // Clear messages in database
      const response = await fetch("/api/clear-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sessionToken }),
      });

      if (!response.ok) {
        console.error("Failed to clear messages from database");
      }
    } catch (error) {
      console.error("Error clearing messages:", error);
    }

    // Clear UI immediately regardless of API result
    setMessages([]);
  }, [sessionToken]);

  return (
    <ChatContext.Provider
      value={{
        messages,
        isLoading,
        isLoadingMessages,
        sessionToken,
        selectedPersonaId,
        personas,
        isLoadingPersonas,
        typingPersonas,
        addMessage,
        sendMessage,
        sendInitialGreeting,
        clearMessages,
        setSelectedPersona,
        loadPersonas,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within ChatProvider");
  }
  return context;
}
