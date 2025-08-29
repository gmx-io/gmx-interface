import { useMedia } from "react-use";

export const BREAKPOINTS = {
  mobile: 768, // md
  tablet: 1024, // lg
  desktop: 1280, // xl
  smallMobile: 400, // sm
};

export const useBreakpoints = () => {
  const isMobile = useMedia(`(max-width: ${BREAKPOINTS.mobile}px)`);
  const isTablet = useMedia(`(max-width: ${BREAKPOINTS.tablet}px)`);
  const isDesktop = useMedia(`(max-width: ${BREAKPOINTS.desktop}px)`);
  const isSmallMobile = useMedia(`(max-width: ${BREAKPOINTS.smallMobile}px)`);

  return { isMobile, isTablet, isDesktop, isSmallMobile };
};
