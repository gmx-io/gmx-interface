import fromPairs from "lodash/fromPairs";
import merge from "lodash/merge";
import range from "lodash/range";
import type { Config } from "tailwindcss";
import defaultConfig from "tailwindcss/defaultConfig";

import { colors } from "./src/config/colors";
import { BREAKPOINTS } from "./src/lib/breakpoints";
import { generateColorConfig } from "./src/lib/generateColorConfig";

const { tailwindColors, cssVariables } = generateColorConfig(colors);

const screensFromBreakpoints = Object.fromEntries(
  Object.entries(BREAKPOINTS).map(([key, value]) => [key, `${value}px`])
);

function injectColorsPlugin({ addBase }: any) {
  addBase({
    ":root": cssVariables.dark,
  });

  addBase({
    ":root:not(.dark)": cssVariables.light,
  });
}

function customUtilsPlugin({ addUtilities, addVariant, addComponents }: any) {
  addUtilities({
    ".scrollbar-hide": {
      "scrollbar-width": "none",
      "-ms-overflow-style": "none",
      "&::-webkit-scrollbar": {
        display: "none",
      },
    },
  });

  addVariant("desktop-hover", [`@media (hover: hover) {&:not(:active):hover}`]);
  addVariant("gmx-hover", [`@media (hover: hover) {&:hover}`, `@media (hover: none) {&:active}`]);
  addVariant("group-gmx-hover", [
    `@media (hover: hover) {:merge(.group):hover &}`,
    `@media (hover: none) {:merge(.group):active &}`,
  ]);

  addUtilities({
    ".text-input-bg": {
      borderRadius: "8px",
      background: "var(--color-slate-800)",
    },
    ".text-input-bg::placeholder": {
      color: "var(--color-slate-100)",
    },
  });

  addUtilities({
    ".scrollbar-gutter-stable": {
      scrollbarGutter: "stable",
    },
  });

  addUtilities({
    ".numbers": {
      letterSpacing: "0.03em",
      whiteSpace: "nowrap",
    },
  });

  addVariant("not-group-gmx-hover", [
    `@media (hover: hover) {:merge(.group):not(:hover) &}`,
    `@media (hover: none) {:merge(.group):not(:active) &}`,
  ]);
  addVariant("not-disabled", [`&:not([disabled])`]);
  addComponents({
    ".gmx-hover-gradient": {
      "@apply gmx-hover:bg-gradient-to-r gmx-hover:from-[#23263B] gmx-hover:to-[#16182E]": {},
    },
    ".gmx-hover-gradient-to-l": {
      "@apply gmx-hover:bg-gradient-to-l gmx-hover:from-[#23263B] gmx-hover:to-[#16182E]": {},
    },
  });
}

function fontComponentsPlugin({ addComponents, addBase }: any) {
  addBase({
    ":root": {
      "--font-size-h1": "3.2rem",
      "--font-size-h2": "2.4rem",
      "--font-size-body-large": "1.6rem",
      "--font-size-body-medium": "1.4rem",
      "--font-size-body-small": "1.2rem",
      "--font-size-caption": "1rem",

      "--line-height-h1": "34px",
      "--line-height-h2": "24px",
      "--line-height-h3": "20px",
      "--line-height-body-large": "2.1rem",
      "--line-height-body-medium": "1.8rem",
      "--line-height-body-small": "1.6rem",
      "--line-height-caption": "1.4rem",
    },
  });

  addComponents({
    ".text-h1": {
      fontSize: "3.2rem",
      lineHeight: "auto",
      fontWeight: 500,
      letterSpacing: "-0.016em",
    },
    ".text-h2": {
      fontSize: "2.4rem",
      lineHeight: "auto",
      fontWeight: 500,
      letterSpacing: "-0.016em",
    },
    ".text-h3": {
      fontSize: "2rem",
      lineHeight: "auto",
      fontWeight: 500,
      letterSpacing: "-0.016em",
    },
    ".text-body-large": {
      fontSize: "1.6rem",
      lineHeight: "2.1rem",
    },
    ".text-body-medium": {
      fontSize: "1.4rem",
      lineHeight: "1.75rem",
    },
    ".text-body-small": {
      fontSize: "1.2rem",
      lineHeight: "1.6rem",
    },
    ".text-caption": {
      fontSize: "1.1rem",
      lineHeight: "1.4rem",
      fontWeight: 500,
      letterSpacing: "0.08em",
      color: "var(--color-slate-100)",
      textTransform: "uppercase",
    },
    ".label": {
      fontWeight: 500,
      color: "var(--color-slate-100)",
      "& a": {
        color: "var(--color-slate-100)",
      },
    },
  });
}

const config: Config = {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    spacing: fromPairs(range(0, 96 + 1).map((spacing) => [spacing, `${spacing}px`])),
    borderRadius: merge(fromPairs(range(0, 96 + 1).map((borderRadius) => [borderRadius, `${borderRadius}px`])), {
      full: "9999px",
    }),
    fontSize: {
      11: "1.1rem",
      12: "1.2rem",
      13: "1.3rem",
      14: "1.4rem",
      15: "1.5rem",
      16: "1.6rem",
      20: "2rem",
      24: "2.4rem",
      32: "3.2rem",
    },
    lineHeight: {
      1: "1",
      2: "2",
      base: "normal",
    },
    colors: tailwindColors,
    textDecorationColor: tailwindColors,
    placeholderColor: {
      ...tailwindColors,
      gray: "rgb(117, 117, 117)",
    },
    screens: { ...defaultConfig.theme?.screens, ...screensFromBreakpoints },
    extend: {
      gridTemplateColumns: fromPairs(
        range(200, 501, 50).map((space) => [`auto-fill-${space}`, `repeat(auto-fill, minmax(${space}px, 1fr))`])
      ),
      borderWidth: {
        "1/2": "0.5px",
      },
    },
  },
  plugins: [injectColorsPlugin, customUtilsPlugin, fontComponentsPlugin],
};

export default config;
