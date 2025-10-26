/**
 * XXL.no Variant Extractor
 * Extracts variant data directly from __NEXT_DATA__ JSON without using OpenAI
 */

import { fetchHtmlWithFallback } from '../../scrape-product';

export interface VariantData {
  variant_name: string;
  sku: string;
  current_price?: number;
  currency?: string;
  in_stock: boolean;
}

/**
 * Extract variant data from XXL.no pages
 * Extracts data directly from __NEXT_DATA__ JSON embedded in the page
 */
export async function extractXxlVariant(url: string): Promise<VariantData> {
  console.log('🔍 Extracting XXL variant data from HTML...');

  // Fetch HTML
  const html = await fetchHtmlWithFallback(url);

  // Extract SKU from URL pattern: /p/1199201_1_Style
  const skuMatch = url.match(/\/p\/([^\/\?]+)/);
  if (!skuMatch) {
    throw new Error(`Could not extract SKU from URL: ${url}`);
  }
  const sku = skuMatch[1];
  console.log(`   SKU: ${sku}`);

  // Extract __NEXT_DATA__ JSON
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s);
  if (!nextDataMatch) {
    throw new Error('Could not find __NEXT_DATA__ in page HTML');
  }

  let nextData: any;
  try {
    nextData = JSON.parse(nextDataMatch[1]);
  } catch (error) {
    throw new Error(`Failed to parse __NEXT_DATA__ JSON: ${error instanceof Error ? error.message : String(error)}`);
  }

  const products = nextData?.props?.pageProps?.newPdpProps?.initialElevateProductPageData?.baseProduct?.products;
  if (!products || !Array.isArray(products)) {
    throw new Error('Could not find products array in __NEXT_DATA__');
  }

  // Find the product that matches this URL
  const product = products.find((p: any) => {
    const productUrl = `${new URL(url).origin}${p.url}`;
    return productUrl === url;
  });

  if (!product) {
    throw new Error(`Could not find product matching URL: ${url}`);
  }

  // Extract variant_name from baseColor
  const variant_name = product.baseColor || 'unknown';
  console.log(`   Variant Name: ${variant_name}`);

  // Extract price
  const current_price = product.price?.selling?.range?.min?.value;
  const currency = 'NOK'; // XXL.no is Norwegian
  console.log(`   Price: ${current_price} ${currency}`);

  // Calculate in_stock from availability data
  let totalOnlineStock = 0;
  let stockStatus = 'OUTOFSTOCK';

  if (product.variants && Array.isArray(product.variants)) {
    product.variants.forEach((variant: any) => {
      if (variant.availability && Array.isArray(variant.availability)) {
        const onlineAvail = variant.availability.find((a: any) => a.channel === 'ONLINE');
        if (onlineAvail) {
          totalOnlineStock += onlineAvail.stockNumber || 0;
          if (onlineAvail.stockStatus === 'INSTOCK') {
            stockStatus = 'INSTOCK';
          } else if (onlineAvail.stockStatus === 'LOWSTOCK' && stockStatus !== 'INSTOCK') {
            stockStatus = 'LOWSTOCK';
          }
        }
      }
    });
  }

  const in_stock = stockStatus === 'INSTOCK' || stockStatus === 'LOWSTOCK';
  console.log(`   Stock: ${totalOnlineStock} units (${stockStatus}) → in_stock: ${in_stock}`);

  return {
    variant_name: variant_name.toLowerCase(), // Lowercase for consistency
    sku,
    current_price,
    currency,
    in_stock
  };
}

/**
 * Discover all variant URLs for a XXL.no product
 * Extracts variant information from __NEXT_DATA__ JSON
 */
export async function discoverXxlVariants(url: string): Promise<string[]> {
  console.log('🔍 Discovering variants for xxl.no...');

  // Fetch HTML
  const html = await fetchHtmlWithFallback(url);

  // Extract __NEXT_DATA__ JSON
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s);

  if (!nextDataMatch) {
    console.log('   ⚠️  Could not find __NEXT_DATA__, falling back to URL pattern matching');
    return discoverXxlVariantsFallback(html, url);
  }

  try {
    const nextData = JSON.parse(nextDataMatch[1]);
    const products = nextData?.props?.pageProps?.newPdpProps?.initialElevateProductPageData?.baseProduct?.products;

    if (!products || !Array.isArray(products)) {
      console.log('   ⚠️  Could not parse products from __NEXT_DATA__, falling back');
      return discoverXxlVariantsFallback(html, url);
    }

    console.log(`   Found ${products.length} color variants with stock information`);

    const urlObj = new URL(url);
    const variantUrls: string[] = [];

    // Process each product (color variant)
    products.forEach((product: any) => {
      const variantUrl = `${urlObj.origin}${product.url}`;
      variantUrls.push(variantUrl);

      // Calculate total online stock across all sizes
      let totalOnlineStock = 0;
      let stockStatus = 'OUTOFSTOCK';

      if (product.variants && Array.isArray(product.variants)) {
        product.variants.forEach((variant: any) => {
          if (variant.availability && Array.isArray(variant.availability)) {
            const onlineAvail = variant.availability.find((a: any) => a.channel === 'ONLINE');
            if (onlineAvail) {
              totalOnlineStock += onlineAvail.stockNumber || 0;
              if (onlineAvail.stockStatus === 'INSTOCK') {
                stockStatus = 'INSTOCK';
              } else if (onlineAvail.stockStatus === 'LOWSTOCK' && stockStatus !== 'INSTOCK') {
                stockStatus = 'LOWSTOCK';
              }
            }
          }
        });
      }

      // Use baseColor field for cleaner color names
      const colorName = product.baseColor || 'unknown';
      console.log(`   - ${colorName}: ${totalOnlineStock} units (${stockStatus})`);
    });

    console.log(`   Returning ${variantUrls.length} variant URLs with stock data`);
    return variantUrls;

  } catch (error) {
    console.log(`   ⚠️  Error parsing __NEXT_DATA__: ${error instanceof Error ? error.message : String(error)}`);
    return discoverXxlVariantsFallback(html, url);
  }
}

/**
 * Fallback method: Extract variant URLs using pattern matching
 * Used when __NEXT_DATA__ parsing fails
 */
function discoverXxlVariantsFallback(html: string, url: string): string[] {
  console.log('   Using fallback URL pattern matching...');

  const variantUrls = new Set<string>();
  const urlPattern = /"url":"(\/[^"]*\/p\/\d+_\d+_Style)"/g;
  let urlMatch;

  while ((urlMatch = urlPattern.exec(html)) !== null) {
    const relativePath = urlMatch[1];
    const urlObj = new URL(url);
    const absoluteUrl = `${urlObj.origin}${relativePath}`;
    variantUrls.add(absoluteUrl);
  }

  if (variantUrls.size === 0) {
    console.log('   No variants found, returning original URL');
    return [url];
  }

  const urls = Array.from(variantUrls);
  console.log(`   Found ${urls.length} variant URLs`);
  return urls;
}
