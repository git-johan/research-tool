/**
 * Test PDF to image conversion using Puppeteer
 * This should be much more reliable than PDF.js-based solutions
 */

import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

async function testPuppeteerPDFConversion() {
  console.log('🎯 Testing Tings Electronics PDF with Puppeteer...');

  let browser;
  try {
    const pdfPath = './docs/presentations/Tings Electronics Report Light 2024 (WIP).pdf';

    if (!fs.existsSync(pdfPath)) {
      console.error('❌ Tings Electronics PDF not found:', pdfPath);
      return;
    }

    console.log('📄 Loading Tings Electronics PDF...');
    const pdfStats = fs.statSync(pdfPath);
    console.log(`📊 PDF size: ${(pdfStats.size / 1024 / 1024).toFixed(2)} MB`);

    // Launch Puppeteer
    console.log('🚀 Launching Puppeteer browser...');
    browser = await puppeteer.launch({
      headless: 'new'
    });

    const page = await browser.newPage();

    // Read the PDF file
    const pdfBuffer = fs.readFileSync(pdfPath);
    const base64PDF = pdfBuffer.toString('base64');
    const dataUri = `data:application/pdf;base64,${base64PDF}`;

    console.log('🔄 Loading PDF in browser...');
    await page.goto(dataUri, { waitUntil: 'networkidle0' });

    // Wait a bit for PDF to fully load
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('📸 Taking screenshot of PDF...');

    // Create output directory
    const outputDir = './tings-puppeteer-images';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    // Take a screenshot of the entire PDF page
    const screenshotPath = path.join(outputDir, 'tings-electronics-full.png');
    await page.screenshot({
      path: screenshotPath,
      fullPage: true,
      type: 'png'
    });

    console.log(`✅ SUCCESS! Screenshot saved: ${screenshotPath}`);

    // Get the screenshot file size
    const screenshotStats = fs.statSync(screenshotPath);
    console.log(`📊 Screenshot size: ${(screenshotStats.size / 1024).toFixed(2)} KB`);

    // Also try to take a higher resolution screenshot
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 2 });

    const highResPath = path.join(outputDir, 'tings-electronics-highres.png');
    await page.screenshot({
      path: highResPath,
      fullPage: true,
      type: 'png'
    });

    console.log(`✅ High-res screenshot saved: ${highResPath}`);

    console.log('🎉 SUCCESS! Puppeteer PDF conversion completed!');
    console.log(`📁 Check the ${outputDir} folder for the images`);

  } catch (error) {
    console.error('❌ Puppeteer PDF conversion failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (browser) {
      await browser.close();
      console.log('🔒 Browser closed');
    }
  }
}

// Run the test
testPuppeteerPDFConversion();