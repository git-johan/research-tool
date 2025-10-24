import { useEffect, useRef } from "react";

interface UseInitialGreetingProps {
  messages: unknown[];
  isLoadingMessages: boolean;
  isLoadingPersonas: boolean;
  sessionToken: string | null;
  selectedPersonaId: string | null;
  sendInitialGreeting: () => void;
}

/**
 * Hook to send an initial AI greeting when the chat starts
 * Ensures greeting is only sent once per session after all loading is complete
 * Note: Group chat (selectedPersonaId === "GROUP") does not send initial greeting
 */
export function useInitialGreeting({
  messages,
  isLoadingMessages,
  isLoadingPersonas,
  sessionToken,
  selectedPersonaId,
  sendInitialGreeting,
}: UseInitialGreetingProps) {
  const hasStarted = useRef(false);
  const lastSessionToken = useRef<string>("");

  // Reset hasStarted when session changes (new persona selected)
  useEffect(() => {
    if (sessionToken && sessionToken !== lastSessionToken.current) {
      hasStarted.current = false;
      lastSessionToken.current = sessionToken;
    }
  }, [sessionToken]);

  // Send initial AI greeting when chat starts
  useEffect(() => {
    // Skip initial greeting for group chat
    const isGroupChat = selectedPersonaId === "GROUP";

    // Only send greeting if we've finished loading messages and there are no messages
    // Also wait for personas to finish loading
    // Skip for group chat mode
    if (
      !hasStarted.current &&
      !isLoadingMessages &&
      !isLoadingPersonas &&
      messages.length === 0 &&
      sessionToken &&
      !isGroupChat
    ) {
      hasStarted.current = true;
      sendInitialGreeting();
    }
  }, [
    messages,
    isLoadingMessages,
    isLoadingPersonas,
    sessionToken,
    selectedPersonaId,
    sendInitialGreeting,
  ]);
}
