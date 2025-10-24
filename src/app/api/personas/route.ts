import { NextRequest } from "next/server";
import { createPersona, getPersonas, deletePersona } from "@/lib/db";

export async function GET() {
  try {
    const personas = await getPersonas();
    return Response.json({ personas });
  } catch (error) {
    console.error("Failed to fetch personas:", error);
    return new Response("Internal server error", { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, role, transcriptData } = await req.json();

    if (!name || !role || !transcriptData) {
      return new Response("Missing required fields", { status: 400 });
    }

    const persona = await createPersona(name, role, transcriptData);
    return Response.json({ persona });
  } catch (error) {
    console.error("Failed to create persona:", error);
    return new Response("Internal server error", { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const personaId = searchParams.get("personaId");

    if (!personaId) {
      return new Response("Missing personaId", { status: 400 });
    }

    await deletePersona(personaId);
    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to delete persona:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
