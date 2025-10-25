"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getSessionToken } from "@/lib/session";
import { parseSSEStream, SSEEvent } from "@/lib/sse-parser";
import { flushSync } from "react-dom";

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
  avatarImage?: string;
  language?: string;
  createdAt: string;
}

export interface TypingPersona {
  personaId: string;
  personaName: string;
  personaColor: string;
  personaAvatarImage?: string;
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
  const router = useRouter();
  const searchParams = useSearchParams();

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
  const [isInitialized, setIsInitialized] = useState(false);

  // Message reconciliation function to sync missed messages from database
  const reconcileMessages = useCallback(async (requestSessionId: string) => {
    try {
      console.log("Starting message reconciliation for session:", requestSessionId);

      // Fetch all messages from database
      const response = await fetch(`/api/messages?sessionId=${requestSessionId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch messages from database");
      }

      const data = await response.json();
      const dbMessages = data.messages || [];

      // Convert database messages to client format
      const dbMessagesFormatted = dbMessages.map((msg: any) => ({
        id: `${new Date(msg.timestamp).getTime()}-${msg.personaId || 'user'}-${Math.random()}`,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.timestamp),
        ...(msg.personaId && { personaId: msg.personaId }),
        ...(msg.personaName && { personaName: msg.personaName }),
      }));

      // Compare with current client messages
      setMessages((currentMessages) => {
        // Get the current user message (last message that triggered this group chat)
        const lastUserMessageIndex = currentMessages.length > 0
          ? currentMessages.map((m, i) => m.role === 'user' ? i : -1).filter(i => i !== -1).pop()
          : -1;

        if (lastUserMessageIndex === -1) {
          // No user message found, replace with all DB messages
          console.log("No user message found, replacing with DB messages:", dbMessagesFormatted.length);
          return dbMessagesFormatted;
        }

        // Get messages after the last user message from both sources
        const currentAssistantMessages = currentMessages.slice(lastUserMessageIndex + 1);
        const dbAssistantMessages = dbMessagesFormatted.filter((msg, index) => {
          // Find the corresponding user message in DB
          const dbUserMessages = dbMessagesFormatted.filter(m => m.role === 'user');
          const lastDbUserIndex = dbMessagesFormatted.lastIndexOf(dbUserMessages[dbUserMessages.length - 1]);
          return index > lastDbUserIndex;
        });

        // Create a map of current messages by personaId for fast lookup
        const currentMessagesByPersona = new Map();
        currentAssistantMessages.forEach(msg => {
          if (msg.personaId) {
            currentMessagesByPersona.set(msg.personaId, msg);
          }
        });

        // Find missing messages (in DB but not in current client state)
        const missingMessages = dbAssistantMessages.filter(dbMsg => {
          if (!dbMsg.personaId) return false;

          const currentMsg = currentMessagesByPersona.get(dbMsg.personaId);
          return !currentMsg || currentMsg.content !== dbMsg.content;
        });

        if (missingMessages.length > 0) {
          console.log(`Found ${missingMessages.length} missing messages, adding them to client state`);

          // Merge missing messages with current messages
          const messagesUpToUser = currentMessages.slice(0, lastUserMessageIndex + 1);

          // Combine current assistant messages with missing ones, removing duplicates
          const allAssistantMessages = [...currentAssistantMessages];

          missingMessages.forEach(missingMsg => {
            // Only add if not already present
            const existingIndex = allAssistantMessages.findIndex(m =>
              m.personaId === missingMsg.personaId && m.content === missingMsg.content
            );
            if (existingIndex === -1) {
              allAssistantMessages.push(missingMsg);
            }
          });

          // Sort assistant messages by timestamp to maintain proper order
          allAssistantMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

          return [...messagesUpToUser, ...allAssistantMessages];
        } else {
          console.log("No missing messages found, client state is in sync");
          return currentMessages;
        }
      });

    } catch (error) {
      console.error("Message reconciliation failed:", error);
      // Don't throw - reconciliation is a recovery mechanism, not critical
    }
  }, []);

  // Helper function to handle group chat SSE events
  const handleGroupChatSSE = useCallback(
    (reader: ReadableStreamDefaultReader<Uint8Array>, requestSessionId: string) => {
      return new Promise<void>((resolve, reject) => {
        parseSSEStream(reader, {
          onEvent: (event: SSEEvent) => {
            // Check if session changed during streaming
            if (currentSessionRef.current !== requestSessionId) {
              console.log("Session changed during streaming, ignoring event");
              return;
            }

            const eventData = event.data;

            switch (event.type) {
              case "typing_start":
                if (eventData.personaId) {
                  flushSync(() => {
                    setTypingPersonas((prev) => {
                      if (prev.some((p) => p.personaId === eventData.personaId)) {
                        return prev;
                      }
                      return [...prev, {
                        personaId: eventData.personaId,
                        personaName: eventData.personaName,
                        personaColor: eventData.personaColor,
                        personaAvatarImage: eventData.personaAvatarImage,
                      }];
                    });
                  });
                }
                break;

              case "typing_stop":
                if (eventData.personaId) {
                  setTypingPersonas((prev) =>
                    prev.filter((p) => p.personaId !== eventData.personaId)
                  );
                }
                break;

              case "complete_response":
                if (eventData.personaId && currentSessionRef.current === requestSessionId) {
                  const newMessage = {
                    id: `${Date.now()}-${eventData.personaId}-${Math.random()}`,
                    role: "assistant" as const,
                    content: eventData.content,
                    timestamp: new Date(),
                    personaName: eventData.personaName,
                    personaId: eventData.personaId,
                  };
                  setMessages((prev) => [...prev, newMessage]);
                }
                break;

              case "error":
                if (eventData.personaId) {
                  setTypingPersonas((prev) =>
                    prev.filter((p) => p.personaId !== eventData.personaId)
                  );
                }
                break;

              case "completion_stats":
                // Handle completion statistics for monitoring
                if (eventData.stats) {
                  console.log("📊 Group chat completion stats:", eventData.stats);
                  if (eventData.stats.failed > 0) {
                    console.warn(`⚠️ ${eventData.stats.failed} personas failed:`, eventData.stats.failedPersonas);
                  }
                }
                break;

              case "message":
                // Handle [DONE] signal
                if (eventData === "[DONE]") {
                  // Don't resolve here - wait for stream to complete naturally
                }
                break;
            }
          },
          onError: (error: Error) => {
            console.error("SSE parsing error:", error);
            reject(error);
          },
          onComplete: async () => {
            // Clear all typing indicators when done
            setTypingPersonas([]);

            // Perform message reconciliation to catch any missed persona responses
            console.log("Group chat stream completed, performing message reconciliation...");
            try {
              const response = await fetch(`/api/messages?sessionId=${requestSessionId}`);
              if (response.ok) {
                const data = await response.json();
                const dbMessages = data.messages || [];

                // Convert database messages to client format
                const dbMessagesFormatted = dbMessages.map((msg: any) => ({
                  id: `${new Date(msg.timestamp).getTime()}-${msg.personaId || 'user'}-${Math.random()}`,
                  role: msg.role,
                  content: msg.content,
                  timestamp: new Date(msg.timestamp),
                  ...(msg.personaId && { personaId: msg.personaId }),
                  ...(msg.personaName && { personaName: msg.personaName }),
                }));

                // Compare with current client messages and sync if needed
                setMessages((currentMessages) => {
                  const lastUserMessageIndex = currentMessages.length > 0
                    ? currentMessages.map((m, i) => m.role === 'user' ? i : -1).filter(i => i !== -1).pop()
                    : -1;

                  if (lastUserMessageIndex === -1) {
                    return dbMessagesFormatted;
                  }

                  const currentAssistantMessages = currentMessages.slice(lastUserMessageIndex + 1);
                  const dbAssistantMessages = dbMessagesFormatted.filter((msg, index) => {
                    const dbUserMessages = dbMessagesFormatted.filter(m => m.role === 'user');
                    const lastDbUserIndex = dbMessagesFormatted.lastIndexOf(dbUserMessages[dbUserMessages.length - 1]);
                    return index > lastDbUserIndex;
                  });

                  const currentMessagesByPersona = new Map();
                  currentAssistantMessages.forEach(msg => {
                    if (msg.personaId) {
                      currentMessagesByPersona.set(msg.personaId, msg);
                    }
                  });

                  const missingMessages = dbAssistantMessages.filter(dbMsg => {
                    if (!dbMsg.personaId) return false;
                    const currentMsg = currentMessagesByPersona.get(dbMsg.personaId);
                    return !currentMsg || currentMsg.content !== dbMsg.content;
                  });

                  if (missingMessages.length > 0) {
                    console.log(`Found ${missingMessages.length} missing messages, adding them to client state`);
                    const messagesUpToUser = currentMessages.slice(0, lastUserMessageIndex + 1);
                    const allAssistantMessages = [...currentAssistantMessages];

                    missingMessages.forEach(missingMsg => {
                      const existingIndex = allAssistantMessages.findIndex(m =>
                        m.personaId === missingMsg.personaId && m.content === missingMsg.content
                      );
                      if (existingIndex === -1) {
                        allAssistantMessages.push(missingMsg);
                      }
                    });

                    allAssistantMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
                    return [...messagesUpToUser, ...allAssistantMessages];
                  }

                  return currentMessages;
                });
              }
            } catch (error) {
              console.error("Message reconciliation failed:", error);
            }

            resolve();
          },
          enableHeartbeat: true,
          heartbeatInterval: 15000, // 15 seconds (reduced from 30)
          debug: false, // Debugging completed
        });
      });
    },
    [currentSessionRef]
  );

  // Helper function to update URL with current selection
  const updateURL = useCallback((personaId: string | null) => {
    const currentParams = new URLSearchParams(searchParams.toString());

    if (personaId) {
      currentParams.set('chat', personaId);
    } else {
      currentParams.delete('chat');
    }

    const newURL = currentParams.toString()
      ? `/?${currentParams.toString()}`
      : '/';

    router.replace(newURL);
  }, [router, searchParams]);

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

  // Initialize selection from URL after personas are loaded
  useEffect(() => {
    if (!isLoadingPersonas && !isInitialized) {
      const chatParam = searchParams.get('chat');
      let initialSelection: string | null = null;

      if (chatParam) {
        // Check if URL parameter is valid
        if (chatParam === 'GROUP' && personas.length >= 2) {
          initialSelection = 'GROUP';
        } else if (personas.some(p => p._id === chatParam)) {
          initialSelection = chatParam;
        }
        // If invalid URL parameter, leave as null (no selection)
      } else {
        // If no URL parameter, default to group chat if possible
        if (personas.length >= 2) {
          initialSelection = 'GROUP';
        }
        // Otherwise leave as null (no selection) for fallback behavior
      }

      setSelectedPersonaId(initialSelection);
      if (initialSelection) {
        updateURL(initialSelection);
      }
      setIsInitialized(true);
    }
  }, [isLoadingPersonas, isInitialized, searchParams, personas, updateURL]);

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
    if (isInitialized) {
      updateURL(personaId);
    }
  }, [isInitialized, updateURL]);

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
          // GROUP CHAT MODE: Handle multiple persona responses with robust SSE parsing
          await handleGroupChatSSE(reader, requestSessionId);
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
        // GROUP CHAT MODE: Handle multiple persona greetings with robust SSE parsing
        await handleGroupChatSSE(reader, requestSessionId);
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
