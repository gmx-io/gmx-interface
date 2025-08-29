import { useBreakpoints } from "lib/breakpoints";

export function usePoolsIsMobilePage() {
  const { isMobile } = useBreakpoints();
  return isMobile;
}
