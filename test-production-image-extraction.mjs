/**
 * Test the production-ready image extraction implementation
 * with the Tings Electronics PDF to ensure it works
 */

import fs from 'fs';
import { extractImagesFromPDF, getImageDirectory } from './src/lib/processing/image-extraction.js';

async function testProductionImageExtraction() {
  console.log('🧪 Testing production image extraction implementation...');

  try {
    const pdfPath = './docs/presentations/Tings Electronics Report Light 2024 (WIP).pdf';

    if (!fs.existsSync(pdfPath)) {
      console.error('❌ Tings Electronics PDF not found:', pdfPath);
      return;
    }

    console.log('📄 Testing with Tings Electronics PDF...');

    // Read the PDF buffer
    const pdfBuffer = fs.readFileSync(pdfPath);
    console.log(`📊 PDF size: ${(pdfBuffer.length / 1024 / 1024).toFixed(2)} MB`);

    // Generate output directory
    const uploadsDir = './test-production-output';
    const imageDir = getImageDirectory(uploadsDir, 'Tings_Electronics_Report_Light_2024_WIP');
    console.log(`📁 Output directory: ${imageDir}`);

    // Extract images
    const result = await extractImagesFromPDF(
      pdfBuffer,
      imageDir,
      'tings_electronics_report'
    );

    console.log('\n📋 EXTRACTION RESULTS:');
    console.log('='.repeat(50));
    console.log(`✅ Success: ${result.success}`);
    console.log(`🔧 Method: ${result.method}`);
    console.log(`🖼️ Total Images: ${result.totalImages}`);
    console.log(`⏱️ Extraction Time: ${result.extractionTime}ms`);

    if (result.message) {
      console.log(`💬 Message: ${result.message}`);
    }

    if (result.images.length > 0) {
      console.log('\n📸 EXTRACTED IMAGES:');
      result.images.forEach((image, index) => {
        console.log(`${index + 1}. ${image.filename}`);
        console.log(`   📏 Size: ${(image.size / 1024).toFixed(2)} KB`);
        console.log(`   📍 Path: ${image.path}`);
        console.log(`   🎨 Type: ${image.type}`);
      });
    }

    if (result.success && result.totalImages > 0) {
      console.log('\n🎉 SUCCESS! Production image extraction is working!');
      console.log('✅ The Tings Electronics PDF has been successfully converted to images');
      console.log(`📁 Check the output folder: ${imageDir}`);
    } else {
      console.log('\n❌ Image extraction did not produce usable results');
    }

  } catch (error) {
    console.error('❌ Production test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testProductionImageExtraction();