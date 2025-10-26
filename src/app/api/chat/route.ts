import { OpenAIConnector, ChatMessage } from "@/lib/openai-connector";
import { NextRequest } from "next/server";
import { addMessage, getPersona, getPersonas } from "@/lib/db";
import pLimit from "p-limit";

// Configuration for concurrency control and error handling
const MAX_CONCURRENT_PERSONAS = 10;
const MAX_PERSONA_RETRIES = 2;
const PERSONA_TIMEOUT_MS = 60000; // 60 seconds
const RETRY_DELAY_BASE_MS = 1000; // Base delay for exponential backoff

// Enhanced persona processing with retry logic and timeout handling
async function processPersonaWithRetries(
  persona: any,
  messages: any[],
  sessionId: string | undefined,
  encoder: TextEncoder,
  safeEnqueue: (data: Uint8Array) => void,
  controllerClosed: () => boolean
): Promise<{ success: boolean; error?: string }> {
  const languageInstruction = persona.language ? `\n- IMPORTANT: Respond in ${persona.language.toUpperCase()}. All of your responses must be in ${persona.language.toUpperCase()}.` : "";
  const personaPrompt = `You are roleplaying as ${persona.name}, a ${persona.role}.

Here is the interview transcript and information about this person:

${persona.transcriptData}

IMPORTANT INSTRUCTIONS:
- Respond as ${persona.name} would, based on their perspective, opinions, and experiences shared in the interview
- Use specific quotes and references from the interview when relevant
- Be authentic and conversational - speak in first person as ${persona.name}
- Show their personality, concerns, and way of thinking
- If asked about something not covered in the interview, respond as this person might based on their background and viewpoints
- Remember: you ARE ${persona.name}. Stay in character throughout the conversation.${languageInstruction}

IMPORTANT FOR GROUP CHAT: This is a group conversation with multiple personas responding. Keep your response concise but natural - vary between 1-8 sentences based on what feels right for your personality and the question. Some responses should be quick reactions, others might need slightly more detail. Focus on your unique perspective and speak in your authentic voice. Be conversational and dynamic.`;

  for (let attempt = 0; attempt <= MAX_PERSONA_RETRIES; attempt++) {
    if (controllerClosed()) break;

    try {
      console.log(`Processing ${persona.name} (attempt ${attempt + 1}/${MAX_PERSONA_RETRIES + 1})`);

      let personaResponse = "";
      const personaConnector = new OpenAIConnector();

      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Timeout after ${PERSONA_TIMEOUT_MS}ms`)), PERSONA_TIMEOUT_MS);
      });

      // Create the streaming promise
      const streamingPromise = (async () => {
        for await (const chunk of personaConnector.streamChat(messages, personaPrompt)) {
          if (controllerClosed()) break;
          personaResponse += chunk;
        }
        return personaResponse;
      })();

      // Race between streaming and timeout
      await Promise.race([streamingPromise, timeoutPromise]);

      // If we got here, streaming succeeded
      if (personaResponse && !controllerClosed()) {
        // Send typing_stop and full response once complete
        safeEnqueue(encoder.encode(
          `event: typing_stop\ndata: ${JSON.stringify({
            personaId: persona._id
          })}\n\n`
        ));

        safeEnqueue(encoder.encode(
          `event: complete_response\ndata: ${JSON.stringify({
            personaId: persona._id,
            personaName: persona.name,
            personaColor: persona.color,
            personaAvatarImage: persona.avatarImage,
            content: personaResponse
          })}\n\n`
        ));

        // Save to database
        if (sessionId && personaResponse) {
          await addMessage(
            sessionId,
            "assistant",
            personaResponse,
            persona._id,
            persona.name
          );
        }

        console.log(`${persona.name} completed successfully on attempt ${attempt + 1}`);
        return { success: true };
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`${persona.name} failed on attempt ${attempt + 1}:`, errorMessage);

      // If this is the last attempt, send error event
      if (attempt === MAX_PERSONA_RETRIES) {
        safeEnqueue(encoder.encode(
          `event: error\ndata: ${JSON.stringify({
            personaId: persona._id,
            personaName: persona.name,
            error: errorMessage,
            finalAttempt: true
          })}\n\n`
        ));

        return { success: false, error: errorMessage };
      }

      // Wait before retrying (exponential backoff)
      const delayMs = RETRY_DELAY_BASE_MS * Math.pow(2, attempt);
      console.log(`Retrying ${persona.name} in ${delayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return { success: false, error: "Max retries exceeded" };
}

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
            const groupChatStartTime = Date.now();
            console.log(`🚀 Starting group chat with ${personas.length} personas (Session: ${sessionId})`);

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

            // Helper to check if controller is closed
            const isControllerClosed = () => controllerClosed;

            // Send typing_start events with small delays to prevent race condition
            for (let i = 0; i < personas.length; i++) {
              const persona = personas[i];
              setTimeout(() => {
                if (!controllerClosed) {
                  safeEnqueue(encoder.encode(
                    `event: typing_start\ndata: ${JSON.stringify({
                      personaId: persona._id,
                      personaName: persona.name,
                      personaColor: persona.color,
                      personaAvatarImage: persona.avatarImage
                    })}\n\n`
                  ));
                }
              }, i * 10); // 10ms delay between each typing_start event
            }

            // Send a comment to force the stream to flush (SSE comments start with :)
            safeEnqueue(encoder.encode(': flush\n\n'));

            // Setup heartbeat to keep connection alive during long processing
            const heartbeatInterval = setInterval(() => {
              if (!controllerClosed) {
                safeEnqueue(encoder.encode(': heartbeat\n\n'));
                // console.log('📡 Sent heartbeat to keep SSE connection alive'); // Disabled to reduce log spam
              } else {
                clearInterval(heartbeatInterval);
              }
            }, 10000); // Every 10 seconds

            // Yield to event loop to ensure typing_start events are sent before LLM calls
            await new Promise(resolve => setTimeout(resolve, 0));

            // Create a concurrency limiter for persona responses
            const limit = pLimit(MAX_CONCURRENT_PERSONAS);

            // Create async generators for each persona with enhanced error handling and retries
            const personaStreams = personas.map((persona) => limit(async () => {
              return await processPersonaWithRetries(
                persona,
                messages,
                sessionId,
                encoder,
                safeEnqueue,
                isControllerClosed
              );
            }));

            // Wait for all persona streams to complete with enhanced error handling
            const results = await Promise.allSettled(personaStreams);

            // Process results and provide detailed logging
            let successCount = 0;
            let failureCount = 0;
            const failedPersonas: string[] = [];

            results.forEach((result, index) => {
              const persona = personas[index];

              if (result.status === 'fulfilled') {
                const processResult = result.value;
                if (processResult.success) {
                  successCount++;
                  console.log(`✓ ${persona.name} responded successfully`);
                } else {
                  failureCount++;
                  failedPersonas.push(`${persona.name} (${processResult.error})`);
                  console.error(`✗ ${persona.name} failed after retries: ${processResult.error}`);
                }
              } else {
                failureCount++;
                failedPersonas.push(`${persona.name} (Promise rejected: ${result.reason})`);
                console.error(`✗ ${persona.name} promise rejected:`, result.reason);
              }
            });

            // Calculate performance metrics
            const totalDuration = Date.now() - groupChatStartTime;
            const avgResponseTimePerPersona = Math.round(totalDuration / personas.length);

            // Send comprehensive completion summary
            const completionSummary = {
              total: personas.length,
              successful: successCount,
              failed: failureCount,
              failedPersonas: failedPersonas,
              duration: totalDuration,
              avgResponseTime: avgResponseTimePerPersona
            };

            console.log(`🏁 Group chat completed in ${totalDuration}ms: ${successCount}/${personas.length} personas responded successfully (avg: ${avgResponseTimePerPersona}ms per persona)`);
            if (failureCount > 0) {
              console.warn(`⚠️ Failed personas: ${failedPersonas.join(', ')}`);
            }

            // Send completion stats as SSE event for client-side monitoring
            safeEnqueue(encoder.encode(
              `event: completion_stats\ndata: ${JSON.stringify({
                stats: completionSummary
              })}\n\n`
            ));

            // Clean up heartbeat timer
            clearInterval(heartbeatInterval);

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
        const languageInstruction = persona.language ? `\n- IMPORTANT: Respond in ${persona.language.toUpperCase()}. All of your responses must be in ${persona.language.toUpperCase()}.` : "";
        systemPrompt = `You are roleplaying as ${persona.name}, a ${persona.role}.

Here is the interview transcript and information about this person:

${persona.transcriptData}

IMPORTANT INSTRUCTIONS:
- Respond as ${persona.name} would, based on their perspective, opinions, and experiences shared in the interview
- Use specific quotes and references from the interview when relevant
- Be authentic and conversational - speak in first person as ${persona.name}
- Show their personality, concerns, and way of thinking
- If asked about something not covered in the interview, respond as this person might based on their background and viewpoints
- Remember: you ARE ${persona.name}. Stay in character throughout the conversation.${languageInstruction}`;
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
                // Get persona info to save with the message for consistent shared view styling
                const persona = selectedPersonaId ? await getPersona(selectedPersonaId) : null;
                await addMessage(
                  sessionId,
                  "assistant",
                  fullResponse,
                  selectedPersonaId || undefined,
                  persona?.name
                );
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
