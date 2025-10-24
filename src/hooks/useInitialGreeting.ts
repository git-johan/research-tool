import { useEffect, useRef } from "react";

interface UseInitialGreetingProps {
  messages: unknown[];
  isLoadingMessages: boolean;
  isLoadingPersonas: boolean;
  sessionToken: string | null;
  sendInitialGreeting: () => void;
}

/**
 * Hook to send an initial AI greeting when the chat starts
 * Ensures greeting is only sent once per session after all loading is complete
 */
export function useInitialGreeting({
  messages,
  isLoadingMessages,
  isLoadingPersonas,
  sessionToken,
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
    // Only send greeting if we've finished loading messages and there are no messages
    // Also wait for personas to finish loading
    if (
      !hasStarted.current &&
      !isLoadingMessages &&
      !isLoadingPersonas &&
      messages.length === 0 &&
      sessionToken
    ) {
      hasStarted.current = true;
      sendInitialGreeting();
    }
  }, [
    messages,
    isLoadingMessages,
    isLoadingPersonas,
    sessionToken,
    sendInitialGreeting,
  ]);
}
