import { useBreakpoints } from "lib/useBreakpoints";

export function usePoolsIsMobilePage() {
  const { isMobile } = useBreakpoints();
  return isMobile;
}
