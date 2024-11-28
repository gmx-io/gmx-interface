import { useState, useEffect } from "react";

type Breakpoint = "xs" | "sm" | "md" | "lg" | "xl";

interface BreakpointConfig {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
}

const breakpoints: BreakpointConfig = {
  xs: 0,
  sm: 600,
  md: 960,
  lg: 1280,
  xl: 1920,
};

export const useBreakpoints = () => {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>("lg");
  const [width, setWidth] = useState<number>(window.innerWidth);

  useEffect(() => {
    const handleResize = () => {
      setWidth(window.innerWidth);

      if (window.innerWidth < breakpoints.sm) {
        setBreakpoint("xs");
      } else if (window.innerWidth < breakpoints.md) {
        setBreakpoint("sm");
      } else if (window.innerWidth < breakpoints.lg) {
        setBreakpoint("md");
      } else if (window.innerWidth < breakpoints.xl) {
        setBreakpoint("lg");
      } else {
        setBreakpoint("xl");
      }
    };

    // Set initial breakpoint
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return {
    breakpoint,
    width,
    mobile: breakpoint === "xs" || breakpoint === "sm",
    tablet: breakpoint === "md",
    desktop: breakpoint === "lg" || breakpoint === "xl",
    isSmallScreen: width <= breakpoints.sm,
  };
};
