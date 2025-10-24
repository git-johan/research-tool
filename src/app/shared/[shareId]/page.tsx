"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ChatMessage } from "@/components/ChatMessage";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function SharedConversation() {
  const params = useParams();
  const shareId = params.shareId as string;
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSharedConversation = async () => {
      try {
        const response = await fetch(`/api/share?shareId=${shareId}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError("This shared conversation doesn't exist or has been deleted.");
          } else {
            setError("Failed to load shared conversation.");
          }
          return;
        }

        const data = await response.json();
        if (data.messages && Array.isArray(data.messages)) {
          const loadedMessages = data.messages.map((msg: any) => ({
            id: `${new Date(msg.timestamp).getTime()}-${Math.random()}`,
            role: msg.role,
            content: msg.content,
            timestamp: new Date(msg.timestamp),
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
        <div className="text-gray-600">Loading shared conversation...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-red-600 text-lg font-medium mb-2">Error</div>
          <div className="text-gray-600">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen items-center">
      {/* Header */}
      <div className="w-full bg-[#000000]" style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)' }}>
        <div className="max-w-[900px] mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-white">Shared Conversation</h1>
              <p className="text-sm text-gray-400">Read-only view</p>
            </div>
            <a
              href="/"
              className="bg-[#FFFFFF] bg-opacity-50 rounded-full px-[13px] pt-[4px] pb-[6px] text-[16px] leading-[20px] text-[#1A1A1A] transition-opacity hover:opacity-80 flex items-center gap-1"
              style={{ fontFamily: 'SF Compact Text, SF Pro Text, -apple-system, BlinkMacSystemFont, sans-serif' }}
            >
              Start Your Own Chat
            </a>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto pt-8 w-full max-w-[900px] px-8">
        <div>
          {messages.length === 0 ? (
            <div className="text-center text-gray-600 py-12">
              This conversation is empty.
            </div>
          ) : (
            messages.map((message, index) => {
              const showHeader = index === 0 || messages[index - 1].role !== message.role;
              return (
                <ChatMessage
                  key={`${message.timestamp}-${index}`}
                  message={message}
                  showHeader={showHeader}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
