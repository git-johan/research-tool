// Database and files cleanup script
const { MongoClient } = require('mongodb');
const fs = require('fs/promises');
const path = require('path');
require('dotenv').config();

// Helper function to delete all files in a directory
async function clearDirectory(dirPath) {
  try {
    const files = await fs.readdir(dirPath);
    console.log(`Found ${files.length} files in ${dirPath}`);

    if (files.length === 0) {
      console.log(`Directory ${dirPath} is already empty`);
      return 0;
    }

    let deletedCount = 0;
    for (const file of files) {
      try {
        await fs.unlink(path.join(dirPath, file));
        deletedCount++;
      } catch (error) {
        console.warn(`Failed to delete ${file}:`, error.message);
      }
    }

    console.log(`✅ Deleted ${deletedCount} files from ${dirPath}`);
    return deletedCount;
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log(`Directory ${dirPath} doesn't exist, skipping`);
      return 0;
    }
    console.error(`Error clearing directory ${dirPath}:`, error.message);
    return 0;
  }
}

// Helper function to clear ChromaDB collections
async function clearChromaDB() {
  try {
    const chromaUrl = process.env.CHROMA_URL || 'http://localhost:8000';
    console.log(`Attempting to clear ChromaDB at ${chromaUrl}`);

    // Try to get all collections
    const collectionsResponse = await fetch(`${chromaUrl}/api/v1/collections`);

    if (!collectionsResponse.ok) {
      console.log(`ChromaDB not accessible at ${chromaUrl}, skipping vector cleanup`);
      return 0;
    }

    const collections = await collectionsResponse.json();
    console.log(`Found ${collections.length} ChromaDB collections`);

    if (collections.length === 0) {
      console.log('No ChromaDB collections to delete');
      return 0;
    }

    let deletedCollections = 0;
    for (const collection of collections) {
      try {
        const deleteResponse = await fetch(`${chromaUrl}/api/v1/collections/${collection.name}`, {
          method: 'DELETE'
        });

        if (deleteResponse.ok) {
          deletedCollections++;
          console.log(`✅ Deleted ChromaDB collection: ${collection.name}`);
        } else {
          console.warn(`Failed to delete collection ${collection.name}: ${deleteResponse.status}`);
        }
      } catch (error) {
        console.warn(`Error deleting collection ${collection.name}:`, error.message);
      }
    }

    console.log(`✅ Deleted ${deletedCollections} ChromaDB collections`);
    return deletedCollections;

  } catch (error) {
    console.log('ChromaDB cleanup failed (this is OK if ChromaDB is not running):', error.message);
    return 0;
  }
}

async function clearDatabase() {
  console.log('🧹 CLEARING ALL DATA: Documents + Files + Vectors\n');

  // 1. Clear MongoDB documents
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI not found in environment variables');
    return;
  }

  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    console.log('📁 Connected to MongoDB');

    const db = client.db('research-assistant');

    // Get count before deletion
    const beforeCount = await db.collection('documents').countDocuments();
    console.log(`Found ${beforeCount} documents in database`);

    if (beforeCount > 0) {
      // Delete all documents
      const result = await db.collection('documents').deleteMany({});
      console.log(`✅ Deleted ${result.deletedCount} documents from database`);
    } else {
      console.log('Database is already empty');
    }

  } catch (error) {
    console.error('Error clearing database:', error);
  } finally {
    await client.close();
  }

  // 2. Clear file directories
  console.log('\\n📂 Clearing file directories...');
  const uploadsCleared = await clearDirectory('./files/uploads');
  const downloadsCleared = await clearDirectory('./files/downloads');
  const extractionsCleared = await clearDirectory('./files/extractions');

  // 3. Clear ChromaDB vectors
  console.log('\\n🗂️ Clearing ChromaDB vectors...');
  const vectorsCleared = await clearChromaDB();

  // 4. Summary
  console.log('\\n🎉 Complete cleanup finished!');
  console.log('📊 Summary:');
  console.log(`   Database documents: cleared`);
  console.log(`   Upload files: ${uploadsCleared} deleted`);
  console.log(`   Download files: ${downloadsCleared} deleted`);
  console.log(`   Extraction files: ${extractionsCleared} deleted`);
  console.log(`   Vector collections: ${vectorsCleared} deleted`);
  console.log('\\n✨ Fresh slate ready for testing!');
}

// Only run if called directly
if (require.main === module) {
  clearDatabase();
}

module.exports = { clearDatabase };