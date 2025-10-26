/**
 * Content Type Router
 * Detects content type (PDF vs HTML) and routes to appropriate processor
 */

import { extractPDFFromURL } from './pdf-extractor';
import { processWebContent } from '../scripts/web-content-processor';

export interface UnifiedContent {
  url: string;
  title: string;
  content: string;
  contentType: 'pdf' | 'html';
  metadata: {
    content_type: string;
    topics: string[];
    summary: string;
    key_concepts: string[];
    question_types: string[];
    scraped_at: string;
    word_count: number;
    processing_time_ms: number;
    // PDF-specific metadata
    totalPages?: number;
    author?: string;
    creator?: string;
    producer?: string;
    creationDate?: Date;
    modificationDate?: Date;
  };
}

/**
 * Detect content type by checking URL and HTTP headers
 */
async function detectContentType(url: string): Promise<'pdf' | 'html'> {
  console.log(`🔍 Detecting content type for: ${url}`);

  // First check URL extension
  if (url.toLowerCase().includes('.pdf')) {
    console.log(`📄 Detected PDF from URL extension`);
    return 'pdf';
  }

  // Check HTTP headers to confirm content type
  try {
    const response = await fetch(url, {
      method: 'HEAD', // Only get headers, not content
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
      timeout: 10000, // 10 second timeout for header check
    });

    const contentType = response.headers.get('content-type') || '';
    console.log(`📋 Content-Type header: "${contentType}"`);

    if (contentType.includes('application/pdf')) {
      console.log(`📄 Detected PDF from Content-Type header`);
      return 'pdf';
    }

    if (contentType.includes('text/html') || contentType.includes('text/plain')) {
      console.log(`🌐 Detected HTML from Content-Type header`);
      return 'html';
    }

    // Default to HTML if uncertain
    console.log(`❓ Uncertain content type, defaulting to HTML`);
    return 'html';

  } catch (error) {
    console.warn(`⚠️ Failed to check headers: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.log(`❓ Defaulting to HTML due to header check failure`);
    return 'html';
  }
}

/**
 * Process content using appropriate processor based on content type
 */
export async function processUnifiedContent(url: string): Promise<UnifiedContent> {
  const startTime = Date.now();

  try {
    // Detect content type
    const contentType = await detectContentType(url);

    console.log(`🚀 Processing ${contentType.toUpperCase()} content from: ${url}`);

    if (contentType === 'pdf') {
      // Use PDF processor
      const pdfResult = await extractPDFFromURL(url);

      // Convert PDF result to unified format
      const unifiedResult: UnifiedContent = {
        url,
        title: pdfResult.metadata.title || `PDF Document ${Date.now()}`,
        content: pdfResult.text,
        contentType: 'pdf',
        metadata: {
          content_type: 'research', // Default for PDFs
          topics: [], // Could be enhanced with AI analysis later
          summary: `PDF document with ${pdfResult.totalWordCount} words across ${pdfResult.metadata.totalPages} pages`,
          key_concepts: [],
          question_types: [],
          scraped_at: new Date().toISOString(),
          word_count: pdfResult.totalWordCount,
          processing_time_ms: pdfResult.extractionTime,
          // PDF-specific metadata
          totalPages: pdfResult.metadata.totalPages,
          author: pdfResult.metadata.author,
          creator: pdfResult.metadata.creator,
          producer: pdfResult.metadata.producer,
          creationDate: pdfResult.metadata.creationDate,
          modificationDate: pdfResult.metadata.modificationDate,
        }
      };

      console.log(`✅ PDF processing completed: ${unifiedResult.metadata.word_count} words`);
      return unifiedResult;

    } else {
      // Use HTML processor
      const htmlResult = await processWebContent(url);

      // Convert HTML result to unified format
      const unifiedResult: UnifiedContent = {
        url,
        title: htmlResult.title,
        content: htmlResult.content,
        contentType: 'html',
        metadata: htmlResult.metadata
      };

      console.log(`✅ HTML processing completed: ${unifiedResult.metadata.word_count} words`);
      return unifiedResult;
    }

  } catch (error) {
    const totalTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown processing error';

    console.error(`❌ Unified content processing failed after ${totalTime}ms: ${errorMessage}`);
    throw new Error(`Content processing failed: ${errorMessage}`);
  }
}

/**
 * Enhanced PDF processing with AI analysis
 * This adds GPT-5 analysis to PDF content similar to HTML processing
 */
export async function processUnifiedContentWithAI(url: string): Promise<UnifiedContent> {
  const result = await processUnifiedContent(url);

  // If it's a PDF, we can enhance it with AI analysis
  if (result.contentType === 'pdf') {
    console.log(`🤖 Enhancing PDF with AI analysis...`);

    try {
      // Import AI processor (same as web content processor)
      const { OpenAIConnector } = await import('../../examples/open-ai-connector.example');
      const connector = new OpenAIConnector({ verbose: true });

      const prompt = `Analyze the following PDF content and extract structured metadata. Do not modify the actual content - only analyze it.

URL: ${url}
Title: ${result.title}
Content Type: Academic/Research PDF

Content Preview (first 2000 characters):
${result.content.substring(0, 2000)}

Please respond with a JSON object containing:
{
  "content_type": "research|documentation|report|article|other",
  "topics": ["array", "of", "3-5", "main", "topics"],
  "summary": "2-3 sentence summary of the main points",
  "key_concepts": ["important", "terms", "and", "concepts", "mentioned"],
  "question_types": ["What questions", "could this content", "help answer"]
}

Focus on:
- Accurate content classification for academic/research content
- Meaningful topic extraction from research context
- Concise but informative summary
- Key concepts that would help with search/retrieval
- Types of questions this research could answer

Respond with valid JSON only.`;

      const aiStartTime = Date.now();
      const aiResult = await connector.generateJSON(prompt);
      const aiProcessingTime = Date.now() - aiStartTime;

      // Merge AI analysis with existing metadata
      result.metadata = {
        ...result.metadata,
        content_type: aiResult.content_type || 'research',
        topics: aiResult.topics || [],
        summary: aiResult.summary || result.metadata.summary,
        key_concepts: aiResult.key_concepts || [],
        question_types: aiResult.question_types || [],
        processing_time_ms: result.metadata.processing_time_ms + aiProcessingTime
      };

      console.log(`✅ AI enhancement completed in ${aiProcessingTime}ms`);
      console.log(`   Enhanced content type: ${result.metadata.content_type}`);
      console.log(`   Topics: ${result.metadata.topics.join(', ')}`);

      // Print cost summary
      const costs = connector.getCostSummary();
      console.log(`💰 AI enhancement cost: $${costs.totalCost.toFixed(4)} (${costs.inputTokens} input, ${costs.outputTokens} output tokens)`);

    } catch (aiError) {
      console.warn(`⚠️ AI enhancement failed: ${aiError instanceof Error ? aiError.message : 'Unknown AI error'}`);
      // Continue with basic metadata
    }
  }

  return result;
}

export type { UnifiedContent };