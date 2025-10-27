/**
 * Test script for PDF image extraction with proper Canvas setup
 */

import fs from 'fs';
import path from 'path';
import { createCanvas, createImageData } from 'canvas';

// Set up Canvas globals for PDF.js
global.createCanvas = createCanvas;
global.createImageData = createImageData;

async function testPDFImageExtraction() {
  console.log('🧪 Testing PDF image extraction with Canvas polyfill...');

  try {
    // Test with the Tings Electronics PDF
    const pdfPath = './docs/presentations/Tings Electronics Report Light 2024 (WIP).pdf';

    if (!fs.existsSync(pdfPath)) {
      console.error('❌ Test PDF not found:', pdfPath);
      return;
    }

    console.log('📄 Converting PDF to images:', pdfPath);

    // Use pdf-img-convert
    const pdfImgConvert = await import('pdf-img-convert');
    console.log('🔄 Using pdf-img-convert with Canvas polyfill...');

    const images = await pdfImgConvert.convert(pdfPath, {
      width: 1200,
      base64: false
    });

    console.log(`✅ Successfully extracted ${images.length} page images`);

    const outputDir = './test-pdf-img-canvas';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    for (let i = 0; i < images.length; i++) {
      const imagePath = path.join(outputDir, `page-${i + 1}.png`);
      fs.writeFileSync(imagePath, images[i]);
      console.log(`💾 Saved: ${imagePath} (${images[i].length} bytes)`);
    }

    console.log('🎉 PDF image extraction completed with Canvas polyfill!');
    console.log(`📁 Check the ${outputDir} folder for extracted images`);

  } catch (error) {
    console.error('❌ PDF image extraction failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testPDFImageExtraction();