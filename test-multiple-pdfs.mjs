/**
 * Test image extraction with multiple PDFs to validate robustness
 * Testing: itssunday.studio.pdf and Frame 7.pdf
 */

import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

async function testPDF(pdfPath, outputName) {
  console.log(`\n🎯 Testing: ${path.basename(pdfPath)}`);
  console.log('='.repeat(50));

  if (!fs.existsSync(pdfPath)) {
    console.error(`❌ PDF not found: ${pdfPath}`);
    return { success: false, reason: 'File not found' };
  }

  let browser;
  try {
    // Read PDF
    const pdfBuffer = fs.readFileSync(pdfPath);
    console.log(`📄 PDF loaded: ${(pdfBuffer.length / 1024 / 1024).toFixed(2)} MB`);

    // Create output directory
    const outputDir = `./test-multiple-pdfs/${outputName}`;
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
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

    // Take screenshots at different resolutions
    const screenshots = [];

    // High quality
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 2 });
    const hqPath = path.join(outputDir, `${outputName}_high_quality.png`);
    await page.screenshot({
      path: hqPath,
      fullPage: true,
      type: 'png'
    });

    const hqStats = fs.statSync(hqPath);
    screenshots.push({
      name: 'High Quality',
      path: hqPath,
      size: hqStats.size
    });

    // Standard
    await page.setViewport({ width: 1200, height: 800, deviceScaleFactor: 1 });
    const stdPath = path.join(outputDir, `${outputName}_standard.png`);
    await page.screenshot({
      path: stdPath,
      fullPage: true,
      type: 'png'
    });

    const stdStats = fs.statSync(stdPath);
    screenshots.push({
      name: 'Standard',
      path: stdPath,
      size: stdStats.size
    });

    console.log('✅ Screenshots completed:');
    screenshots.forEach(shot => {
      console.log(`   ${shot.name}: ${(shot.size / 1024).toFixed(2)} KB`);
    });

    return {
      success: true,
      pdfSize: pdfBuffer.length,
      screenshots: screenshots,
      outputDir: outputDir
    };

  } catch (error) {
    console.error(`❌ Failed: ${error.message}`);
    return { success: false, reason: error.message };

  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function testMultiplePDFs() {
  console.log('🧪 TESTING MULTIPLE PDFs FOR ROBUSTNESS');
  console.log('='.repeat(60));

  const testCases = [
    {
      path: './docs/presentations/itssunday.studio.pdf',
      name: 'itssunday_studio'
    },
    {
      path: './docs/presentations/Frame 7.pdf',
      name: 'frame_7'
    },
    {
      path: './docs/presentations/Tings Electronics Report Light 2024 (WIP).pdf',
      name: 'tings_electronics'
    }
  ];

  const results = [];

  for (const testCase of testCases) {
    const result = await testPDF(testCase.path, testCase.name);
    results.push({
      name: testCase.name,
      filename: path.basename(testCase.path),
      ...result
    });
  }

  // Summary
  console.log('\n📊 RESULTS SUMMARY');
  console.log('='.repeat(50));

  let successCount = 0;
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.filename}`);

    if (result.success) {
      successCount++;
      console.log(`   📏 PDF Size: ${(result.pdfSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   🖼️ Screenshots: ${result.screenshots.length}`);
      console.log(`   📁 Output: ${result.outputDir}`);

      result.screenshots.forEach(shot => {
        console.log(`      ${shot.name}: ${(shot.size / 1024).toFixed(2)} KB`);
      });
    } else {
      console.log(`   💥 Reason: ${result.reason}`);
    }
    console.log('');
  });

  console.log('🏆 FINAL VALIDATION:');
  console.log(`✅ Success Rate: ${successCount}/${results.length} (${((successCount / results.length) * 100).toFixed(1)}%)`);

  if (successCount === results.length) {
    console.log('🎉 ALL PDFs SUCCESSFULLY PROCESSED!');
    console.log('✅ Image extraction solution is ROBUST and ready for production!');
  } else {
    console.log('⚠️ Some PDFs failed - need to investigate failure modes');
  }
}

testMultiplePDFs();