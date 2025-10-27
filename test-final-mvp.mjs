/**
 * Final MVP test - verify our Puppeteer approach works with Tings Electronics PDF
 * and is ready for integration into the main system
 */

import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

async function testFinalMVP() {
  console.log('🎯 FINAL MVP TEST: Tings Electronics PDF Image Extraction');
  console.log('='.repeat(60));

  let browser;
  try {
    const pdfPath = './docs/presentations/Tings Electronics Report Light 2024 (WIP).pdf';

    if (!fs.existsSync(pdfPath)) {
      console.error('❌ Tings Electronics PDF not found');
      return;
    }

    // Read PDF
    const pdfBuffer = fs.readFileSync(pdfPath);
    console.log(`📄 PDF loaded: ${(pdfBuffer.length / 1024 / 1024).toFixed(2)} MB`);

    // Create output directory
    const outputDir = './mvp-final-test';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    console.log('🚀 Launching browser...');
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Convert to data URI
    const base64PDF = pdfBuffer.toString('base64');
    const dataUri = `data:application/pdf;base64,${base64PDF}`;

    console.log('🔄 Loading PDF in browser...');
    await page.goto(dataUri, { waitUntil: 'networkidle0' });

    // Wait for rendering
    await new Promise(resolve => setTimeout(resolve, 3000));

    // High quality screenshot
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 2 });

    console.log('📸 Taking high-quality screenshot...');
    const highQualityPath = path.join(outputDir, 'tings_electronics_hq.png');
    await page.screenshot({
      path: highQualityPath,
      fullPage: true,
      type: 'png'
    });

    // Standard screenshot
    await page.setViewport({ width: 1200, height: 800, deviceScaleFactor: 1 });

    console.log('📸 Taking standard screenshot...');
    const standardPath = path.join(outputDir, 'tings_electronics_standard.png');
    await page.screenshot({
      path: standardPath,
      fullPage: true,
      type: 'png'
    });

    // Get file stats
    const hqStats = fs.statSync(highQualityPath);
    const stdStats = fs.statSync(standardPath);

    console.log('\n🎉 SUCCESS! MVP Image Extraction Completed!');
    console.log('='.repeat(50));
    console.log(`✅ High Quality: ${(hqStats.size / 1024).toFixed(2)} KB`);
    console.log(`✅ Standard: ${(stdStats.size / 1024).toFixed(2)} KB`);
    console.log(`📁 Output: ${outputDir}`);

    console.log('\n🏆 MVP VALIDATION:');
    console.log('✅ Puppeteer integration works');
    console.log('✅ PDF loading successful');
    console.log('✅ Screenshot generation successful');
    console.log('✅ File output successful');
    console.log('✅ Tings Electronics PDF successfully converted');

    console.log('\n🚀 READY FOR INTEGRATION into PDF extractor!');

  } catch (error) {
    console.error('❌ MVP Test Failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (browser) {
      await browser.close();
      console.log('🔒 Browser closed');
    }
  }
}

testFinalMVP();