import { NextRequest, NextResponse } from "next/server";
import { createShareLink, getSessionByShareId } from "@/lib/db";

// POST - Create a shareable link
export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    const shareId = await createShareLink(sessionId);
    const shareUrl = `${request.nextUrl.origin}/shared/${shareId}`;

    return NextResponse.json({ shareId, shareUrl });
  } catch (error) {
    console.error("Error creating share link:", error);
    return NextResponse.json({ error: "Failed to create share link" }, { status: 500 });
  }
}

// GET - Get shared conversation by shareId
export async function GET(request: NextRequest) {
  try {
    const shareId = request.nextUrl.searchParams.get("shareId");

    if (!shareId) {
      return NextResponse.json({ error: "shareId is required" }, { status: 400 });
    }

    const session = await getSessionByShareId(shareId);

    if (!session) {
      return NextResponse.json({ error: "Shared conversation not found" }, { status: 404 });
    }

    return NextResponse.json({ messages: session.messages });
  } catch (error) {
    console.error("Error fetching shared conversation:", error);
    return NextResponse.json({ error: "Failed to fetch shared conversation" }, { status: 500 });
  }
}
