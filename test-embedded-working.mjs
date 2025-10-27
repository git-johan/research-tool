/**
 * Test embedded image extraction with correct function name
 */

import fs from 'fs';
import path from 'path';

async function testEmbeddedImageExtraction() {
  console.log('🧪 Testing embedded image extraction with correct function...');

  try {
    // Import the correct function
    const { extractImagesFromPdf } = await import('pdf-extract-image');
    console.log('✅ Successfully imported extractImagesFromPdf');

    // Test with the Tings Electronics PDF
    const pdfPath = './docs/presentations/Tings Electronics Report Light 2024 (WIP).pdf';

    if (!fs.existsSync(pdfPath)) {
      console.error('❌ Test PDF not found:', pdfPath);
      return;
    }

    console.log('📄 Extracting embedded images from PDF:', pdfPath);
    const pdfBuffer = fs.readFileSync(pdfPath);
    const uint8Array = new Uint8Array(pdfBuffer);

    const images = await extractImagesFromPdf(uint8Array);
    console.log(`✅ Successfully found ${images.length} embedded images`);

    if (images.length === 0) {
      console.log('ℹ️ No embedded images found in Tings Electronics PDF');
      console.log('💡 This PDF might use vector graphics or text rendering instead of embedded images');

      // Try with another PDF that might have embedded images
      const academicPdfPath = './docs/papers/Consumer Behaviour Circular Economy Literature Review.pdf';
      if (fs.existsSync(academicPdfPath)) {
        console.log('🔄 Trying with academic PDF...');
        const academicBuffer = fs.readFileSync(academicPdfPath);
        const academicUint8Array = new Uint8Array(academicBuffer);
        const academicImages = await extractImagesFromPdf(academicUint8Array);
        console.log(`Found ${academicImages.length} embedded images in academic PDF`);

        if (academicImages.length > 0) {
          console.log('🎉 Found embedded images in academic PDF!');
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
          console.log(`📁 Check the ${outputDir} folder for extracted images`);
          return;
        }
      }

      console.log('💡 Neither PDF contains embedded images. This is normal for presentation PDFs.');
      console.log('🔄 Presentation PDFs typically use vector graphics that need page-to-image conversion.');
      return;
    }

    // If we found images in the main PDF
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