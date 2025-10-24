import { OpenAIConnector, ChatMessage } from "@/lib/openai-connector";
import { NextRequest } from "next/server";
import { addMessage, getPersona } from "@/lib/db";

// System prompt for research assistant
const SYSTEM_PROMPT = `You are a knowledgeable research assistant designed to help users explore topics, gather information, and think critically about their questions.

Your approach:
- Provide accurate, well-researched information on a wide range of topics
- Ask clarifying questions when the user's needs are unclear
- Break down complex topics into understandable explanations
- Suggest related areas of inquiry that might be helpful
- Be thorough but concise - adapt your response length to the complexity of the question
- Help users think critically by presenting multiple perspectives when appropriate

When users start a conversation:
- Greet them warmly and ask what they'd like to research or learn about
- Be ready to dive deep into any topic they're interested in
- Help them refine their research questions and find the information they need

Be helpful, accurate, and supportive in their research journey.`;

export async function POST(req: NextRequest) {
  try {
    const { messages, sessionId, selectedPersonaId }: {
      messages: ChatMessage[];
      sessionId?: string;
      selectedPersonaId?: string | null;
    } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response("Invalid messages format", { status: 400 });
    }

    const connector = new OpenAIConnector();

    // Fetch persona data if a persona is selected
    let systemPrompt = SYSTEM_PROMPT;
    if (selectedPersonaId) {
      const persona = await getPersona(selectedPersonaId);
      if (persona) {
        // Create persona-specific system prompt
        systemPrompt = `You are roleplaying as ${persona.name}, a ${persona.role}.

Here is the interview transcript and information about this person:

${persona.transcriptData}

IMPORTANT INSTRUCTIONS:
- Respond as ${persona.name} would, based on their perspective, opinions, and experiences shared in the interview
- Use specific quotes and references from the interview when relevant
- Be authentic and conversational - speak in first person as ${persona.name}
- Show their personality, concerns, and way of thinking
- If asked about something not covered in the interview, respond as this person might based on their background and viewpoints
- Remember: you ARE ${persona.name}. Stay in character throughout the conversation.`;
      }
    }

    // Create a streaming response using Server-Sent Events
    const encoder = new TextEncoder();
    let fullResponse = ""; // Collect the full response to save to DB

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of connector.streamChat(
            messages,
            systemPrompt
          )) {
            fullResponse += chunk; // Accumulate response
            const data = encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`);
            controller.enqueue(data);
          }

          // Save messages to MongoDB after streaming completes
          if (sessionId) {
            try {
              // Save the user's message (last message in array)
              const userMessage = messages[messages.length - 1];
              if (userMessage && userMessage.content !== "[INITIAL_GREETING]") {
                await addMessage(sessionId, "user", userMessage.content);
              }

              // Save the assistant's response
              if (fullResponse) {
                await addMessage(sessionId, "assistant", fullResponse);
              }
            } catch (dbError) {
              console.error("Failed to save messages to DB:", dbError);
              // Don't fail the request if DB save fails
            }
          }

          // Send done signal
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          console.error("Streaming error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
