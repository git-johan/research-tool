/**
 * Test PDF Extractor
 * Simple script to test PDF text extraction functionality
 */

import { extractPDFFromURL, extractPDFContent } from '../lib/processing/extractors/pdf-extractor';
import * as fs from 'fs';

/**
 * Test the PDF extractor with a file path or URL
 */
async function testPDFExtractor(input: string) {
  console.log('🧪 Testing PDF Extractor');
  console.log('='.repeat(50));
  console.log(`📄 Target: ${input}\n`);

  try {
    let result;

    // Check if input is a local file path or URL
    if (input.startsWith('http://') || input.startsWith('https://')) {
      console.log('🌐 Processing as URL...');
      result = await extractPDFFromURL(input);
    } else {
      console.log('📁 Processing as local file...');
      // Read local file
      const filePath = input;
      const pdfBuffer = fs.readFileSync(filePath);
      console.log(`✅ File read: ${pdfBuffer.length} bytes`);
      result = await extractPDFContent(pdfBuffer);
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 EXTRACTION RESULTS');
    console.log('='.repeat(50));

    console.log('\n📈 Statistics:');
    console.log(`   Total pages: ${result.metadata.totalPages}`);
    console.log(`   Total characters: ${result.text.length}`);
    console.log(`   Total words: ${result.totalWordCount}`);
    console.log(`   Extraction time: ${result.extractionTime}ms`);

    console.log('\n📋 Metadata:');
    if (result.metadata.title) console.log(`   Title: "${result.metadata.title}"`);
    if (result.metadata.author) console.log(`   Author: "${result.metadata.author}"`);
    if (result.metadata.subject) console.log(`   Subject: "${result.metadata.subject}"`);
    if (result.metadata.creator) console.log(`   Creator: "${result.metadata.creator}"`);
    if (result.metadata.creationDate) console.log(`   Created: ${result.metadata.creationDate.toISOString()}`);

    console.log('\n📄 Page Breakdown:');
    result.pages.slice(0, 5).forEach((page, index) => {
      console.log(`   Page ${page.pageNumber}: ${page.wordCount} words, ${page.text.length} chars`);
    });
    if (result.pages.length > 5) {
      console.log(`   ... and ${result.pages.length - 5} more pages`);
    }

    console.log('\n📝 Content Preview (First 500 characters):');
    console.log('─'.repeat(50));
    console.log(result.text.substring(0, 500) + (result.text.length > 500 ? '...' : ''));
    console.log('─'.repeat(50));

    console.log('\n✅ PDF extraction successful!');

  } catch (error) {
    console.error('\n❌ PDF extraction failed:');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * CLI entry point
 */
async function main() {
  const input = process.argv[2];

  if (!input) {
    console.error('Usage: npx tsx src/scripts/test-pdf-extractor.ts <PDF_FILE_OR_URL>');
    console.error('\nExamples:');
    console.error('  npx tsx src/scripts/test-pdf-extractor.ts "docs/papers/paper.pdf"');
    console.error('  npx tsx src/scripts/test-pdf-extractor.ts "https://example.com/paper.pdf"');
    process.exit(1);
  }

  await testPDFExtractor(input);
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}