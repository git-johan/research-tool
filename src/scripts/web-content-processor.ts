/**
 * Web Content Processor
 * Fetches web pages, extracts main content, and processes with GPT-5
 * Outputs structured JSON data ready for storage and embedding
 */

import * as dotenv from 'dotenv';
import { OpenAIConnector } from '../../examples/open-ai-connector.example';

dotenv.config();

interface ProcessedWebContent {
  url: string;
  title: string;
  content: string;
  metadata: {
    content_type: string;
    topics: string[];
    summary: string;
    key_concepts: string[];
    question_types: string[];
    scraped_at: string;
    word_count: number;
    processing_time_ms: number;
  };
}

/**
 * Fetch HTML from URL with robust error handling
 */
async function fetchHtml(url: string): Promise<string> {
  console.log(`🌐 Fetching HTML from: ${url}`);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      timeout: 30000, // 30 second timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    console.log(`✅ Fetched ${html.length} characters`);
    return html;
  } catch (error: any) {
    console.error(`❌ Failed to fetch HTML: ${error.message}`);
    throw error;
  }
}

/**
 * Extract main content from HTML and clean it up
 * Removes navigation, ads, sidebars, footers while preserving article content
 */
function extractMainContent(html: string, url: string): { title: string; content: string } {
  console.log('🧹 Extracting and cleaning main content...');

  // Extract title from various sources
  let title = '';

  // Try Open Graph title first
  const ogTitleMatch = html.match(/<meta[^>]*property=["\']og:title["\'][^>]*content=["\']([^"\']*)["\'][^>]*>/i);
  if (ogTitleMatch) {
    title = ogTitleMatch[1];
  }

  // Fallback to regular title tag
  if (!title) {
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    if (titleMatch) {
      title = titleMatch[1];
    }
  }

  // Clean title
  title = title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim();

  // Extract main content using readability-style approach
  // Remove script and style tags first
  let cleanHtml = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  // Remove common navigation and sidebar elements
  cleanHtml = cleanHtml
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/class=["\'][^"\']*nav[^"\']*["\'][^>]*>/gi, '>');

  // Look for main content containers
  const contentSelectors = [
    /<main[^>]*>([\s\S]*?)<\/main>/i,
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /<div[^>]*class=["\'][^"\']*content[^"\']*["\'][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*id=["\'][^"\']*content[^"\']*["\'][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class=["\'][^"\']*post[^"\']*["\'][^>]*>([\s\S]*?)<\/div>/i,
  ];

  let content = '';
  for (const selector of contentSelectors) {
    const match = cleanHtml.match(selector);
    if (match && match[1].length > content.length) {
      content = match[1];
    }
  }

  // If no specific content container found, extract from body
  if (!content) {
    const bodyMatch = cleanHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) {
      content = bodyMatch[1];
    } else {
      content = cleanHtml;
    }
  }

  // Convert HTML to clean text while preserving structure
  content = content
    // Convert headings to markdown-style
    .replace(/<h([1-6])[^>]*>([^<]*)<\/h[1-6]>/gi, (match, level, text) => {
      const hashes = '#'.repeat(parseInt(level));
      return `\n\n${hashes} ${text.trim()}\n\n`;
    })
    // Convert paragraphs
    .replace(/<p[^>]*>([^<]*)<\/p>/gi, '\n\n$1\n\n')
    // Convert line breaks
    .replace(/<br[^>]*>/gi, '\n')
    // Convert lists
    .replace(/<li[^>]*>([^<]*)<\/li>/gi, '- $1\n')
    .replace(/<ul[^>]*>/gi, '\n')
    .replace(/<\/ul>/gi, '\n')
    .replace(/<ol[^>]*>/gi, '\n')
    .replace(/<\/ol>/gi, '\n')
    // Remove all other HTML tags
    .replace(/<[^>]*>/g, '')
    // Decode HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
    .replace(/&nbsp;/g, ' ')
    // Clean up whitespace
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .replace(/^\s+|\s+$/g, '')
    .trim();

  console.log(`✅ Extracted content: ${content.length} characters`);
  console.log(`   Title: "${title}"`);

  return { title, content };
}

/**
 * Process content with GPT-5 to extract metadata and format consistently
 */
async function processWithGPT5(
  content: string,
  title: string,
  url: string,
  connector: OpenAIConnector
): Promise<ProcessedWebContent['metadata']> {
  console.log('🤖 Processing content with GPT-5...');

  const prompt = `Analyze the following web content and extract structured metadata. Do not modify the actual content - only analyze it.

URL: ${url}
Title: ${title}

Content:
${content}

Please respond with a JSON object containing:
{
  "content_type": "article|blog|documentation|news|research|social_media|other",
  "topics": ["array", "of", "3-5", "main", "topics"],
  "summary": "2-3 sentence summary of the main points",
  "key_concepts": ["important", "terms", "and", "concepts", "mentioned"],
  "question_types": ["What questions", "could this content", "help answer"]
}

Focus on:
- Accurate content classification
- Meaningful topic extraction
- Concise but informative summary
- Key concepts that would help with search/retrieval
- Types of questions this content could answer

Respond with valid JSON only.`;

  try {
    const startTime = Date.now();
    const result = await connector.generateJSON(prompt);
    const processingTime = Date.now() - startTime;

    // Add computed metadata
    const metadata = {
      ...result,
      scraped_at: new Date().toISOString(),
      word_count: content.split(/\s+/).length,
      processing_time_ms: processingTime
    };

    console.log(`✅ GPT-5 processing completed in ${processingTime}ms`);
    console.log(`   Content type: ${metadata.content_type}`);
    console.log(`   Topics: ${metadata.topics?.join(', ')}`);

    return metadata;
  } catch (error: any) {
    console.error(`❌ GPT-5 processing failed: ${error.message}`);

    // Return fallback metadata
    return {
      content_type: 'unknown',
      topics: [],
      summary: 'Content processing failed',
      key_concepts: [],
      question_types: [],
      scraped_at: new Date().toISOString(),
      word_count: content.split(/\s+/).length,
      processing_time_ms: 0
    };
  }
}

/**
 * Main processing function
 */
async function processWebContent(url: string): Promise<ProcessedWebContent> {
  const startTime = Date.now();

  try {
    // Initialize OpenAI connector
    const connector = new OpenAIConnector({ verbose: true });

    // Fetch HTML
    const html = await fetchHtml(url);

    // Extract main content
    const { title, content } = extractMainContent(html, url);

    if (!content || content.length < 100) {
      throw new Error('Insufficient content extracted from page');
    }

    // Process with GPT-5
    const metadata = await processWithGPT5(content, title, url, connector);

    const totalTime = Date.now() - startTime;
    console.log(`🎉 Processing completed in ${totalTime}ms`);

    // Print cost summary
    const costs = connector.getCostSummary();
    console.log(`💰 Total cost: $${costs.totalCost.toFixed(4)} (${costs.inputTokens} input, ${costs.outputTokens} output tokens)`);

    return {
      url,
      title,
      content,
      metadata
    };
  } catch (error: any) {
    console.error(`❌ Processing failed: ${error.message}`);
    throw error;
  }
}

/**
 * CLI entry point
 */
async function main() {
  const url = process.argv[2];

  if (!url) {
    console.error('Usage: npx tsx src/scripts/web-content-processor.ts <URL>');
    process.exit(1);
  }

  // Validate URL
  try {
    new URL(url);
  } catch {
    console.error('❌ Invalid URL provided');
    process.exit(1);
  }

  console.log('🚀 Web Content Processor Starting...');
  console.log(`📄 Target URL: ${url}\n`);

  try {
    const result = await processWebContent(url);

    console.log('\n' + '='.repeat(80));
    console.log('📊 PROCESSING RESULTS');
    console.log('='.repeat(80));
    console.log(JSON.stringify(result, null, 2));
    console.log('='.repeat(80));

  } catch (error: any) {
    console.error(`\n❌ Failed to process content: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { processWebContent, type ProcessedWebContent };