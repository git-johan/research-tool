/**
 * Sprell.no Variant Extractor
 * Extracts variant data directly from __NEXT_DATA__ JSON without using OpenAI
 */

import { fetchHtmlWithFallback } from '../../scrape-product';
import { fetchHtmlWithBrowser } from '../../browser-scraper';
import type { VariantData } from './xxl-extractor';

/**
 * Extract variant data from Sprell.no pages
 * Extracts data directly from __NEXT_DATA__ JSON embedded in the page
 */
export async function extractSprellVariant(url: string): Promise<VariantData> {
  console.log('🔍 Extracting Sprell variant data from HTML...');

  // Fetch HTML
  const html = await fetchHtmlWithFallback(url);

  // Extract SKU/EAN from URL pattern: ?code=8717447287308
  const codeMatch = url.match(/[?&]code=([^&]+)/);
  if (!codeMatch) {
    throw new Error(`Could not extract code from URL: ${url}`);
  }
  const sku = codeMatch[1];
  console.log(`   SKU: ${sku}`);

  // Extract __NEXT_DATA__ JSON
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!nextDataMatch) {
    throw new Error('Could not find __NEXT_DATA__ in page HTML');
  }

  let nextData: any;
  try {
    nextData = JSON.parse(nextDataMatch[1]);
  } catch (error) {
    throw new Error(`Failed to parse __NEXT_DATA__ JSON: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Navigate to the variants array
  const queries = nextData?.props?.pageProps?.dehydratedState?.queries;
  if (!queries || !Array.isArray(queries)) {
    throw new Error('Could not find queries array in __NEXT_DATA__');
  }

  // Find the query that contains the product data with variants
  let productData: any = null;
  for (const query of queries) {
    if (query?.state?.data?.variants && Array.isArray(query.state.data.variants)) {
      productData = query.state.data;
      break;
    }
  }

  if (!productData || !productData.variants) {
    throw new Error('Could not find product data with variants in __NEXT_DATA__');
  }

  // Find the variant that matches this SKU
  const variant = productData.variants.find((v: any) =>
    v.sku === sku || v.ean === sku || v.id?.includes(sku)
  );

  if (!variant) {
    throw new Error(`Could not find variant matching SKU: ${sku}`);
  }

  // Extract variant_name from technicalSpecifications (color field)
  let variant_name = '';
  if (variant.technicalSpecifications && Array.isArray(variant.technicalSpecifications)) {
    for (const spec of variant.technicalSpecifications) {
      if (spec.items && Array.isArray(spec.items)) {
        for (const item of spec.items) {
          if ((item.label === 'Farge' || item.name === 'Farge') && item.value) {
            variant_name = item.value.toLowerCase();
            break;
          }
        }
      }
      if (variant_name) break;
    }
  }
  console.log(`   Variant Name: ${variant_name || '(none)'}`);

  // Extract price
  const current_price = variant.price?.unitPrice?.amount;
  const currency = variant.price?.unitPrice?.currency || 'NOK';
  console.log(`   Price: ${current_price} ${currency}`);

  // Check stock status via Sprell's inventory API
  let in_stock = true; // Default to true if API fails
  console.log(`   Checking inventory API for stock status...`);

  try {
    const inventoryUrl = `https://api.sprell-no.getadigital.cloud/catalog/inventory?skus=${sku}`;
    const inventoryResponse = await fetch(inventoryUrl);

    if (!inventoryResponse.ok) {
      throw new Error(`Inventory API returned ${inventoryResponse.status}`);
    }

    const inventoryData: any = await inventoryResponse.json();

    // Check if product is available in ANY warehouse (online or stores)
    const hasStock = inventoryData.result?.some((warehouse: any) =>
      warehouse.available > 0
    );

    in_stock = hasStock || false;
    console.log(`   Stock: Checked ${inventoryData.result?.length || 0} warehouses → in_stock: ${in_stock}`);

  } catch (error) {
    console.log(`   ⚠️  Failed to fetch inventory: ${error instanceof Error ? error.message : String(error)}`);
    console.log(`   Defaulting to in_stock: true`);
    in_stock = true;
  }

  return {
    variant_name,
    sku: variant.sku || variant.ean || sku,
    current_price,
    currency,
    in_stock
  };
}

/**
 * Discover all variant URLs for a Sprell.no product
 * Extracts variant information from __NEXT_DATA__ JSON
 */
export async function discoverSprellVariants(url: string): Promise<string[]> {
  console.log('🔍 Discovering variants for sprell.no...');

  // Fetch HTML
  const html = await fetchHtmlWithFallback(url);

  // Extract __NEXT_DATA__ JSON
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);

  if (!nextDataMatch) {
    console.log('   ⚠️  Could not find __NEXT_DATA__, returning original URL');
    return [url];
  }

  try {
    const nextData = JSON.parse(nextDataMatch[1]);

    // Navigate to the queries array
    const queries = nextData?.props?.pageProps?.dehydratedState?.queries;
    if (!queries || !Array.isArray(queries)) {
      console.log('   ⚠️  Could not find queries array, returning original URL');
      return [url];
    }

    // Find the query that contains the product data
    let productData: any = null;
    for (const query of queries) {
      if (query?.state?.data?.variants && Array.isArray(query.state.data.variants)) {
        productData = query.state.data;
        break;
      }
    }

    if (!productData || !productData.variants) {
      console.log('   ⚠️  Could not find product data with variants, returning original URL');
      return [url];
    }

    const variants = productData.variants;
    const baseSlug = productData.slug;

    if (!baseSlug) {
      console.log('   ⚠️  Could not find base slug, returning original URL');
      return [url];
    }

    console.log(`   Found ${variants.length} variants`);
    console.log(`   Base slug: ${baseSlug}`);

    const urlObj = new URL(url);
    const variantUrls: string[] = [];

    // Process each variant
    for (const variant of variants) {
      const ean = variant.ean;
      const variantId = variant.id; // Format: "8717447287308_no"
      const sku = variant.sku || ean;

      if (!ean || !variantId || !sku) {
        console.log(`   Skipping variant without required fields`);
        continue;
      }

      // Extract color from technicalSpecifications
      let colorName = '';
      if (variant.technicalSpecifications && Array.isArray(variant.technicalSpecifications)) {
        for (const spec of variant.technicalSpecifications) {
          if (spec.items && Array.isArray(spec.items)) {
            for (const item of spec.items) {
              if ((item.label === 'Farge' || item.name === 'Farge') && item.value) {
                // Normalize color name to URL-friendly format
                colorName = item.value
                  .toLowerCase()
                  .replace(/\s+/g, '-')
                  .replace(/å/g, 'a')
                  .replace(/æ/g, 'ae')
                  .replace(/ø/g, 'o');
                break;
              }
            }
          }
          if (colorName) break;
        }
      }

      if (!colorName) {
        console.log(`   Skipping variant without color information`);
        continue;
      }

      // Generate variant-specific slug by replacing the color in the base slug
      // Base slug format: "bugaboo-butterfly-2-komplett-vogn-deep-indigo---superkompakt-reisevogn"
      // We need to replace the color part
      let variantSlug = baseSlug;

      // Find and replace the color in the slug
      // Common pattern: product-name-{color}--remaining-text
      const slugParts = baseSlug.split('---');
      if (slugParts.length >= 2) {
        // Split the first part to find where to insert the new color
        const firstPart = slugParts[0];
        const words = firstPart.split('-');

        // Remove potential old color (typically the last few words before ---)
        // and add the new color
        const productNameWords = words.slice(0, -2); // Remove last 2-3 words that might be color
        const newFirstPart = [...productNameWords, colorName].join('-');
        variantSlug = [newFirstPart, ...slugParts.slice(1)].join('---');
      } else {
        // Fallback: just append color before the last segment
        const words = baseSlug.split('-');
        words.splice(-2, 0, colorName);
        variantSlug = words.join('-');
      }

      // Construct variant URL
      const variantUrl = `${urlObj.origin}/product/${variantSlug}--${variantId}?code=${sku}`;
      variantUrls.push(variantUrl);

      console.log(`   - ${colorName}: ${variantUrl}`);
    }

    if (variantUrls.length === 0) {
      console.log('   Could not construct variant URLs, returning original URL');
      return [url];
    }

    console.log(`   Returning ${variantUrls.length} variant URLs`);
    return variantUrls;

  } catch (error) {
    console.log(`   ⚠️  Error parsing __NEXT_DATA__: ${error instanceof Error ? error.message : String(error)}`);
    return [url];
  }
}
