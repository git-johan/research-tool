import { MongoClient } from "mongodb";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(__dirname, "..", ".env") });

async function inspectDatabase() {
  if (!process.env.MONGODB_URI) {
    throw new Error("Please add your MONGODB_URI to .env");
  }

  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB\n");

    const db = client.db("research-assistant");

    // List all collections
    const collections = await db.listCollections().toArray();
    console.log("📚 Collections:", collections.map(c => c.name).join(", "));
    console.log();

    // Show all personas
    const personas = await db.collection("personas").find({}).toArray();
    console.log(`👥 Personas (${personas.length} total):\n`);

    personas.forEach((persona, index) => {
      console.log(`${index + 1}. ${persona.name}`);
      console.log(`   ID: ${persona._id}`);
      console.log(`   Role: ${persona.role}`);
      console.log(`   Color: ${persona.color}`);
      console.log(`   Language: ${persona.language || 'not set'}`);
      console.log(`   Has Avatar: ${persona.avatarImage ? 'Yes' : 'No'}`);
      console.log(`   Created: ${persona.createdAt}`);
      console.log();
    });

    // Show session count
    const sessionCount = await db.collection("sessions").countDocuments();
    console.log(`💬 Sessions: ${sessionCount} total`);

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await client.close();
    console.log("\n✅ Disconnected from MongoDB");
  }
}

inspectDatabase();
