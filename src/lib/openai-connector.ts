/**
 * OpenAI Connector for GPT-5 Streaming
 * Optimized for real-time chat conversations
 */

import OpenAI from "openai";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export class OpenAIConnector {
  private client: OpenAI;
  private model: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error(
        "OpenAI API key is required. Set OPENAI_API_KEY in .env file"
      );
    }

    this.client = new OpenAI({ apiKey });
    this.model = "gpt-5";
  }

  /**
   * Stream chat responses for real-time conversation
   */
  async *streamChat(
    messages: ChatMessage[],
    systemPrompt?: string
  ): AsyncGenerator<string, void, unknown> {
    const conversationHistory = systemPrompt
      ? [{ role: "system" as const, content: systemPrompt }, ...messages]
      : messages;

    // Build prompt from conversation history
    const prompt = conversationHistory
      .map((msg) => {
        if (msg.role === "system") return `System: ${msg.content}`;
        if (msg.role === "user") return `User: ${msg.content}`;
        return `Assistant: ${msg.content}`;
      })
      .join("\n\n");

    try {
      const response = await this.client.responses.create({
        model: this.model,
        input: prompt,
        reasoning: { effort: "medium" },
        text: { verbosity: "high" },
      });

      if (!response.output_text) {
        throw new Error("No output_text from OpenAI Responses API");
      }

      // Simulate streaming by yielding chunks of the response
      // In production, you'd use actual streaming if API supports it
      const text = response.output_text;
      const chunkSize = 15; // Characters per chunk for smooth streaming effect

      for (let i = 0; i < text.length; i += chunkSize) {
        const chunk = text.slice(i, i + chunkSize);
        yield chunk;
        // Small delay for smoother streaming effect
        await new Promise(resolve => setTimeout(resolve, 30));
      }
    } catch (error) {
      console.error("OpenAI streaming error:", error);
      throw error;
    }
  }

  /**
   * Generate complete response (non-streaming)
   */
  async generateResponse(
    messages: ChatMessage[],
    systemPrompt?: string
  ): Promise<string> {
    const chunks: string[] = [];
    for await (const chunk of this.streamChat(messages, systemPrompt)) {
      chunks.push(chunk);
    }
    return chunks.join("");
  }
}
