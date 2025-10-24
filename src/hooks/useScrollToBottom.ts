import { useEffect, useRef } from "react";

/**
 * Hook to auto-scroll to bottom of a container when dependencies change
 * @param dependencies - Array of values that trigger scroll when they change
 * @returns Ref to attach to the element you want to scroll into view
 */
export function useScrollToBottom<T extends HTMLElement = HTMLDivElement>(
  dependencies: unknown[]
) {
  const elementRef = useRef<T>(null);

  useEffect(() => {
    elementRef.current?.scrollIntoView({ behavior: "smooth" });
  }, dependencies);

  return elementRef;
}
