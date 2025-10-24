import { OpenAIConnector, ChatMessage } from "@/lib/openai-connector";
import { NextRequest } from "next/server";
import { addMessage, getPersona, getPersonas } from "@/lib/db";

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
    const encoder = new TextEncoder();

    // Check if this is a group chat request
    const isGroupChat = selectedPersonaId === "GROUP";

    if (isGroupChat) {
      // GROUP CHAT MODE: Get responses from all personas IN PARALLEL
      const personas = await getPersonas();

      if (personas.length === 0) {
        return new Response("No personas available", { status: 400 });
      }

      const stream = new ReadableStream({
        async start(controller) {
          try {
            // Save the user's message once at the start
            if (sessionId) {
              const userMessage = messages[messages.length - 1];
              if (userMessage && userMessage.content !== "[INITIAL_GREETING]") {
                await addMessage(sessionId, "user", userMessage.content);
              }
            }

            // Track if controller is still open
            let controllerClosed = false;

            // Helper to safely enqueue
            const safeEnqueue = (data: Uint8Array) => {
              if (!controllerClosed) {
                try {
                  controller.enqueue(data);
                } catch (error) {
                  controllerClosed = true;
                  console.log("Controller closed, stopping writes");
                }
              }
            };

            // Send typing_start for all personas immediately
            for (const persona of personas) {
              safeEnqueue(encoder.encode(
                `data: ${JSON.stringify({
                  type: "typing_start",
                  personaId: persona._id,
                  personaName: persona.name,
                  personaColor: persona.color
                })}\n\n`
              ));
            }

            // Send a comment to force the stream to flush (SSE comments start with :)
            safeEnqueue(encoder.encode(': flush\n\n'));

            // Yield to event loop to ensure typing_start events are sent before LLM calls
            await new Promise(resolve => setTimeout(resolve, 0));

            // Create async generators for each persona's stream
            const personaStreams = personas.map(async (persona) => {
              const personaPrompt = `You are roleplaying as ${persona.name}, a ${persona.role}.

Here is the interview transcript and information about this person:

${persona.transcriptData}

IMPORTANT INSTRUCTIONS:
- Respond as ${persona.name} would, based on their perspective, opinions, and experiences shared in the interview
- Use specific quotes and references from the interview when relevant
- Be authentic and conversational - speak in first person as ${persona.name}
- Show their personality, concerns, and way of thinking
- If asked about something not covered in the interview, respond as this person might based on their background and viewpoints
- Remember: you ARE ${persona.name}. Stay in character throughout the conversation.`;

              let personaResponse = "";
              const personaConnector = new OpenAIConnector();

              try {
                // Collect full response from this persona
                for await (const chunk of personaConnector.streamChat(messages, personaPrompt)) {
                  if (controllerClosed) break;
                  personaResponse += chunk;
                }

                // Send typing_stop and full response once complete
                if (personaResponse && !controllerClosed) {
                  safeEnqueue(encoder.encode(
                    `data: ${JSON.stringify({
                      type: "typing_stop",
                      personaId: persona._id
                    })}\n\n`
                  ));

                  safeEnqueue(encoder.encode(
                    `data: ${JSON.stringify({
                      type: "complete_response",
                      personaId: persona._id,
                      personaName: persona.name,
                      personaColor: persona.color,
                      content: personaResponse
                    })}\n\n`
                  ));
                }

                // Save this persona's response to DB
                if (sessionId && personaResponse) {
                  await addMessage(
                    sessionId,
                    "assistant",
                    personaResponse,
                    persona._id,
                    persona.name
                  );
                }
              } catch (error) {
                console.error(`Error streaming ${persona.name}:`, error);
                // Send error event
                safeEnqueue(encoder.encode(
                  `data: ${JSON.stringify({
                    type: "error",
                    personaId: persona._id,
                    personaName: persona.name
                  })}\n\n`
                ));
              }
            });

            // Wait for all persona streams to complete
            await Promise.all(personaStreams);

            // Send done signal
            safeEnqueue(encoder.encode("data: [DONE]\n\n"));
            if (!controllerClosed) {
              controller.close();
            }
          } catch (error) {
            console.error("Group chat streaming error:", error);
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
    }

    // INDIVIDUAL CHAT MODE: Original behavior
    let systemPrompt = SYSTEM_PROMPT;
    if (selectedPersonaId) {
      const persona = await getPersona(selectedPersonaId);
      if (persona) {
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

    let fullResponse = "";
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of connector.streamChat(messages, systemPrompt)) {
            fullResponse += chunk;
            const data = encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`);
            controller.enqueue(data);
          }

          // Save messages to MongoDB
          if (sessionId) {
            try {
              const userMessage = messages[messages.length - 1];
              if (userMessage && userMessage.content !== "[INITIAL_GREETING]") {
                await addMessage(sessionId, "user", userMessage.content);
              }

              if (fullResponse) {
                await addMessage(sessionId, "assistant", fullResponse);
              }
            } catch (dbError) {
              console.error("Failed to save messages to DB:", dbError);
            }
          }

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
