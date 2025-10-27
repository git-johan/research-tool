/**
 * Test script for PDF image extraction using dynamic imports
 * Using .mjs extension to enable ES modules
 */

import fs from 'fs';
import path from 'path';

async function testPDFImageExtraction() {
  console.log('🧪 Testing PDF image extraction with dynamic imports...');

  try {
    // Test with the Tings Electronics PDF
    const pdfPath = './docs/presentations/Tings Electronics Report Light 2024 (WIP).pdf';

    if (!fs.existsSync(pdfPath)) {
      console.error('❌ Test PDF not found:', pdfPath);
      return;
    }

    console.log('📄 Converting PDF to images:', pdfPath);

    // Try pdf-to-img first
    try {
      const { pdf } = await import('pdf-to-img');
      console.log('🔄 Using pdf-to-img library...');

      // Convert PDF to images
      const convert = pdf(pdfPath, { scale: 2 });

      // Create test output directory
      const outputDir = './test-pdf-to-img-dynamic';
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

      console.log('🎉 PDF to image conversion completed with pdf-to-img!');
      console.log(`📁 Check the ${outputDir} folder for extracted images`);
      return;

    } catch (pdfToImgError) {
      console.log('⚠️ pdf-to-img failed, trying pdf-img-convert...');
      console.log('Error:', pdfToImgError.message);
    }

    // Fallback to pdf-img-convert
    try {
      const { convert } = await import('pdf-img-convert');
      console.log('🔄 Using pdf-img-convert library...');

      const images = await convert(pdfPath, {
        width: 1200,
        base64: false
      });

      console.log(`✅ Successfully extracted ${images.length} page images`);

      const outputDir = './test-pdf-img-convert-dynamic';
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
      }

      for (let i = 0; i < images.length; i++) {
        const imagePath = path.join(outputDir, `page-${i + 1}.png`);
        fs.writeFileSync(imagePath, images[i]);
        console.log(`💾 Saved: ${imagePath}`);
      }

      console.log('🎉 PDF image extraction completed with pdf-img-convert!');
      console.log(`📁 Check the ${outputDir} folder for extracted images`);
      return;

    } catch (pdfImgConvertError) {
      console.log('⚠️ pdf-img-convert also failed');
      console.log('Error:', pdfImgConvertError.message);
    }

    // If both fail, try embedded image extraction
    try {
      const pdfExtractImage = await import('pdf-extract-image');
      console.log('🔄 Trying embedded image extraction...');

      const pdfBuffer = fs.readFileSync(pdfPath);
      const images = await pdfExtractImage.default(pdfBuffer);

      console.log(`✅ Successfully found ${images.length} embedded images`);

      if (images.length === 0) {
        console.log('ℹ️ No embedded images found in this PDF');
        console.log('💡 This PDF might use vector graphics or text rendering instead of embedded images');
        return;
      }

      const outputDir = './test-embedded-images-dynamic';
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
      }

      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        const extension = image.type === 'jpeg' ? 'jpg' : 'png';
        const imagePath = path.join(outputDir, `embedded-image-${i + 1}.${extension}`);

        fs.writeFileSync(imagePath, image.data);
        console.log(`💾 Saved: ${imagePath} (${image.type}, ${image.data.length} bytes)`);
      }

      console.log('🎉 PDF embedded image extraction completed!');
      console.log(`📁 Check the ${outputDir} folder for extracted images`);

    } catch (embeddedError) {
      console.error('❌ All PDF image extraction methods failed');
      console.error('Last error:', embeddedError.message);
    }

  } catch (error) {
    console.error('❌ PDF image extraction test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testPDFImageExtraction();