/**
 * Color utility functions for persona chat bubbles
 */

/**
 * Convert hex color to RGB values
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  // Remove # if present
  hex = hex.replace("#", "");

  // Convert 3-digit hex to 6-digit
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((char) => char + char)
      .join("");
  }

  if (hex.length !== 6) {
    return null;
  }

  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  return { r, g, b };
}

/**
 * Convert RGB to hex color
 */
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.round(Math.max(0, Math.min(255, n))).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Calculate the relative luminance of a color
 * Used for determining contrast ratios
 */
function getLuminance(r: number, g: number, b: number): number {
  // Convert RGB to sRGB
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });

  // Calculate luminance
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Create a lighter tint of a color
 * @param hexColor - The original hex color
 * @param amount - Amount to lighten (0-1, where 0.85 means 85% lighter)
 * @returns Lightened hex color
 */
export function lightenColor(hexColor: string, amount: number = 0.85): string {
  const rgb = hexToRgb(hexColor);
  if (!rgb) return hexColor; // Return original if invalid

  // Mix with white to create a lighter tint
  const { r, g, b } = rgb;
  const lightR = r + (255 - r) * amount;
  const lightG = g + (255 - g) * amount;
  const lightB = b + (255 - b) * amount;

  return rgbToHex(lightR, lightG, lightB);
}

/**
 * Create a darker shade of a color
 * @param hexColor - The original hex color
 * @param amount - Amount to darken (0-1, where 0.95 means 95% darker for dark mode)
 * @returns Darkened hex color
 */
export function darkenColor(hexColor: string, amount: number = 0.3): string {
  const rgb = hexToRgb(hexColor);
  if (!rgb) return hexColor; // Return original if invalid

  // Mix with black to create a darker shade
  const { r, g, b } = rgb;
  const darkR = r * (1 - amount);
  const darkG = g * (1 - amount);
  const darkB = b * (1 - amount);

  return rgbToHex(darkR, darkG, darkB);
}

/**
 * Determine the optimal text color (white or dark) for a given background color
 * @param backgroundColor - Background color in hex format
 * @returns 'white' or 'dark' based on contrast requirements
 */
export function getOptimalTextColor(backgroundColor: string): "white" | "dark" {
  const rgb = hexToRgb(backgroundColor);
  if (!rgb) return "dark"; // Default to dark if invalid color

  const luminance = getLuminance(rgb.r, rgb.g, rgb.b);

  // Use WCAG guidelines: if luminance > 0.5, use dark text, otherwise use white
  return luminance > 0.5 ? "dark" : "white";
}

/**
 * Generate complete styling for persona chat bubbles
 * @param personaColor - The persona's signature color
 * @param theme - Current theme mode ('light' | 'dark')
 * @returns Object with backgroundColor and textColor
 */
export function generatePersonaBubbleStyles(
  personaColor: string,
  theme: "light" | "dark" = "light",
): {
  backgroundColor: string;
  textColor: string;
} {
  if (theme === "dark") {
    // Dark mode: Use much darker shade with light text
    const darkBackground = darkenColor(personaColor, 0.75);
    return {
      backgroundColor: darkBackground,
      textColor: "var(--text-primary)", // Uses CSS variable for proper dark mode text
    };
  } else {
    // Light mode: Use lighter tint with dark text
    const lightBackground = lightenColor(personaColor, 0.85);
    return {
      backgroundColor: lightBackground,
      textColor: "var(--text-primary)", // Uses CSS variable for proper light mode text
    };
  }
}
