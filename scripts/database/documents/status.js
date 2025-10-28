// Document-focused status check script
const { MongoClient } = require('mongodb');
const fs = require('fs/promises');
const path = require('path');
require('dotenv').config();

// Helper function to get file stats
async function getFileStats(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return {
      exists: true,
      size: stats.size,
      sizeKB: Math.round(stats.size / 1024),
      sizeMB: Math.round(stats.size / (1024 * 1024)),
      created: stats.birthtime,
      modified: stats.mtime
    };
  } catch (error) {
    return {
      exists: false,
      error: error.code === 'ENOENT' ? 'File not found' : error.message
    };
  }
}

// Helper function to check extraction file
async function getExtractionStats(fileId) {
  const extractionPath = `./files/extractions/${fileId}.json`;
  const fileStats = await getFileStats(extractionPath);

  if (fileStats.exists) {
    try {
      const content = await fs.readFile(extractionPath, 'utf-8');
      const extractionData = JSON.parse(content);
      return {
        exists: true,
        path: extractionPath,
        size: fileStats.size,
        sizeKB: fileStats.sizeKB,
        extractedAt: extractionData.extractedAt,
        wordCount: extractionData.metadata?.wordCount || 0,
        extractionTime: extractionData.extractionTime || 0
      };
    } catch (error) {
      return {
        exists: true,
        path: extractionPath,
        size: fileStats.size,
        error: 'Invalid JSON: ' + error.message
      };
    }
  }

  return { exists: false };
}

// Helper function to check ChromaDB collections
async function getChromaDBCollections() {
  try {
    const chromaUrl = process.env.CHROMA_URL || 'http://localhost:8000';
    const collectionsResponse = await fetch(`${chromaUrl}/api/v1/collections`, {
      signal: AbortSignal.timeout(3000)
    });

    if (!collectionsResponse.ok) {
      return { running: false, collections: [] };
    }

    const collections = await collectionsResponse.json();
    const collectionStats = [];

    for (const collection of collections) {
      try {
        const countResponse = await fetch(`${chromaUrl}/api/v1/collections/${collection.name}/count`);
        let count = 0;
        if (countResponse.ok) {
          const countData = await countResponse.json();
          count = countData.count || 0;
        }

        collectionStats.push({
          name: collection.name,
          id: collection.id,
          count: count
        });
      } catch (error) {
        collectionStats.push({
          name: collection.name,
          id: collection.id,
          count: 'error'
        });
      }
    }

    return { running: true, collections: collectionStats };
  } catch (error) {
    return { running: false, collections: [] };
  }
}

async function getDocumentStatus() {
  console.log('📋 DOCUMENT STATUS REPORT');
  console.log('='.repeat(60));
  console.log(`Generated: ${new Date().toISOString()}\\n`);

  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI not found in environment variables');
    return;
  }

  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    const db = client.db('research-assistant');

    // Get all documents with full details
    const documents = await db.collection('documents')
      .find({})
      .sort({ uploadedAt: -1, downloadedAt: -1, createdAt: -1 })
      .toArray();

    console.log(`📄 DOCUMENTS: ${documents.length} total\\n`);

    if (documents.length === 0) {
      console.log('No documents found in database.');
      console.log('Upload files using: curl -X POST http://localhost:8080/api/files/upload');
      return;
    }

    // Group by status
    const statusGroups = {};
    documents.forEach(doc => {
      const status = doc.status || 'unknown';
      if (!statusGroups[status]) statusGroups[status] = [];
      statusGroups[status].push(doc);
    });

    // Show status summary
    console.log('📊 STATUS SUMMARY:');
    Object.entries(statusGroups).forEach(([status, docs]) => {
      console.log(`   ${status}: ${docs.length} documents`);
    });
    console.log('');

    // Get ChromaDB info
    const chromaInfo = await getChromaDBCollections();

    // Show detailed document information
    console.log('📋 DETAILED DOCUMENT LIST:');
    console.log('-'.repeat(60));

    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];

      // Basic document info
      console.log(`${i + 1}. 📄 ${doc.filename}`);
      console.log(`   ID: ${doc._id}`);
      console.log(`   File Path: ${doc.originalPath || 'unknown'}`);
      console.log(`   Status: ${doc.status || 'unknown'}`);
      console.log(`   Source: ${doc.sourceType || 'unknown'}`);
      console.log(`   Size: ${Math.round(doc.fileSizeBytes / 1024)}KB`);
      console.log(`   Content Type: ${doc.mimeType || 'unknown'}`);

      // Timestamps
      if (doc.uploadedAt) {
        console.log(`   Uploaded: ${doc.uploadedAt.toISOString()}`);
      }
      if (doc.downloadedAt) {
        console.log(`   Downloaded: ${doc.downloadedAt.toISOString()}`);
      }
      if (doc.createdAt) {
        console.log(`   Created: ${doc.createdAt.toISOString()}`);
      }

      // File existence check
      const fileStats = await getFileStats(doc.originalPath);
      console.log(`   File Exists: ${fileStats.exists ? '✅' : '❌'}`);
      if (!fileStats.exists) {
        console.log(`   File Error: ${fileStats.error}`);
      }

      // Extraction status
      const extractionStats = await getExtractionStats(doc._id);
      console.log(`   Extraction: ${extractionStats.exists ? '✅' : '❌'}`);
      if (extractionStats.exists) {
        console.log(`   Extracted: ${extractionStats.extractedAt}`);
        console.log(`   Word Count: ${extractionStats.wordCount}`);
        console.log(`   Extraction Time: ${extractionStats.extractionTime}ms`);
      }

      // ChromaDB status (check if document ID appears in any collection)
      let inChroma = false;
      if (chromaInfo.running) {
        // This is a simplified check - in reality you'd need to query each collection
        inChroma = chromaInfo.collections.some(c => c.count > 0);
      }
      console.log(`   Vector DB: ${inChroma ? '✅' : '❌'} ${chromaInfo.running ? '' : '(ChromaDB not running)'}`);

      // Content hash for duplicate detection
      if (doc.contentHash) {
        console.log(`   Content Hash: ${doc.contentHash.substring(0, 12)}...`);
      }

      console.log('');
    }

    // Show failed documents section
    const failedDocuments = documents.filter(doc => doc.status === 'failed');
    if (failedDocuments.length > 0) {
      console.log('\\n❌ FAILED DOCUMENTS (Need Re-upload):');
      console.log('-'.repeat(60));
      failedDocuments.forEach((doc, index) => {
        console.log(`${index + 1}. 📄 ${doc.filename}`);
        console.log(`   ID: ${doc._id}`);
        console.log(`   File Path: ${doc.originalPath}`);
        console.log(`   Size: ${Math.round(doc.fileSizeBytes / 1024)}KB`);
        console.log(`   Failed: ${doc.uploadedAt ? doc.uploadedAt.toISOString() : 'unknown'}`);

        // Extract useful filename parts from the path
        const pathParts = (doc.originalPath || '').split('/');
        const storedFilename = pathParts[pathParts.length - 1] || '';

        // Try to extract original filename pattern: timestamp_random_originalname
        const filenameParts = storedFilename.split('_');
        let suggestedOriginal = storedFilename;
        if (filenameParts.length >= 3) {
          // Remove timestamp and random parts, keep the rest
          suggestedOriginal = filenameParts.slice(2).join('_');
        }

        console.log(`   Suggested Original: ${suggestedOriginal}`);
        console.log(`   Re-upload Command: curl -X POST http://localhost:8080/api/files/upload -F "files=@/path/to/${suggestedOriginal}" -F "clientId=test-client"`);
        console.log('');
      });
    }

    // Show pipeline actions
    console.log('\\n🔄 AVAILABLE ACTIONS:');
    console.log('-'.repeat(60));

    // Documents ready for extraction
    const readyForExtraction = documents.filter(doc => doc.status === 'imported');
    if (readyForExtraction.length > 0) {
      console.log(`\\n📤 READY FOR EXTRACTION (${readyForExtraction.length} documents):`);
      readyForExtraction.slice(0, 5).forEach((doc, index) => {
        console.log(`${index + 1}. curl -X POST http://localhost:8080/api/extract/${doc._id}`);
        console.log(`   (${doc.filename} - ${Math.round(doc.fileSizeBytes / 1024)}KB)`);
      });
      if (readyForExtraction.length > 5) {
        console.log(`   ... and ${readyForExtraction.length - 5} more`);
      }
    }

    // Documents ready for formatting (future)
    const readyForFormatting = documents.filter(doc => doc.status === 'extracted');
    if (readyForFormatting.length > 0) {
      console.log(`\\n📝 READY FOR FORMATTING (${readyForFormatting.length} documents):`);
      readyForFormatting.slice(0, 3).forEach((doc, index) => {
        console.log(`${index + 1}. Future: curl -X POST http://localhost:8080/api/format/${doc._id}`);
        console.log(`   (${doc.filename})`);
      });
    }

    // Documents ready for indexing (future)
    const readyForIndexing = documents.filter(doc => doc.status === 'formatted');
    if (readyForIndexing.length > 0) {
      console.log(`\\n🗂️ READY FOR INDEXING (${readyForIndexing.length} documents):`);
      readyForIndexing.slice(0, 3).forEach((doc, index) => {
        console.log(`${index + 1}. Future: curl -X POST http://localhost:8080/api/index/${doc._id}`);
        console.log(`   (${doc.filename})`);
      });
    }

    // ChromaDB status
    console.log(`\\n🗂️ CHROMADB STATUS:`);
    if (chromaInfo.running) {
      console.log(`✅ Running with ${chromaInfo.collections.length} collections`);
      chromaInfo.collections.forEach(collection => {
        console.log(`   📄 ${collection.name}: ${collection.count} vectors`);
      });
    } else {
      console.log('❌ Not running');
    }

  } catch (error) {
    console.error('Error checking document status:', error);
  } finally {
    await client.close();
  }

  console.log('\\n✨ Status report complete!');
}

// Only run if called directly
if (require.main === module) {
  getDocumentStatus();
}

module.exports = { getDocumentStatus };