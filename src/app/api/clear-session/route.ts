import { NextRequest } from "next/server";
import { clearSessionMessages } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return new Response("sessionId is required", { status: 400 });
    }

    await clearSessionMessages(sessionId);

    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to clear session messages:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
