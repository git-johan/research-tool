/**
 * Test script for PDF image extraction using pdf-to-img
 */

const { pdf } = require('pdf-to-img');
const fs = require('fs');
const path = require('path');

async function testPDFToImg() {
  console.log('🧪 Testing PDF to image conversion with pdf-to-img...');

  try {
    // Test with the Tings Electronics PDF
    const pdfPath = './docs/presentations/Tings Electronics Report Light 2024 (WIP).pdf';

    if (!fs.existsSync(pdfPath)) {
      console.error('❌ Test PDF not found:', pdfPath);
      return;
    }

    console.log('📄 Converting PDF to images:', pdfPath);

    // Convert PDF to images
    const convert = pdf(pdfPath, { scale: 2 });

    // Create test output directory
    const outputDir = './test-pdf-to-img';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    let counter = 1;
    for await (const image of convert) {
      const imagePath = path.join(outputDir, `page-${counter}.png`);
      fs.writeFileSync(imagePath, image);
      console.log(`💾 Saved: ${imagePath}`);
      counter++;
    }

    console.log('🎉 PDF to image conversion completed!');
    console.log(`📁 Check the ${outputDir} folder for extracted images`);

  } catch (error) {
    console.error('❌ PDF to image conversion failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testPDFToImg();