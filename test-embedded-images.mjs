/**
 * Test embedded image extraction with different import patterns
 */

import fs from 'fs';
import path from 'path';

async function testEmbeddedImageExtraction() {
  console.log('🧪 Testing embedded image extraction...');

  try {
    // Test with the Tings Electronics PDF
    const pdfPath = './docs/presentations/Tings Electronics Report Light 2024 (WIP).pdf';

    if (!fs.existsSync(pdfPath)) {
      console.error('❌ Test PDF not found:', pdfPath);
      return;
    }

    console.log('📄 Extracting embedded images from PDF:', pdfPath);
    const pdfBuffer = fs.readFileSync(pdfPath);

    // Try different import patterns for pdf-extract-image
    let pdfExtractImage;
    try {
      // Try named import
      const module1 = await import('pdf-extract-image');
      pdfExtractImage = module1.default || module1;
      console.log('🔄 Using default import');
    } catch (e1) {
      try {
        // Try destructured import
        const { extractImages } = await import('pdf-extract-image');
        pdfExtractImage = extractImages;
        console.log('🔄 Using named import (extractImages)');
      } catch (e2) {
        try {
          // Try CommonJS style
          const module3 = await import('pdf-extract-image');
          pdfExtractImage = module3.pdfExtractImage || module3.extract;
          console.log('🔄 Using alternative export');
        } catch (e3) {
          console.error('❌ All import methods failed');
          console.error('e1:', e1.message);
          console.error('e2:', e2.message);
          console.error('e3:', e3.message);
          return;
        }
      }
    }

    console.log('pdfExtractImage type:', typeof pdfExtractImage);
    console.log('pdfExtractImage:', pdfExtractImage);

    if (typeof pdfExtractImage !== 'function') {
      console.error('❌ pdfExtractImage is not a function');
      return;
    }

    const images = await pdfExtractImage(pdfBuffer);
    console.log(`✅ Successfully found ${images.length} embedded images`);

    if (images.length === 0) {
      console.log('ℹ️ No embedded images found in this PDF');
      console.log('💡 This PDF might use vector graphics or text rendering instead of embedded images');

      // Try with another PDF that might have embedded images
      const academicPdfPath = './docs/papers/Consumer Behaviour Circular Economy Literature Review.pdf';
      if (fs.existsSync(academicPdfPath)) {
        console.log('🔄 Trying with academic PDF...');
        const academicBuffer = fs.readFileSync(academicPdfPath);
        const academicImages = await pdfExtractImage(academicBuffer);
        console.log(`Found ${academicImages.length} embedded images in academic PDF`);

        if (academicImages.length > 0) {
          const outputDir = './test-embedded-academic';
          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir);
          }

          for (let i = 0; i < academicImages.length; i++) {
            const image = academicImages[i];
            const extension = image.type === 'jpeg' ? 'jpg' : 'png';
            const imagePath = path.join(outputDir, `embedded-image-${i + 1}.${extension}`);
            fs.writeFileSync(imagePath, image.data);
            console.log(`💾 Saved: ${imagePath} (${image.type}, ${image.data.length} bytes)`);
          }
        }
      }

      return;
    }

    const outputDir = './test-embedded-images-final';
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

    console.log('🎉 Embedded image extraction completed!');
    console.log(`📁 Check the ${outputDir} folder for extracted images`);

  } catch (error) {
    console.error('❌ Embedded image extraction failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testEmbeddedImageExtraction();