/**
 * Focused test to make pdf-img-convert work with Tings Electronics PDF specifically
 * Setting up Canvas globals properly for PDF.js
 */

import fs from 'fs';
import path from 'path';
import { createCanvas, createImageData, Image } from 'canvas';

// Set up comprehensive Canvas globals for PDF.js
global.createCanvas = createCanvas;
global.createImageData = createImageData;
global.Image = Image;

// Add missing Canvas and Image globals that PDF.js expects
global.Canvas = {
  createCanvas: createCanvas
};

async function testTingsElectronicsSpecifically() {
  console.log('🎯 Testing specifically with Tings Electronics PDF...');

  try {
    const pdfPath = './docs/presentations/Tings Electronics Report Light 2024 (WIP).pdf';

    if (!fs.existsSync(pdfPath)) {
      console.error('❌ Tings Electronics PDF not found:', pdfPath);
      return;
    }

    console.log('📄 Loading Tings Electronics PDF...');
    const pdfStats = fs.statSync(pdfPath);
    console.log(`📊 PDF size: ${(pdfStats.size / 1024 / 1024).toFixed(2)} MB`);

    // Try pdf-img-convert with comprehensive Canvas setup
    try {
      console.log('🔄 Attempting pdf-img-convert...');
      const pdfImgConvert = await import('pdf-img-convert');

      // Start with simple configuration
      const images = await pdfImgConvert.convert(pdfPath, {
        width: 800,  // Lower resolution to start
        base64: false
      });

      console.log(`✅ SUCCESS! Extracted ${images.length} page images from Tings Electronics PDF`);

      const outputDir = './tings-images-success';
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
      }

      for (let i = 0; i < images.length; i++) {
        const imagePath = path.join(outputDir, `tings-page-${i + 1}.png`);
        fs.writeFileSync(imagePath, images[i]);
        console.log(`💾 Saved: ${imagePath} (${images[i].length} bytes)`);
      }

      console.log('🎉 SUCCESS! Tings Electronics PDF image extraction completed!');
      console.log(`📁 Check the ${outputDir} folder for the extracted images`);

      return;

    } catch (convertError) {
      console.log(`❌ pdf-img-convert failed: ${convertError.message}`);
      console.log('Stack trace:', convertError.stack);
    }

    // If pdf-img-convert fails, let's diagnose the PDF structure
    console.log('🔍 Diagnosing PDF structure...');

    // Read the PDF and check if it's a valid PDF
    const pdfBuffer = fs.readFileSync(pdfPath);
    const pdfHeader = pdfBuffer.subarray(0, 10).toString();
    console.log('📋 PDF header:', pdfHeader);

    if (!pdfHeader.startsWith('%PDF-')) {
      console.error('❌ File is not a valid PDF');
      return;
    }

    console.log('✅ Valid PDF file confirmed');
    console.log('💡 This PDF likely has complex graphics that require specialized handling');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testTingsElectronicsSpecifically();