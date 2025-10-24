import { MongoClient, Db } from "mongodb";

if (!process.env.MONGODB_URI) {
  throw new Error("Please add your MONGODB_URI to .env");
}

const uri = process.env.MONGODB_URI;
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === "development") {
  // In development mode, use a global variable to preserve the client across hot reloads
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production mode, create a new client
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db("research-assistant");
}

// Session and message operations
export interface MessageDoc {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  personaId?: string; // For group chats, track which persona sent the message
  personaName?: string; // For displaying in group chats
}

export interface SessionDoc {
  _id: string; // UUID from localStorage
  createdAt: Date;
  isAnonymous: boolean;
  userId: string | null;
  messages: MessageDoc[];
  shareId?: string; // Optional shareable link ID
  isShared?: boolean; // Whether this conversation is shared
  personaId?: string | null; // Associated persona (null for general research chat, "GROUP" for group sessions)
  sessionType?: "individual" | "group"; // Type of session
  clientId?: string; // Browser-specific identifier for isolating conversations
}

export async function getSession(sessionId: string): Promise<SessionDoc | null> {
  const db = await getDb();
  const session = await db.collection<SessionDoc>("sessions").findOne({ _id: sessionId });
  return session;
}

export async function createSession(sessionId: string, personaId?: string | null, clientId?: string): Promise<SessionDoc> {
  const db = await getDb();
  const newSession: SessionDoc = {
    _id: sessionId,
    createdAt: new Date(),
    isAnonymous: true,
    userId: null,
    messages: [],
    personaId: personaId || null,
    clientId: clientId,
  };
  await db.collection<SessionDoc>("sessions").insertOne(newSession);
  return newSession;
}

export async function addMessage(
  sessionId: string,
  role: "user" | "assistant",
  content: string,
  personaId?: string,
  personaName?: string
): Promise<void> {
  const db = await getDb();
  const message: MessageDoc = {
    role,
    content,
    timestamp: new Date(),
    ...(personaId && { personaId }),
    ...(personaName && { personaName }),
  };

  await db.collection<SessionDoc>("sessions").updateOne(
    { _id: sessionId },
    { $push: { messages: message } }
  );
}

export async function clearSessionMessages(sessionId: string): Promise<void> {
  const db = await getDb();
  await db.collection<SessionDoc>("sessions").updateOne(
    { _id: sessionId },
    { $set: { messages: [] } }
  );
}

export async function getOrCreateSession(sessionId: string): Promise<SessionDoc> {
  let session = await getSession(sessionId);
  if (!session) {
    session = await createSession(sessionId);
  }
  return session;
}

export async function getOrCreateSessionForPersona(personaId: string | null, clientId: string): Promise<SessionDoc> {
  const db = await getDb();

  // Look for existing session with this personaId AND clientId (browser-specific)
  const existingSession = await db.collection<SessionDoc>("sessions").findOne({
    personaId: personaId,
    clientId: clientId
  });

  if (existingSession) {
    return existingSession;
  }

  // Create new session for this persona and client
  const newSessionId = crypto.randomUUID();
  return await createSession(newSessionId, personaId, clientId);
}

export async function getOrCreateGroupSession(clientId: string): Promise<SessionDoc> {
  const db = await getDb();

  // Look for existing group session for this client
  const existingSession = await db.collection<SessionDoc>("sessions").findOne({
    personaId: "GROUP",
    sessionType: "group",
    clientId: clientId
  });

  if (existingSession) {
    return existingSession;
  }

  // Create new group session
  const newSessionId = crypto.randomUUID();
  const newSession: SessionDoc = {
    _id: newSessionId,
    createdAt: new Date(),
    isAnonymous: true,
    userId: null,
    messages: [],
    personaId: "GROUP",
    sessionType: "group",
    clientId: clientId,
  };
  await db.collection<SessionDoc>("sessions").insertOne(newSession);
  return newSession;
}

export async function createShareLink(sessionId: string): Promise<string> {
  const db = await getDb();
  const shareId = crypto.randomUUID();

  await db.collection<SessionDoc>("sessions").updateOne(
    { _id: sessionId },
    {
      $set: {
        shareId: shareId,
        isShared: true
      }
    }
  );

  return shareId;
}

export async function getSessionByShareId(shareId: string): Promise<SessionDoc | null> {
  const db = await getDb();
  const session = await db.collection<SessionDoc>("sessions").findOne({ shareId });
  return session;
}

// Persona operations
export interface PersonaDoc {
  _id: string; // UUID
  name: string;
  role: string;
  transcriptData: string;
  color: string; // Hex color for avatar background
  avatarImage?: string; // Base64 encoded image data (optional)
  createdAt: Date;
}

// Generate a random pleasant color for persona avatars
function generatePersonaColor(): string {
  const colors = [
    "#3B82F6", // blue
    "#8B5CF6", // purple
    "#EC4899", // pink
    "#10B981", // green
    "#F59E0B", // amber
    "#EF4444", // red
    "#06B6D4", // cyan
    "#6366F1", // indigo
    "#F97316", // orange
    "#14B8A6", // teal
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

export async function createPersona(
  name: string,
  role: string,
  transcriptData: string,
  color?: string,
  avatarImage?: string
): Promise<PersonaDoc> {
  const db = await getDb();
  const newPersona: PersonaDoc = {
    _id: crypto.randomUUID(),
    name,
    role,
    transcriptData,
    color: color || generatePersonaColor(),
    ...(avatarImage && { avatarImage }),
    createdAt: new Date(),
  };
  await db.collection<PersonaDoc>("personas").insertOne(newPersona);
  return newPersona;
}

export async function getPersonas(): Promise<PersonaDoc[]> {
  const db = await getDb();
  const personas = await db.collection<PersonaDoc>("personas")
    .find({})
    .sort({ createdAt: -1 })
    .toArray();

  // Add fallback color for personas created before color field was added
  return personas.map(p => ({
    ...p,
    color: p.color || generatePersonaColor()
  }));
}

export async function getPersona(personaId: string): Promise<PersonaDoc | null> {
  const db = await getDb();
  const persona = await db.collection<PersonaDoc>("personas").findOne({ _id: personaId });
  if (!persona) return null;

  // Add fallback color for personas created before color field was added
  return {
    ...persona,
    color: persona.color || generatePersonaColor()
  };
}

export async function updatePersona(
  personaId: string,
  name: string,
  role: string,
  transcriptData: string,
  color?: string
): Promise<PersonaDoc | null> {
  const db = await getDb();
  const updateFields: Partial<PersonaDoc> = { name, role, transcriptData };
  if (color) {
    updateFields.color = color;
  }
  const result = await db.collection<PersonaDoc>("personas").findOneAndUpdate(
    { _id: personaId },
    { $set: updateFields },
    { returnDocument: "after" }
  );
  return result || null;
}

export async function deletePersona(personaId: string): Promise<void> {
  const db = await getDb();
  await db.collection<PersonaDoc>("personas").deleteOne({ _id: personaId });
}
