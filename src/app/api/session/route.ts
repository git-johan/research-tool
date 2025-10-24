import { NextRequest } from "next/server";
import { getOrCreateSessionForPersona } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const personaId = searchParams.get("personaId");
    const clientId = searchParams.get("clientId");

    if (!clientId) {
      return new Response("clientId is required", { status: 400 });
    }

    // personaId can be null (for general research chat) or a specific persona ID
    const session = await getOrCreateSessionForPersona(personaId, clientId);

    return Response.json({
      sessionId: session._id,
      messages: session.messages,
    });
  } catch (error) {
    console.error("Failed to get/create session:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
