/**
 * Simple color utilities for persona chat bubbles
 */

/**
 * Generate styling for persona chat bubbles using neutral gray colors
 * @param personaColor - Unused, kept for compatibility
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
    // Dark mode: Darker gray to complement the darker page background
    return {
      backgroundColor: "#2A2A2A", // Darker gray to match the darker page background
      textColor: "var(--text-primary)",
    };
  } else {
    // Light mode: Use the original sender gray
    return {
      backgroundColor: "var(--bg-secondary)",
      textColor: "var(--text-primary)",
    };
  }
}