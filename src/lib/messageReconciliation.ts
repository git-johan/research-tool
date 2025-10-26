import { Message } from "@/context/ChatContext";

/**
 * Reconciles client-side messages with server-side messages from the database.
 * This is used to ensure missed messages from group chats are properly synced.
 */
export async function reconcileMessages(
  currentMessages: Message[],
  requestSessionId: string,
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
) {
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
}