/**
 * Schema.org Data Extractor
 * Extracts structured data from web pages in all three Schema.org formats:
 * - JSON-LD (JavaScript Object Notation for Linked Data)
 * - Microdata (HTML attributes: itemscope, itemtype, itemprop)
 * - RDFa (Resource Description Framework in Attributes)
 */

import { decodeHtmlEntities, decodeHtmlEntitiesInObject } from '../utils/html-entities';

export interface SchemaProduct {
  name?: string;
  brand?: string;
  model?: string;
  description?: string;
  sku?: string;
  gtin?: string;
  mpn?: string;
  category?: string;
  image?: string[];
  price?: string;
  priceCurrency?: string;
  availability?: string;
  url?: string;
  [key: string]: any; // Allow additional properties
}

export interface SchemaExtractionResult {
  jsonLd: any[];
  microdata: any[];
  rdfa: any[];
  products: SchemaProduct[];
  totalCount: number;
}

/**
 * Fetch web page HTML
 */
async function fetchPage(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch page: ${response.status} ${response.statusText}`);
  }

  return await response.text();
}

/**
 * Extract JSON-LD structured data
 */
function extractJsonLd(html: string): any[] {
  const results: any[] = [];
  const jsonLdMatches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/gis);

  for (const match of jsonLdMatches) {
    try {
      const data = JSON.parse(match[1]);
      // Handle both single objects and arrays
      const items = Array.isArray(data) ? data : [data];
      // Decode HTML entities in all string values
      const decodedItems = items.map(item => decodeHtmlEntitiesInObject(item));
      results.push(...decodedItems);
    } catch (e) {
      // Ignore JSON parse errors
      console.warn('⚠️  Failed to parse JSON-LD:', e);
    }
  }

  return results;
}

/**
 * Extract Microdata structured data
 * Parses itemscope, itemtype, itemprop attributes
 */
function extractMicrodata(html: string): any[] {
  const results: any[] = [];

  // Find all itemscope elements
  const itemscopeRegex = /<[^>]*itemscope[^>]*>/gi;
  const matches = html.matchAll(itemscopeRegex);

  for (const match of matches) {
    const tag = match[0];

    // Extract itemtype
    const itemtypeMatch = tag.match(/itemtype=["']([^"']+)["']/i);
    if (!itemtypeMatch) continue;

    const itemtype = itemtypeMatch[1];
    const item: any = { '@type': itemtype.split('/').pop() };

    // Find the closing tag and extract content
    const startPos = match.index || 0;
    const tagName = tag.match(/<(\w+)/)?.[1];
    if (!tagName) continue;

    // Extract the element's content (simplified - just look for itemprop within reasonable distance)
    const contentSlice = html.slice(startPos, startPos + 5000);

    // Extract all itemprop values within this scope
    const itempropMatches = contentSlice.matchAll(/<[^>]*itemprop=["']([^"']+)["'][^>]*>([^<]*)</gi);

    for (const propMatch of itempropMatches) {
      const propName = propMatch[1];
      const propValue = decodeHtmlEntities(propMatch[2].trim());

      if (propValue) {
        // Handle nested properties (e.g., "brand.name")
        if (propName.includes('.')) {
          const parts = propName.split('.');
          let current = item;
          for (let i = 0; i < parts.length - 1; i++) {
            current[parts[i]] = current[parts[i]] || {};
            current = current[parts[i]];
          }
          current[parts[parts.length - 1]] = propValue;
        } else {
          item[propName] = propValue;
        }
      }
    }

    // Only add if we found at least one property
    if (Object.keys(item).length > 1) {
      results.push(item);
    }
  }

  return results;
}

/**
 * Extract RDFa structured data
 * Parses vocab, typeof, property attributes
 */
function extractRdfa(html: string): any[] {
  const results: any[] = [];

  // Find all elements with typeof attribute (indicates RDFa resource)
  const typeofRegex = /<[^>]*typeof=["']([^"']+)["'][^>]*>/gi;
  const matches = html.matchAll(typeofRegex);

  for (const match of matches) {
    const typeofValue = match[1];

    const item: any = { '@type': typeofValue };

    // Find the closing tag and extract content
    const startPos = match.index || 0;
    const contentSlice = html.slice(startPos, startPos + 5000);

    // Extract all property values within this scope
    const propertyMatches = contentSlice.matchAll(/<[^>]*property=["']([^"']+)["'][^>]*>([^<]*)</gi);

    for (const propMatch of propertyMatches) {
      const propName = propMatch[1];
      let propValue = decodeHtmlEntities(propMatch[2].trim());

      // RDFa properties often have namespace prefixes like "schema:name"
      const cleanPropName = propName.split(':').pop() || propName;

      if (propValue) {
        item[cleanPropName] = propValue;
      }
    }

    // Also check for content attributes (common in RDFa)
    const contentMatches = contentSlice.matchAll(/<[^>]*property=["']([^"']+)["'][^>]*content=["']([^"']+)["']/gi);

    for (const contentMatch of contentMatches) {
      const propName = contentMatch[1].split(':').pop() || contentMatch[1];
      const propValue = decodeHtmlEntities(contentMatch[2]);
      item[propName] = propValue;
    }

    // Only add if we found at least one property
    if (Object.keys(item).length > 1) {
      results.push(item);
    }
  }

  return results;
}

/**
 * Normalize a schema object to SchemaProduct format
 */
function normalizeToProduct(obj: any): SchemaProduct | null {
  // Check if this is a Product type (case-insensitive)
  const type = obj['@type']?.toLowerCase() || '';
  if (!type.includes('product')) {
    return null;
  }

  const product: SchemaProduct = {};

  // Map common fields
  if (obj.name) product.name = obj.name;
  if (obj.brand) {
    product.brand = typeof obj.brand === 'string' ? obj.brand : obj.brand.name;
  }
  if (obj.model) product.model = obj.model;
  if (obj.description) product.description = obj.description;
  if (obj.sku) product.sku = obj.sku;
  if (obj.gtin || obj.gtin13 || obj.gtin8) {
    product.gtin = obj.gtin || obj.gtin13 || obj.gtin8;
  }
  if (obj.mpn) product.mpn = obj.mpn;
  if (obj.category) product.category = obj.category;

  // Handle image (can be string or array)
  if (obj.image) {
    product.image = Array.isArray(obj.image) ? obj.image : [obj.image];
  }

  // Handle offers/price
  if (obj.offers) {
    const offer = Array.isArray(obj.offers) ? obj.offers[0] : obj.offers;
    if (offer.price) product.price = offer.price.toString();
    if (offer.priceCurrency) product.priceCurrency = offer.priceCurrency;
    if (offer.availability) product.availability = offer.availability;
  }

  if (obj.url) product.url = obj.url;

  // Only return if we found at least name or brand
  if (product.name || product.brand) {
    return product;
  }

  return null;
}

/**
 * Extract all products from all formats
 */
function extractProducts(jsonLd: any[], microdata: any[], rdfa: any[]): SchemaProduct[] {
  const products: SchemaProduct[] = [];

  // Process JSON-LD
  for (const item of jsonLd) {
    const product = normalizeToProduct(item);
    if (product) products.push(product);
  }

  // Process Microdata
  for (const item of microdata) {
    const product = normalizeToProduct(item);
    if (product) products.push(product);
  }

  // Process RDFa
  for (const item of rdfa) {
    const product = normalizeToProduct(item);
    if (product) products.push(product);
  }

  return products;
}

/**
 * Main extraction function
 * Extracts all Schema.org data from a URL in all three formats
 */
export async function extractSchemaData(url: string): Promise<SchemaExtractionResult> {
  try {
    // Fetch the page
    const html = await fetchPage(url);

    // Extract from all three formats
    const jsonLd = extractJsonLd(html);
    const microdata = extractMicrodata(html);
    const rdfa = extractRdfa(html);

    // Extract products
    const products = extractProducts(jsonLd, microdata, rdfa);

    return {
      jsonLd,
      microdata,
      rdfa,
      products,
      totalCount: jsonLd.length + microdata.length + rdfa.length
    };
  } catch (error) {
    console.error(`Error extracting schema data: ${error}`);
    return {
      jsonLd: [],
      microdata: [],
      rdfa: [],
      products: [],
      totalCount: 0
    };
  }
}
