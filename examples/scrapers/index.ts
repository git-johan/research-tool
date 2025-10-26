/**
 * Retailer-Specific Variant Extractors
 *
 * This module contains retailer-specific logic for discovering and extracting
 * variant data. Each retailer has its own extractor with custom logic tailored
 * to that retailer's website structure.
 */

export { extractXxlVariant, discoverXxlVariants } from './xxl-extractor';
export { extractBarnashusVariant, discoverBarnashusVariants } from './barnashus-extractor';
export { extractSprellVariant, discoverSprellVariants } from './sprell-extractor';
export { extractTaxfreeVariant, discoverTaxfreeVariants } from './taxfree-extractor';
export type { VariantData } from './xxl-extractor';
