/**
 * Test script for PDF image extraction using pdf-img-convert
 * This validates the library works before integrating into our system
 */

import { convert } from 'pdf-img-convert';
import fs from 'fs';
import path from 'path';

async function testPDFImageExtraction() {
  console.log('🧪 Testing PDF image extraction...');

  try {
    // Test with the Tings Electronics PDF (the one that only extracted newlines)
    const pdfPath = './docs/presentations/Tings Electronics Report Light 2024 (WIP).pdf';

    if (!fs.existsSync(pdfPath)) {
      console.error('❌ Test PDF not found:', pdfPath);
      return;
    }

    console.log('📄 Converting PDF to images:', pdfPath);

    // Convert PDF to images
    const images = await convert(pdfPath, {
      width: 1200,  // Good resolution for readability
      base64: false // We want binary data, not base64
    });

    console.log(`✅ Successfully extracted ${images.length} page images`);

    // Create test output directory
    const outputDir = './test-pdf-images';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    // Save each page as PNG
    for (let i = 0; i < images.length; i++) {
      const imagePath = path.join(outputDir, `page-${i + 1}.png`);
      fs.writeFileSync(imagePath, images[i]);
      console.log(`💾 Saved: ${imagePath}`);
    }

    console.log('🎉 PDF image extraction test completed successfully!');
    console.log(`📁 Check the ${outputDir} folder for extracted images`);

  } catch (error) {
    console.error('❌ PDF image extraction failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testPDFImageExtraction();