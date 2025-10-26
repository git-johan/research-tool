/**
 * Tax-Free.no Variant Extractor
 * Extracts variant data directly from JSON-LD structured data without using OpenAI
 */

import { fetchHtmlWithFallback } from '../../scrape-product';
import type { VariantData } from './xxl-extractor';

/**
 * Extract variant data from Tax-Free.no pages
 * Extracts data directly from JSON-LD (schema.org Product) embedded in the page
 */
export async function extractTaxfreeVariant(url: string): Promise<VariantData> {
  console.log('🔍 Extracting Tax-Free variant data from HTML...');

  // Fetch HTML
  const html = await fetchHtmlWithFallback(url);

  // Extract JSON-LD script (in body, not head!)
  const jsonLdMatch = html.match(/<script id="json-ld"[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/s);
  if (!jsonLdMatch) {
    throw new Error('Could not find json-ld script in page HTML');
  }

  let jsonLdArray: any[];
  try {
    jsonLdArray = JSON.parse(jsonLdMatch[1]);
  } catch (error) {
    throw new Error(`Failed to parse JSON-LD: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Find the Product object in the array
  const product = jsonLdArray.find((item: any) => item['@type'] === 'Product');
  if (!product) {
    throw new Error('Could not find Product object in JSON-LD');
  }

  // Extract SKU
  const sku = product.sku || product.productID;
  if (!sku) {
    throw new Error('Could not find SKU in Product data');
  }
  console.log(`   SKU: ${sku}`);

  // Extract variant_name
  // Tax-free.no typically has 1 variant per page, so we'll use "default"
  // Could parse color from description if needed in the future
  const variant_name = 'default';
  console.log(`   Variant Name: ${variant_name}`);

  // Extract price from offers
  const current_price = product.offers?.price;
  const currency = product.offers?.priceCurrency || 'NOK';
  console.log(`   Price: ${current_price} ${currency}`);

  // Extract stock status from availability
  // Possible values: "InStock", "OutOfStock", "PreOrder", "Discontinued"
  const availability = product.offers?.availability || '';
  const in_stock = availability.includes('InStock') || availability.includes('https://schema.org/InStock');
  console.log(`   Availability: ${availability} → in_stock: ${in_stock}`);

  return {
    variant_name: variant_name.toLowerCase(),
    sku,
    current_price,
    currency,
    in_stock
  };
}

/**
 * Discover all variant URLs for a Tax-Free.no product
 * Tax-Free.no typically has 1 variant per page, so we return the original URL
 */
export async function discoverTaxfreeVariants(url: string): Promise<string[]> {
  console.log('🔍 Discovering variants for tax-free.no...');
  console.log('   Tax-Free.no typically has 1 variant per page');
  console.log(`   Returning original URL: ${url}`);

  return [url];
}
