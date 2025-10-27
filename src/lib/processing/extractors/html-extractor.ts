/**
 * HTML Content Extractor
 * Extracts clean text content from HTML files using Cheerio
 */

import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import { ExtractedContent } from './index';

/**
 * Extract text content from HTML file
 */
export async function extractHTMLContent(filePath: string): Promise<ExtractedContent> {
  const startTime = Date.now();

  try {
    // Read HTML file
    const htmlContent = await fs.readFile(filePath, 'utf-8');

    // Load HTML into Cheerio
    const $ = cheerio.load(htmlContent);

    // Extract title from various sources
    let title = '';

    // Try different title sources in order of preference
    const ogTitle = $('meta[property="og:title"]').attr('content');
    const twitterTitle = $('meta[name="twitter:title"]').attr('content');
    const h1Title = $('h1').first().text().trim();
    const pageTitle = $('title').text().trim();

    title = ogTitle || twitterTitle || h1Title || pageTitle || 'HTML Document';

    // Remove unwanted elements that don't contain main content
    $('script, style, nav, header, footer, aside, .nav, .navbar, .sidebar, .menu, .navigation').remove();
    $('[role="navigation"], [role="banner"], [role="contentinfo"], [role="complementary"]').remove();

    // Try to find main content container
    let contentContainer = $('main, [role="main"], .main-content, .content, .post-content, article');

    // If no specific content container found, use body but remove common non-content elements
    if (contentContainer.length === 0) {
      contentContainer = $('body');
      contentContainer.find('.sidebar, .widget, .ad, .advertisement, .social, .share').remove();
    }

    // Extract text content while preserving some structure
    let extractedText = '';

    // Process headings with markdown-style formatting
    contentContainer.find('h1, h2, h3, h4, h5, h6').each((_, element) => {
      const level = parseInt(element.tagName.slice(1));
      const headingText = $(element).text().trim();
      if (headingText) {
        extractedText += '\n\n' + '#'.repeat(level) + ' ' + headingText + '\n\n';
      }
    });

    // Process paragraphs
    contentContainer.find('p').each((_, element) => {
      const paragraphText = $(element).text().trim();
      if (paragraphText) {
        extractedText += paragraphText + '\n\n';
      }
    });

    // Process lists
    contentContainer.find('ul, ol').each((_, element) => {
      $(element).find('li').each((_, listItem) => {
        const listText = $(listItem).text().trim();
        if (listText) {
          extractedText += '- ' + listText + '\n';
        }
      });
      extractedText += '\n';
    });

    // Process any remaining text that wasn't captured above
    const remainingText = contentContainer.clone();
    remainingText.find('h1, h2, h3, h4, h5, h6, p, ul, ol').remove();
    const additionalText = remainingText.text().trim();
    if (additionalText) {
      extractedText += additionalText + '\n';
    }

    // Clean up the extracted text
    extractedText = extractedText
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Remove excessive newlines
      .replace(/^\s+|\s+$/g, '') // Trim whitespace
      .replace(/[ \t]+/g, ' '); // Normalize spaces

    // If no content was extracted, fall back to getting all text
    if (!extractedText || extractedText.length < 50) {
      extractedText = $('body').text()
        .replace(/\s+/g, ' ')
        .trim();
    }

    const extractionTime = Date.now() - startTime;
    const wordCount = extractedText.split(/\s+/).filter(word => word.length > 0).length;

    // Extract additional metadata
    const description = $('meta[name="description"]').attr('content') ||
                       $('meta[property="og:description"]').attr('content') || '';

    const author = $('meta[name="author"]').attr('content') ||
                  $('meta[property="article:author"]').attr('content') || '';

    return {
      text: extractedText,
      metadata: {
        title,
        description,
        author,
        wordCount,
        extractionTime,
        contentLength: extractedText.length,
        originalFileSize: htmlContent.length
      }
    };

  } catch (error) {
    const extractionTime = Date.now() - startTime;
    throw new Error(`HTML extraction failed after ${extractionTime}ms: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract text content from HTML string (for testing or direct content processing)
 */
export function extractHTMLFromString(htmlString: string): { text: string; title: string; metadata: any } {
  const $ = cheerio.load(htmlString);

  // Extract title
  const title = $('title').text().trim() ||
                $('meta[property="og:title"]').attr('content') ||
                $('h1').first().text().trim() ||
                'HTML Content';

  // Remove unwanted elements
  $('script, style, nav, header, footer, aside').remove();

  // Extract clean text
  let text = $('body').text()
    .replace(/\s+/g, ' ')
    .trim();

  const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;

  return {
    text,
    title,
    metadata: {
      wordCount,
      contentLength: text.length,
      originalLength: htmlString.length
    }
  };
}