import { MongoClient } from "mongodb";
import * as dotenv from "dotenv";
import * as path from "path";

// Load .env file from the root directory
dotenv.config({ path: path.join(__dirname, "..", ".env") });

// This script updates all personas to have language set to "no"
async function updatePersonasLanguage() {
  if (!process.env.MONGODB_URI) {
    throw new Error("Please add your MONGODB_URI to .env");
  }

  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db("research-assistant");
    const personas = db.collection("personas");

    // Update all personas to have language: "no"
    const result = await personas.updateMany(
      {}, // Empty filter means all documents
      { $set: { language: "no" } }
    );

    console.log(`Updated ${result.modifiedCount} personas to language "no"`);
    console.log(`Matched ${result.matchedCount} personas total`);
  } catch (error) {
    console.error("Error updating personas:", error);
  } finally {
    await client.close();
    console.log("Disconnected from MongoDB");
  }
}

updatePersonasLanguage();
