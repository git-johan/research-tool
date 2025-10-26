/**
 * Barnashus.no Variant Extractor
 * Discovers variants by analyzing button elements with aria-label attributes
 */

import { fetchHtmlWithFallback } from '../../scrape-product';
import type { VariantData } from './xxl-extractor';

/**
 * Extract variant data from Barnashus.no pages
 * Extracts data directly from window.CURRENT_PAGE JavaScript object embedded in the page
 */
export async function extractBarnashusVariant(url: string): Promise<VariantData> {
  console.log('🔍 Extracting Barnashus variant data from HTML...');

  // Fetch HTML
  const html = await fetchHtmlWithFallback(url);

  // Extract color/variant from URL (e.g., /stokke-tripp-trapp-barnestol-nature -> "nature")
  const urlPath = new URL(url).pathname;
  const pathSegments = urlPath.split('/').filter(s => s);
  const lastSegment = pathSegments[pathSegments.length - 1] || '';
  const colorFromUrl = lastSegment.split('-').pop() || '';
  console.log(`   Color from URL: ${colorFromUrl}`);

  // Extract window.CURRENT_PAGE JavaScript object
  const currentPageMatch = html.match(/window\.CURRENT_PAGE\s*=\s*({[\s\S]*?});/);
  if (!currentPageMatch) {
    throw new Error('Could not find window.CURRENT_PAGE in page HTML');
  }

  let product: any;
  try {
    product = JSON.parse(currentPageMatch[1]);
  } catch (error) {
    throw new Error(`Failed to parse window.CURRENT_PAGE JSON: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Product data is directly in CURRENT_PAGE, not nested
  // Extract variant_name from colorName field or URL
  const variant_name = product.colorName || product.erpColor || colorFromUrl || '';
  console.log(`   Variant Name: ${variant_name || '(none)'}`);

  // Extract SKU
  const sku = product.code || product.ean || '';
  console.log(`   SKU: ${sku}`);

  // Extract price - nested under price.current
  const current_price = product.price?.current?.inclVat || product.realTimePrice?.current?.inclVat;
  const currency = 'NOK';
  console.log(`   Price: ${current_price} ${currency}`);

  // Extract stock status
  // Priority 1: Check online warehouse stock in selectedSizeWithStock.stock
  // Priority 2: Check variations[].stock (for multi-size products)
  // Priority 3: Check storeStock (physical stores) as fallback
  // Stock values: "high"/"medium"/"low" = in stock, "none"/null = out of stock
  let in_stock = false;

  // Check online warehouse stock first (most reliable)
  const onlineStock = product.selectedSizeWithStock?.stock || product.variations?.[0]?.stock;
  if (onlineStock) {
    in_stock = onlineStock !== 'none' && onlineStock !== null && onlineStock !== undefined;
    console.log(`   Online Stock: ${onlineStock} → in_stock: ${in_stock}`);
  } else if (product.storeStock && typeof product.storeStock === 'object') {
    // Fallback: Check physical store inventory
    console.log(`   No online stock field found, checking storeStock...`);
    for (const skuKey of Object.keys(product.storeStock)) {
      const warehouseStocks = product.storeStock[skuKey];
      if (warehouseStocks && typeof warehouseStocks === 'object') {
        for (const stockLevel of Object.values(warehouseStocks)) {
          if (stockLevel !== 'none' && stockLevel !== null) {
            in_stock = true;
            break;
          }
        }
      }
      if (in_stock) break;
    }
    console.log(`   Store Stock: ${in_stock ? 'available' : 'none'} → in_stock: ${in_stock}`);
  } else {
    console.log(`   No stock information found, defaulting to in_stock: false`);
  }

  return {
    variant_name: variant_name.toLowerCase(),
    sku,
    current_price,
    currency,
    in_stock
  };
}

/**
 * Discover all variant URLs for a barnashus.no product
 * Pattern: URL ends with variant identifier (e.g., /product-name-charcoalblack)
 * Variants are in buttons with aria-label attributes
 */
export async function discoverBarnashusVariants(url: string): Promise<string[]> {
  console.log('🔍 Discovering variants for barnashus.no...');

  // Fetch HTML
  const html = await fetchHtmlWithFallback(url);

  // Common non-variant terms to exclude
  const blacklist = [
    'button', 'close', 'menu', 'search', 'logo', 'logotype', 'icon', 'image',
    'favoritter', 'favorites', 'facebook', 'instagram', 'twitter', 'pinterest',
    'linkedin', 'youtube', 'tiktok', 'snapchat', 'email', 'share',
    'kaos', 'cart', 'checkout', 'account', 'profile', 'settings'
  ];

  // Find all variant identifiers from aria-label or alt attributes
  const variantIdentifiers = new Set<string>();

  // Look for buttons that contain images with matching aria-label and alt
  // Pattern: <button aria-label="X">...<img alt="X">
  const buttonPattern = /<button[^>]*aria-label="([a-z0-9\s\-]+)"[^>]*>([\s\S]*?)<\/button>/gi;
  let buttonMatch;

  while ((buttonMatch = buttonPattern.exec(html)) !== null) {
    // Normalize by removing spaces to create URL-friendly identifier
    const ariaLabel = buttonMatch[1].toLowerCase().trim().replace(/\s+/g, '');
    const buttonContent = buttonMatch[2];

    // Check if button contains an image with matching or product-related alt
    const imgAltMatch = buttonContent.match(/alt="([a-z0-9\s\-]+)"/i);

    if (imgAltMatch) {
      // Normalize by removing spaces to create URL-friendly identifier
      const imgAlt = imgAltMatch[1].toLowerCase().trim().replace(/\s+/g, '');

      // If aria-label matches alt, it's likely a variant button
      if (ariaLabel === imgAlt && !blacklist.includes(ariaLabel)) {
        variantIdentifiers.add(ariaLabel);
      }
    }
  }

  console.log(`   Found ${variantIdentifiers.size} variant identifiers`);

  if (variantIdentifiers.size === 0) {
    console.log('   No variants found, returning original URL');
    return [url];
  }

  // Extract base URL by removing the variant identifier from the input URL
  const baseUrl = extractBaseUrl(url, variantIdentifiers);
  console.log(`   Base URL: ${baseUrl}`);

  // Generate variant URLs
  const variantUrls = Array.from(variantIdentifiers).map(
    (identifier) => `${baseUrl}-${identifier}`
  );

  console.log(`   Generated ${variantUrls.length} variant URLs`);

  return variantUrls;
}

/**
 * Extract base URL by removing the variant identifier suffix
 * Uses the discovered variant identifiers to intelligently remove the complete variant suffix
 * Example: https://site.com/product-name-black-core -> https://site.com/product-name
 *
 * @param url The URL to extract base from
 * @param variantIdentifiers Set of normalized variant identifiers (e.g., "black-core", "duskblue-core")
 */
function extractBaseUrl(url: string, variantIdentifiers: Set<string>): string {
  const urlObj = new URL(url);
  const path = urlObj.pathname;

  // Remove trailing slash if present
  const cleanPath = path.endsWith('/') ? path.slice(0, -1) : path;

  // Check if URL ends with any of our discovered variant identifiers
  for (const variantId of Array.from(variantIdentifiers)) {
    if (cleanPath.endsWith(`-${variantId}`)) {
      // Remove the entire variant identifier
      const basePath = cleanPath.substring(0, cleanPath.length - variantId.length - 1);
      return `${urlObj.origin}${basePath}`;
    }
  }

  // Fallback: Find last hyphen and remove everything after it
  const lastHyphenIndex = cleanPath.lastIndexOf('-');
  if (lastHyphenIndex === -1) {
    // No hyphen found, return original URL
    return url;
  }

  const basePath = cleanPath.substring(0, lastHyphenIndex);
  return `${urlObj.origin}${basePath}`;
}
