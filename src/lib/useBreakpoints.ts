import { useMedia } from "react-use";

import { BREAKPOINTS } from "./breakpoints";

export const useBreakpoints = () => {
  const isMobile = useMedia(`(max-width: ${BREAKPOINTS.mobile}px)`);
  const isTablet = useMedia(`(max-width: ${BREAKPOINTS.tablet}px)`);
  const isDesktop = useMedia(`(max-width: ${BREAKPOINTS.desktop}px)`);
  const isSmallMobile = useMedia(`(max-width: ${BREAKPOINTS.smallMobile}px)`);

  return { isMobile, isTablet, isDesktop, isSmallMobile };
};
