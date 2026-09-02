import { useMedia } from "react-use";

export function usePrefersReducedMotion(): boolean {
  return useMedia("(prefers-reduced-motion: reduce)", false);
}
