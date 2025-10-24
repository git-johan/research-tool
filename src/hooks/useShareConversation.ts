import { useState, useCallback } from "react";

/**
 * Hook to handle sharing conversation via link
 * @param sessionToken - Current session token
 * @param hasMessages - Whether there are any messages to share
 * @returns Object with handleShare function and isCopying state
 */
export function useShareConversation(
  sessionToken: string | null,
  hasMessages: boolean
) {
  const [isCopying, setIsCopying] = useState(false);

  const handleShare = useCallback(async () => {
    if (!sessionToken || !hasMessages) return;

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
  }, [sessionToken, hasMessages]);

  return { handleShare, isCopying };
}
