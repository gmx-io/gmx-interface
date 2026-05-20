import { type CSSProperties, useMemo } from "react";

import { useTheme } from "context/ThemeContext/ThemeContext";

import bgPointsBanner from "img/bg_points_banner.png";

const POINTS_BANNER_BASE_STYLES = {
  backgroundImage: `url(${bgPointsBanner})`,
  backgroundSize: "cover",
  backgroundPosition: "center",
} satisfies CSSProperties;

export function usePointsBannerStyles() {
  const { theme } = useTheme();

  return useMemo(
    () => ({
      ...POINTS_BANNER_BASE_STYLES,
      backgroundColor: theme === "light" ? "var(--color-slate-900)" : "var(--color-slate-950)",
    }),
    [theme]
  );
}
