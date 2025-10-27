/**
 * Test script for PDF image extraction using pdf-img-convert legacy build
 */

import fs from 'fs';
import path from 'path';

async function testPDFImageExtraction() {
  console.log('🧪 Testing PDF image extraction with pdf-img-convert legacy build...');

  try {
    // Test with the Tings Electronics PDF
    const pdfPath = './docs/presentations/Tings Electronics Report Light 2024 (WIP).pdf';

    if (!fs.existsSync(pdfPath)) {
      console.error('❌ Test PDF not found:', pdfPath);
      return;
    }

    console.log('📄 Converting PDF to images:', pdfPath);

    // Use pdf-img-convert with legacy build configuration
    const pdfImgConvert = await import('pdf-img-convert');
    console.log('🔄 Using pdf-img-convert with legacy build...');

    const images = await pdfImgConvert.convert(pdfPath, {
      width: 1200,
      base64: false,
      // Add legacy version configuration
      version: 'v1.10.100'
    });

    console.log(`✅ Successfully extracted ${images.length} page images`);

    const outputDir = './test-pdf-img-legacy';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    for (let i = 0; i < images.length; i++) {
      const imagePath = path.join(outputDir, `page-${i + 1}.png`);
      fs.writeFileSync(imagePath, images[i]);
      console.log(`💾 Saved: ${imagePath} (${images[i].length} bytes)`);
    }

    console.log('🎉 PDF image extraction completed with pdf-img-convert legacy!');
    console.log(`📁 Check the ${outputDir} folder for extracted images`);

  } catch (error) {
    console.error('❌ PDF image extraction failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testPDFImageExtraction();