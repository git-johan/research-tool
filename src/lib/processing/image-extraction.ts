/**
 * PDF Image Extraction using Puppeteer
 *
 * Provides reliable PDF to image conversion using Puppeteer browser automation.
 * This approach works with complex presentation PDFs that other libraries struggle with.
 *
 * Successfully tested with:
 * - Tings Electronics Report Light 2024 (WIP).pdf
 * - Complex presentation PDFs with graphics and charts
 */

import fs from 'fs/promises';
import path from 'path';
import puppeteer from 'puppeteer';

export interface ImageExtractionResult {
  success: boolean;
  method: 'puppeteer' | 'embedded' | 'fallback' | 'none';
  images: Array<{
    filename: string;
    path: string;
    type: 'png' | 'jpeg';
    size: number;
  }>;
  totalImages: number;
  extractionTime: number;
  message?: string;
}

/**
 * Extract images from PDF using Puppeteer browser automation
 * This approach is proven to work with complex presentation PDFs
 */
export async function extractImagesFromPDF(
  pdfBuffer: Buffer,
  outputDir: string,
  baseFilename: string
): Promise<ImageExtractionResult> {
  const startTime = Date.now();

  try {
    console.log(`🖼️ Starting Puppeteer image extraction for ${baseFilename}`);

    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    // Try Puppeteer page-to-image conversion
    const puppeteerResult = await convertPDFWithPuppeteer(pdfBuffer, outputDir, baseFilename);

    if (puppeteerResult.success) {
      console.log(`✅ Successfully extracted ${puppeteerResult.totalImages} images using Puppeteer`);
      return puppeteerResult;
    }

    // If Puppeteer fails, try embedded image extraction as fallback
    try {
      console.log(`🔄 Trying embedded image extraction as fallback...`);
      const embeddedResult = await extractEmbeddedImages(pdfBuffer, outputDir, baseFilename);
      if (embeddedResult.totalImages > 0) {
        console.log(`✅ Successfully extracted ${embeddedResult.totalImages} embedded images`);
        return embeddedResult;
      }
    } catch (embeddedError) {
      console.log(`⚠️ Embedded image extraction also failed: ${embeddedError.message}`);
    }

    // If both methods fail
    const extractionTime = Date.now() - startTime;
    console.log(`💡 No images could be extracted from ${baseFilename}`);

    return {
      success: false,
      method: 'none',
      images: [],
      totalImages: 0,
      extractionTime,
      message: 'Both Puppeteer and embedded image extraction failed for this PDF.'
    };

  } catch (error) {
    const extractionTime = Date.now() - startTime;
    console.error(`❌ Image extraction failed for ${baseFilename}:`, error.message);

    return {
      success: false,
      method: 'fallback',
      images: [],
      totalImages: 0,
      extractionTime,
      message: `Image extraction failed: ${error.message}`
    };
  }
}

/**
 * Convert PDF to images using Puppeteer browser automation
 * This is the primary method that works reliably with presentation PDFs
 */
async function convertPDFWithPuppeteer(
  pdfBuffer: Buffer,
  outputDir: string,
  baseFilename: string
): Promise<ImageExtractionResult> {
  const startTime = Date.now();
  let browser;

  try {
    console.log(`🚀 Launching Puppeteer browser for ${baseFilename}...`);

    // Launch browser in headless mode
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'] // Important for production environments
    });

    const page = await browser.newPage();

    // Convert PDF buffer to data URI
    const base64PDF = pdfBuffer.toString('base64');
    const dataUri = `data:application/pdf;base64,${base64PDF}`;

    console.log(`🔄 Loading PDF in browser...`);

    // Load the PDF in the browser
    await page.goto(dataUri, { waitUntil: 'networkidle0' });

    // Wait for PDF to fully render
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Set viewport for consistent rendering
    await page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 2 // High DPI for better quality
    });

    console.log(`📸 Taking screenshots...`);

    const savedImages = [];

    // Take full page screenshot
    const fullPageFilename = `${baseFilename}_full_page.png`;
    const fullPagePath = path.join(outputDir, fullPageFilename);

    await page.screenshot({
      path: fullPagePath,
      fullPage: true,
      type: 'png'
    });

    // Get file stats
    const stats = await fs.stat(fullPagePath);

    savedImages.push({
      filename: fullPageFilename,
      path: fullPagePath,
      type: 'png' as const,
      size: stats.size
    });

    console.log(`💾 Saved full page screenshot: ${fullPageFilename} (${(stats.size / 1024).toFixed(2)} KB)`);

    // Also take a standard resolution screenshot
    await page.setViewport({ width: 1200, height: 800, deviceScaleFactor: 1 });

    const standardFilename = `${baseFilename}_standard.png`;
    const standardPath = path.join(outputDir, standardFilename);

    await page.screenshot({
      path: standardPath,
      fullPage: true,
      type: 'png'
    });

    const standardStats = await fs.stat(standardPath);

    savedImages.push({
      filename: standardFilename,
      path: standardPath,
      type: 'png' as const,
      size: standardStats.size
    });

    console.log(`💾 Saved standard screenshot: ${standardFilename} (${(standardStats.size / 1024).toFixed(2)} KB)`);

    const extractionTime = Date.now() - startTime;

    return {
      success: true,
      method: 'puppeteer',
      images: savedImages,
      totalImages: savedImages.length,
      extractionTime,
      message: `Successfully extracted ${savedImages.length} images using Puppeteer`
    };

  } catch (error) {
    console.error(`❌ Puppeteer conversion failed: ${error.message}`);

    return {
      success: false,
      method: 'puppeteer',
      images: [],
      totalImages: 0,
      extractionTime: Date.now() - startTime,
      message: `Puppeteer conversion failed: ${error.message}`
    };

  } finally {
    if (browser) {
      await browser.close();
      console.log(`🔒 Browser closed for ${baseFilename}`);
    }
  }
}

/**
 * Extract embedded images using pdf-extract-image library
 */
async function extractEmbeddedImages(
  pdfBuffer: Buffer,
  outputDir: string,
  baseFilename: string
): Promise<ImageExtractionResult> {
  const startTime = Date.now();

  // Dynamic import to handle ES module compatibility
  const { extractImagesFromPdf } = await import('pdf-extract-image');

  // Convert Buffer to Uint8Array as required by the library
  const uint8Array = new Uint8Array(pdfBuffer);

  // Extract embedded images
  const images = await extractImagesFromPdf(uint8Array);

  if (images.length === 0) {
    return {
      success: true,
      method: 'none',
      images: [],
      totalImages: 0,
      extractionTime: Date.now() - startTime,
      message: 'No embedded images found in PDF'
    };
  }

  // Save extracted images
  const savedImages = [];
  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    const extension = image.type === 'jpeg' ? 'jpg' : 'png';
    const filename = `${baseFilename}_embedded_${i + 1}.${extension}`;
    const imagePath = path.join(outputDir, filename);

    await fs.writeFile(imagePath, image.data);

    savedImages.push({
      filename,
      path: imagePath,
      type: image.type as 'jpeg' | 'png',
      size: image.data.length
    });

    console.log(`💾 Saved embedded image: ${filename} (${image.type}, ${image.data.length} bytes)`);
  }

  return {
    success: true,
    method: 'embedded',
    images: savedImages,
    totalImages: savedImages.length,
    extractionTime: Date.now() - startTime
  };
}

/**
 * Check if a PDF likely contains visual content worth extracting
 * Based on file size and text extraction results
 */
export function shouldExtractImages(pdfSizeBytes: number, extractedWordCount: number): boolean {
  // Large files with few words likely contain visual content
  const sizeMB = pdfSizeBytes / (1024 * 1024);
  const wordsPerMB = extractedWordCount / sizeMB;

  // If large file (>1MB) with very few words per MB, likely presentation/visual
  if (sizeMB > 1 && wordsPerMB < 100) {
    return true;
  }

  // If almost no extractable text, definitely try images
  if (extractedWordCount < 10) {
    return true;
  }

  return false;
}

/**
 * Generate image directory path for a document
 */
export function getImageDirectory(uploadsDir: string, filename: string): string {
  const timestamp = Date.now();
  const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  return path.join(uploadsDir, 'pdf-images', `${timestamp}_${safeFilename}`);
}