/**
 * Test Unified Content Router
 * Tests the content router with both PDF and HTML URLs
 */

import { processUnifiedContentWithAI } from '../lib/content-type-router';

/**
 * Test the unified content router with a URL
 */
async function testUnifiedRouter(url: string) {
  console.log('🧪 Testing Unified Content Router');
  console.log('='.repeat(60));
  console.log(`🌐 Target URL: ${url}\n`);

  try {
    const result = await processUnifiedContentWithAI(url);

    console.log('\n' + '='.repeat(60));
    console.log('📊 PROCESSING RESULTS');
    console.log('='.repeat(60));

    console.log('\n📈 Statistics:');
    console.log(`   Content Type: ${result.contentType.toUpperCase()}`);
    console.log(`   Title: "${result.title}"`);
    console.log(`   Total characters: ${result.content.length}`);
    console.log(`   Total words: ${result.metadata.word_count}`);
    console.log(`   Processing time: ${result.metadata.processing_time_ms}ms`);

    console.log('\n🤖 AI Analysis:');
    console.log(`   Classification: ${result.metadata.content_type}`);
    console.log(`   Topics: ${result.metadata.topics.join(', ')}`);
    console.log(`   Summary: "${result.metadata.summary}"`);

    if (result.metadata.key_concepts.length > 0) {
      console.log(`   Key Concepts: ${result.metadata.key_concepts.slice(0, 5).join(', ')}`);
    }

    if (result.contentType === 'pdf') {
      console.log('\n📄 PDF Metadata:');
      if (result.metadata.totalPages) console.log(`   Pages: ${result.metadata.totalPages}`);
      if (result.metadata.author) console.log(`   Author: "${result.metadata.author}"`);
      if (result.metadata.creator) console.log(`   Creator: "${result.metadata.creator}"`);
      if (result.metadata.creationDate) console.log(`   Created: ${result.metadata.creationDate.toISOString()}`);
    }

    console.log('\n📝 Content Preview (First 500 characters):');
    console.log('─'.repeat(60));
    console.log(result.content.substring(0, 500) + (result.content.length > 500 ? '...' : ''));
    console.log('─'.repeat(60));

    console.log('\n✅ Unified content processing successful!');

  } catch (error) {
    console.error('\n❌ Unified content processing failed:');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * CLI entry point
 */
async function main() {
  const url = process.argv[2];

  if (!url) {
    console.error('Usage: npx tsx src/scripts/test-unified-router.ts <URL>');
    console.error('\nExamples:');
    console.error('  npx tsx src/scripts/test-unified-router.ts "https://example.com/article"');
    console.error('  npx tsx src/scripts/test-unified-router.ts "https://example.com/paper.pdf"');
    process.exit(1);
  }

  // Validate URL
  try {
    new URL(url);
  } catch {
    console.error('❌ Invalid URL provided');
    process.exit(1);
  }

  await testUnifiedRouter(url);
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}