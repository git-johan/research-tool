"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ChatContainer from "@/components/ChatContainer";
import { Message, Persona } from "@/context/ChatContext";

export default function SharedConversation() {
  const params = useParams();
  const shareId = params.shareId as string;
  const [messages, setMessages] = useState<Message[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [sessionPersonaId, setSessionPersonaId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSharedConversation = async () => {
      try {
        // Load both shared conversation and personas in parallel
        const [conversationResponse, personasResponse] = await Promise.all([
          fetch(`/api/share?shareId=${shareId}`),
          fetch('/api/personas')
        ]);

        if (!conversationResponse.ok) {
          if (conversationResponse.status === 404) {
            setError("This shared conversation doesn't exist or has been deleted.");
          } else {
            setError("Failed to load shared conversation.");
          }
          return;
        }

        const conversationData = await conversationResponse.json();
        const personasData = personasResponse.ok ? await personasResponse.json() : { personas: [] };

        // Set personas and session context
        setPersonas(personasData.personas || []);
        setSessionPersonaId(conversationData.sessionPersonaId || null);

        // Process messages preserving persona context
        if (conversationData.messages && Array.isArray(conversationData.messages)) {
          const loadedMessages = conversationData.messages.map((msg: any) => ({
            id: `${new Date(msg.timestamp).getTime()}-${Math.random()}`,
            role: msg.role,
            content: msg.content,
            timestamp: new Date(msg.timestamp),
            // Preserve persona context for group chat messages
            ...(msg.personaId && { personaId: msg.personaId }),
            ...(msg.personaName && { personaName: msg.personaName }),
          }));
          setMessages(loadedMessages);
        }
      } catch (err) {
        console.error("Error loading shared conversation:", err);
        setError("Failed to load shared conversation.");
      } finally {
        setLoading(false);
      }
    };

    loadSharedConversation();
  }, [shareId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-[var(--text-secondary)]">Loading shared conversation...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-red-600 text-lg font-medium mb-2">Error</div>
          <div className="text-[var(--text-secondary)]">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <ChatContainer
      mode="shared"
      initialMessages={messages}
      shareId={shareId}
      sharedPersonas={personas}
      sessionPersonaId={sessionPersonaId}
    />
  );
}
