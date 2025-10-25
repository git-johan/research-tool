'use client';

import { useState, useEffect } from 'react';

/**
 * Hook to detect and track the current theme (light/dark mode)
 * Based on the user's system preference (prefers-color-scheme)
 */
export function useTheme(): 'light' | 'dark' {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    // Check initial system preference
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const isDark = mediaQuery.matches;
    setTheme(isDark ? 'dark' : 'light');

    // Listen for changes in system preference
    const handleChange = (e: MediaQueryListEvent) => {
      setTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);

    // Cleanup listener on unmount
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Return light during SSR to avoid hydration mismatch
  // This ensures consistent rendering between server and client
  if (!isMounted) return 'light';

  return theme;
}