/**
 * Test script for PDF image extraction using pdf-extract-image
 * This extracts embedded images rather than converting pages to images
 */

import pdfExtractImage from 'pdf-extract-image';
import fs from 'fs';
import path from 'path';

async function testPDFImageExtraction() {
  console.log('🧪 Testing PDF embedded image extraction...');

  try {
    // Test with the Tings Electronics PDF
    const pdfPath = './docs/presentations/Tings Electronics Report Light 2024 (WIP).pdf';

    if (!fs.existsSync(pdfPath)) {
      console.error('❌ Test PDF not found:', pdfPath);
      return;
    }

    console.log('📄 Extracting embedded images from PDF:', pdfPath);

    // Read PDF as buffer
    const pdfBuffer = fs.readFileSync(pdfPath);

    // Extract embedded images
    const images = await pdfExtractImage(pdfBuffer);

    console.log(`✅ Successfully found ${images.length} embedded images`);

    if (images.length === 0) {
      console.log('ℹ️ No embedded images found in this PDF');
      console.log('💡 This PDF might use vector graphics or text rendering instead of embedded images');
      return;
    }

    // Create test output directory
    const outputDir = './test-embedded-images';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    // Save each embedded image
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      const extension = image.type === 'jpeg' ? 'jpg' : 'png';
      const imagePath = path.join(outputDir, `embedded-image-${i + 1}.${extension}`);

      fs.writeFileSync(imagePath, image.data);
      console.log(`💾 Saved: ${imagePath} (${image.type}, ${image.data.length} bytes)`);
    }

    console.log('🎉 PDF embedded image extraction test completed!');
    console.log(`📁 Check the ${outputDir} folder for extracted images`);

  } catch (error) {
    console.error('❌ PDF embedded image extraction failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testPDFImageExtraction();