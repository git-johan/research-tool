/**
 * HTML Entity Decoder
 * Decodes HTML entities (both named and numeric) in text strings
 */

// Map of common named HTML entities
const namedEntities: Record<string, string> = {
  // Common entities
  'amp': '&',
  'lt': '<',
  'gt': '>',
  'quot': '"',
  'apos': "'",
  'nbsp': ' ',

  // Extended Latin characters (used in Scandinavian languages)
  'Auml': 'Ä',
  'auml': 'ä',
  'Ouml': 'Ö',
  'ouml': 'ö',
  'Uuml': 'Ü',
  'uuml': 'ü',
  'Aring': 'Å',
  'aring': 'å',
  'AElig': 'Æ',
  'aelig': 'æ',
  'Oslash': 'Ø',
  'oslash': 'ø',

  // Common European characters
  'Agrave': 'À',
  'agrave': 'à',
  'Aacute': 'Á',
  'aacute': 'á',
  'Acirc': 'Â',
  'acirc': 'â',
  'Atilde': 'Ã',
  'atilde': 'ã',
  'Ccedil': 'Ç',
  'ccedil': 'ç',
  'Egrave': 'È',
  'egrave': 'è',
  'Eacute': 'É',
  'eacute': 'é',
  'Ecirc': 'Ê',
  'ecirc': 'ê',
  'Euml': 'Ë',
  'euml': 'ë',
  'Igrave': 'Ì',
  'igrave': 'ì',
  'Iacute': 'Í',
  'iacute': 'í',
  'Icirc': 'Î',
  'icirc': 'î',
  'Iuml': 'Ï',
  'iuml': 'ï',
  'Ntilde': 'Ñ',
  'ntilde': 'ñ',
  'Ograve': 'Ò',
  'ograve': 'ò',
  'Oacute': 'Ó',
  'oacute': 'ó',
  'Ocirc': 'Ô',
  'ocirc': 'ô',
  'Otilde': 'Õ',
  'otilde': 'õ',
  'Ugrave': 'Ù',
  'ugrave': 'ù',
  'Uacute': 'Ú',
  'uacute': 'ú',
  'Ucirc': 'Û',
  'ucirc': 'û',
  'Yacute': 'Ý',
  'yacute': 'ý',
  'Yuml': 'Ÿ',
  'yuml': 'ÿ',

  // Special characters
  'copy': '©',
  'reg': '®',
  'trade': '™',
  'euro': '€',
  'pound': '£',
  'yen': '¥',
  'cent': '¢',
  'sect': '§',
  'deg': '°',
  'plusmn': '±',
  'frac14': '¼',
  'frac12': '½',
  'frac34': '¾',
  'times': '×',
  'divide': '÷',
  'hellip': '…',
  'mdash': '—',
  'ndash': '–',
  'laquo': '«',
  'raquo': '»',
  'lsquo': '\u2018',
  'rsquo': '\u2019',
  'ldquo': '\u201C',
  'rdquo': '\u201D',
  'bull': '•',
};

/**
 * Decode HTML entities in a string
 * Handles both named entities (&amp;) and numeric entities (&#228; or &#xE4;)
 */
export function decodeHtmlEntities(text: string): string {
  if (!text || typeof text !== 'string') {
    return text;
  }

  return text
    // Decode numeric entities (hex format: &#xHH; or &#xHHHH;)
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) => {
      return String.fromCharCode(parseInt(hex, 16));
    })
    // Decode numeric entities (decimal format: &#DDD;)
    .replace(/&#(\d+);/g, (_, dec) => {
      return String.fromCharCode(parseInt(dec, 10));
    })
    // Decode named entities (&amp;, &nbsp;, etc.)
    .replace(/&([a-zA-Z]+);/g, (match, entity) => {
      return namedEntities[entity] || match;
    });
}

/**
 * Recursively decode HTML entities in an object or array
 * Processes all string values found in nested structures
 */
export function decodeHtmlEntitiesInObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle strings
  if (typeof obj === 'string') {
    return decodeHtmlEntities(obj);
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => decodeHtmlEntitiesInObject(item));
  }

  // Handle objects
  if (typeof obj === 'object') {
    const decoded: any = {};
    for (const [key, value] of Object.entries(obj)) {
      decoded[key] = decodeHtmlEntitiesInObject(value);
    }
    return decoded;
  }

  // Return primitives as-is
  return obj;
}
