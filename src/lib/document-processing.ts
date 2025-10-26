// Generic document processing utilities
// Handles chunking, embeddings, and vector storage for any document type

import OpenAI from "openai";
import { ChromaClient } from "chromadb";
import { Logger, ContextLogger, withTiming } from "./logger";
import fs from "fs/promises";

// Configuration constants
const CHUNK_SIZE_WORDS = 500;
const CHUNK_OVERLAP_WORDS = 50;
const OPENAI_EMBEDDING_MODEL = "text-embedding-3-large";
const OPENAI_MAX_RETRIES = 3;
const OPENAI_RETRY_DELAY_BASE_MS = 1000;

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Document chunk interface
export interface DocumentChunk {
  id: string; // Format: documentId:chunkIndex
  documentId: string;
  chunkIndex: number;
  text: string;
  wordCount: number;
  startPosition: number;
  endPosition: number;
  embedding?: number[];
  metadata: {
    filename: string;
    chunkPreview: string; // First 100 chars for display
  };
}

// Processing result interface
export interface ProcessingResult {
  success: boolean;
  documentId: string;
  chunksCreated: number;
  chunksEmbedded: number;
  totalProcessingTime: number;
  error?: string;
}

/**
 * Smart text chunking that respects sentence boundaries
 * @param text - The text to chunk
 * @param maxWords - Maximum words per chunk
 * @param overlapWords - Words to overlap between chunks
 * @returns Array of text chunks with metadata
 */
export function chunkText(
  text: string,
  maxWords: number = CHUNK_SIZE_WORDS,
  overlapWords: number = CHUNK_OVERLAP_WORDS
): { text: string; startPos: number; endPos: number; wordCount: number }[] {
  // Split text into sentences (basic approach)
  const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
  const chunks: { text: string; startPos: number; endPos: number; wordCount: number }[] = [];

  let currentChunk = "";
  let currentWordCount = 0;
  let chunkStartPos = 0;
  let sentenceStartPos = 0;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const sentenceWords = sentence.split(/\s+/).filter(w => w.length > 0).length;

    // Check if adding this sentence would exceed the chunk size
    if (currentWordCount + sentenceWords > maxWords && currentChunk.length > 0) {
      // Save current chunk
      const chunkEndPos = sentenceStartPos - 1;
      chunks.push({
        text: currentChunk.trim(),
        startPos: chunkStartPos,
        endPos: chunkEndPos,
        wordCount: currentWordCount
      });

      // Start new chunk with overlap
      const overlapText = extractOverlapText(currentChunk, overlapWords);
      currentChunk = overlapText + (overlapText ? " " : "") + sentence;
      currentWordCount = countWords(currentChunk);
      chunkStartPos = Math.max(0, chunkEndPos - overlapText.length);
    } else {
      // Add sentence to current chunk
      currentChunk += (currentChunk ? " " : "") + sentence;
      currentWordCount += sentenceWords;
    }

    sentenceStartPos += sentence.length + 1; // +1 for space
  }

  // Add final chunk if it has content
  if (currentChunk.trim().length > 0) {
    chunks.push({
      text: currentChunk.trim(),
      startPos: chunkStartPos,
      endPos: text.length,
      wordCount: currentWordCount
    });
  }

  // Handle edge case: if no chunks created (very short text), create one chunk
  if (chunks.length === 0 && text.trim().length > 0) {
    chunks.push({
      text: text.trim(),
      startPos: 0,
      endPos: text.length,
      wordCount: countWords(text)
    });
  }

  return chunks;
}

/**
 * Extract overlap text from the end of a chunk
 */
function extractOverlapText(text: string, overlapWords: number): string {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  if (words.length <= overlapWords) return text;

  return words.slice(-overlapWords).join(" ");
}

/**
 * Count words in text
 */
function countWords(text: string): number {
  return text.split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * Generate embeddings for text using OpenAI with retry logic
 * @param texts - Array of text strings to embed
 * @param logger - Logger instance for tracking
 * @returns Array of embedding vectors
 */
export async function generateEmbeddings(
  texts: string[],
  logger: ContextLogger
): Promise<number[][]> {
  const embeddings: number[][] = [];

  // Process in batches to respect API limits
  const batchSize = 100; // OpenAI allows up to 2048 inputs per request

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);

    const batchEmbeddings = await withTiming(
      async () => await generateEmbeddingsBatch(batch, logger),
      logger,
      `generate embeddings batch ${i / batchSize + 1}`
    );

    embeddings.push(...batchEmbeddings);
  }

  return embeddings;
}

/**
 * Generate embeddings for a batch of texts with retry logic
 */
async function generateEmbeddingsBatch(
  texts: string[],
  logger: ContextLogger
): Promise<number[][]> {
  for (let attempt = 1; attempt <= OPENAI_MAX_RETRIES; attempt++) {
    try {
      logger.debug(`Generating embeddings for ${texts.length} texts (attempt ${attempt})`);

      const response = await openai.embeddings.create({
        model: OPENAI_EMBEDDING_MODEL,
        input: texts,
        encoding_format: "float"
      });

      if (!response.data || response.data.length !== texts.length) {
        throw new Error(`Unexpected response format: expected ${texts.length} embeddings, got ${response.data?.length || 0}`);
      }

      const embeddings = response.data.map(item => item.embedding);
      logger.debug(`Successfully generated ${embeddings.length} embeddings`);

      return embeddings;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (attempt === OPENAI_MAX_RETRIES) {
        logger.error(`Failed to generate embeddings after ${OPENAI_MAX_RETRIES} attempts: ${errorMessage}`);
        throw new Error(`Embedding generation failed: ${errorMessage}`);
      }

      const delayMs = OPENAI_RETRY_DELAY_BASE_MS * Math.pow(2, attempt - 1);
      logger.warn(`Embedding attempt ${attempt} failed, retrying in ${delayMs}ms: ${errorMessage}`);

      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  throw new Error("This should never be reached");
}

/**
 * Initialize Chroma DB collection for document chunks with manual embeddings
 * @param collectionName - Name of the collection
 * @returns Chroma collection instance
 */
export async function initializeChromaCollection(collectionName: string = "document_chunks") {
  try {
    // Initialize ChromaClient
    const chroma = new ChromaClient();

    // Try to get existing collection first (without embedding function for manual embeddings)
    let collection;
    try {
      collection = await chroma.getCollection({
        name: collectionName
      });
    } catch (error) {
      // Collection doesn't exist, create it (without embedding function for manual embeddings)
      collection = await chroma.createCollection({
        name: collectionName,
        metadata: { description: "Document chunks with manually provided OpenAI embeddings for semantic search" }
      });
    }

    return collection;
  } catch (error) {
    throw new Error(`Failed to initialize Chroma collection: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Store document chunks in Chroma DB with manually generated embeddings
 * @param chunks - Array of document chunks with pre-generated embeddings
 * @param logger - Logger instance
 */
export async function storeChunksInChroma(
  chunks: DocumentChunk[],
  logger: ContextLogger
): Promise<void> {
  const collection = await initializeChromaCollection();

  // Generate embeddings manually using our working OpenAI client
  const texts = chunks.map(chunk => chunk.text);
  const embeddings = await generateEmbeddings(texts, logger);

  // Prepare data for Chroma with manually provided embeddings
  const ids = chunks.map(chunk => chunk.id);
  const metadatas = chunks.map(chunk => ({
    documentId: chunk.documentId,
    chunkIndex: chunk.chunkIndex,
    filename: chunk.metadata.filename,
    wordCount: chunk.wordCount,
    startPosition: chunk.startPosition,
    endPosition: chunk.endPosition,
    chunkPreview: chunk.metadata.chunkPreview
  }));
  const documents = chunks.map(chunk => chunk.text);

  await withTiming(
    async () => {
      await collection.upsert({
        ids,
        metadatas,
        documents,
        embeddings // manually provided embeddings using our working OpenAI client
      });
    },
    logger,
    `store ${chunks.length} chunks in Chroma`
  );

  logger.info(`Successfully stored ${chunks.length} chunks in Chroma DB with manual embeddings`);
}

/**
 * Process a document: read file, chunk, embed, and store
 * @param documentId - Document ID from database
 * @param filePath - Path to the document file
 * @param filename - Original filename
 * @param logger - Logger instance
 * @returns Processing result
 */
export async function processDocument(
  documentId: string,
  filePath: string,
  filename: string,
  logger: ContextLogger
): Promise<ProcessingResult> {
  const startTime = Date.now();

  try {
    logger.info(`Starting document processing`, {
      metadata: { documentId, filename, filePath }
    });

    // Read file content
    const fileContent = await withTiming(
      async () => await fs.readFile(filePath, 'utf8'),
      logger,
      "read file content"
    );

    // Chunk the text
    const textChunks = await withTiming(
      async () => chunkText(fileContent),
      logger,
      "chunk text"
    );

    logger.info(`Created ${textChunks.length} chunks from document`);

    if (textChunks.length === 0) {
      throw new Error("No chunks created from document - file may be empty or invalid");
    }

    // Create DocumentChunk objects (no need for embeddings, ChromaDB will generate them)
    const documentChunks: DocumentChunk[] = textChunks.map((chunk, index) => ({
      id: `${documentId}:${index}`,
      documentId,
      chunkIndex: index,
      text: chunk.text,
      wordCount: chunk.wordCount,
      startPosition: chunk.startPos,
      endPosition: chunk.endPos,
      metadata: {
        filename,
        chunkPreview: chunk.text.substring(0, 100)
      }
    }));

    // Store in Chroma DB (ChromaDB will auto-generate embeddings using OpenAI)
    await storeChunksInChroma(documentChunks, logger);

    const totalTime = Date.now() - startTime;

    logger.info(`Document processing completed successfully`, {
      metadata: {
        documentId,
        chunksCreated: documentChunks.length,
        processingTime: totalTime
      }
    });

    return {
      success: true,
      documentId,
      chunksCreated: documentChunks.length,
      chunksEmbedded: documentChunks.length, // ChromaDB embedded all chunks
      totalProcessingTime: totalTime
    };

  } catch (error) {
    const totalTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error(`Document processing failed: ${errorMessage}`, {
      metadata: { documentId, filename, processingTime: totalTime }
    });

    return {
      success: false,
      documentId,
      chunksCreated: 0,
      chunksEmbedded: 0,
      totalProcessingTime: totalTime,
      error: errorMessage
    };
  }
}

/**
 * Process and store document from already-read content (used by processing endpoint)
 * @param documentId - Document ID from database
 * @param fileContent - Already-read file content
 * @param filename - Original filename
 * @param logger - Logger instance
 * @returns Processing result with chunkCount
 */
export async function processAndStoreDocument(
  documentId: string,
  fileContent: string,
  filename: string,
  logger: ContextLogger
): Promise<{ chunkCount: number }> {
  const startTime = Date.now();

  try {
    logger.info(`Starting document processing from content`, {
      metadata: { documentId, filename, contentLength: fileContent.length }
    });

    // Chunk the text
    const textChunks = await withTiming(
      async () => chunkText(fileContent),
      logger,
      "chunk text"
    );

    logger.info(`Created ${textChunks.length} chunks from document`);

    if (textChunks.length === 0) {
      throw new Error("No chunks created from document - content may be empty or invalid");
    }

    // Create DocumentChunk objects
    const documentChunks: DocumentChunk[] = textChunks.map((chunk, index) => ({
      id: `${documentId}:${index}`,
      documentId,
      chunkIndex: index,
      text: chunk.text,
      wordCount: chunk.wordCount,
      startPosition: chunk.startPos,
      endPosition: chunk.endPos,
      metadata: {
        filename,
        chunkPreview: chunk.text.substring(0, 100)
      }
    }));

    // Store in Chroma DB with manual embeddings
    await storeChunksInChroma(documentChunks, logger);

    const totalTime = Date.now() - startTime;

    logger.info(`Document processing completed successfully`, {
      metadata: {
        documentId,
        chunksCreated: documentChunks.length,
        processingTime: totalTime
      }
    });

    return {
      chunkCount: documentChunks.length
    };

  } catch (error) {
    const totalTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error(`Document processing failed: ${errorMessage}`, {
      metadata: { documentId, filename, processingTime: totalTime }
    });

    throw new Error(errorMessage);
  }
}

/**
 * Search for similar chunks in Chroma DB using manual embeddings
 * @param queryText - Text to search for
 * @param nResults - Number of results to return
 * @param logger - Logger instance
 * @returns Search results with chunks and similarity scores
 */
export async function searchDocumentChunks(
  queryText: string,
  nResults: number = 5,
  logger?: ContextLogger
): Promise<{
  chunks: DocumentChunk[];
  distances: number[];
}> {
  const collection = await initializeChromaCollection();

  // Generate query embedding manually using our working OpenAI client
  const queryEmbeddings = await generateEmbeddings([queryText], logger || Logger.withContext({ component: "search-embeddings" }));

  // Search in Chroma using manually generated query embedding
  const results = await collection.query({
    queryEmbeddings: queryEmbeddings, // Use manually generated query embedding
    nResults,
    include: ["documents", "metadatas", "distances"]
  });

  // Convert results back to DocumentChunk format
  const chunks: DocumentChunk[] = [];
  const distances = results.distances?.[0] || [];

  if (results.documents?.[0] && results.metadatas?.[0]) {
    for (let i = 0; i < results.documents[0].length; i++) {
      const metadata = results.metadatas[0][i] as any;
      chunks.push({
        id: `${metadata.documentId}:${metadata.chunkIndex}`,
        documentId: metadata.documentId,
        chunkIndex: metadata.chunkIndex,
        text: results.documents[0][i],
        wordCount: metadata.wordCount,
        startPosition: metadata.startPosition,
        endPosition: metadata.endPosition,
        metadata: {
          filename: metadata.filename,
          chunkPreview: metadata.chunkPreview
        }
      });
    }
  }

  return { chunks, distances };
}