import fromPairs from "lodash/fromPairs";
import merge from "lodash/merge";
import range from "lodash/range";
import type { Config } from "tailwindcss";
import defaultConfig from "tailwindcss/defaultConfig";

import { BREAKPOINTS } from "./src/lib/breakpoints";
import { generateColorConfig } from "./src/lib/generateColorConfig";

const { tailwindColors, cssVariables } = generateColorConfig({
  blue: {
    100: { light: "#A4C3F9", dark: "#A4C3F9" },
    300: { light: "#7885FF", dark: "#7885FF" },
    400: { light: "#2D42FC", dark: "#2D42FC" },
    500: { light: "#3d51ff", dark: "#3d51ff" },
    600: { light: "#2d42fc", dark: "#2d42fc" },
    700: { light: "#2e3dcd", dark: "#2e3dcd" },
  },
  "cold-blue": {
    500: { light: "#3a3f79", dark: "#3a3f79" },
    700: { light: "#282b54", dark: "#282b54" },
    900: { light: "#E2E5FD", dark: "#1E223C" },
  },
  slate: {
    100: { light: "#696D96", dark: "#a0a3c4" },
    400: { light: "#9FA3BC", dark: "#BEC0DA" },
    500: { light: "#C4C6D5", dark: "#646a8f" },
    600: { light: "#CCCCE0", dark: "#363a59" },
    700: { light: "#DADAE7", dark: "#22243a" },
    750: { light: "#D4D6E2", dark: "#17182c" },
    800: { light: "#EDEDF2", dark: "#1e2033" },
    900: { light: "#FCFCFC", dark: "#121421" },
    950: { light: "#EEEEF4", dark: "#090A14" },
  },
  gray: {
    50: { light: "rgba(0, 0, 0, 0.95)", dark: "rgba(255, 255, 255, 0.95)", type: "rgba" },
    100: { light: "#333333", dark: "#e7e7e9" },
    200: { light: "#555555", dark: "#cfcfd3" },
    300: { light: "#777777", dark: "#b7b8bd" },
    400: { light: "#999999", dark: "#9fa0a7" },
    500: { light: "#BBBBBB", dark: "#878891" },
    600: { light: "#DDDDDD", dark: "#70707c" },
    700: { light: "#F0F0F0", dark: "#585866" },
    800: { light: "rgba(0, 0, 0, 0.2)", dark: "rgba(255, 255, 255, 0.2)", type: "rgba" },
    900: { light: "rgba(0, 0, 0, 0.1)", dark: "rgba(255, 255, 255, 0.1)", type: "rgba" },
    950: { light: "rgba(0, 0, 0, 0.05)", dark: "rgba(255, 255, 255, 0.05)", type: "rgba" },
  },
  yellow: {
    300: { light: "#FF9400", dark: "#ffe166" },
    500: { light: "#f3b50c", dark: "#f3b50c" },
    900: { light: "#FFF9D0", dark: "#2E2D29" },
  },
  red: {
    100: { light: "#EA2A46", dark: "#F9A4A5" },
    400: { light: "#ff637a", dark: "#ff637a" },
    500: { light: "#EA2A46", dark: "#FF506A" },
    700: { light: "#B33055", dark: "#B33055" },
    900: { light: "#F9E2E5", dark: "#2D192D" },
  },
  green: {
    100: { light: "#109375", dark: "#A4F9D9" },
    300: { light: "#56dba8", dark: "#56dba8" },
    400: { light: "#8CF3CB", dark: "#8CF3CB" },
    500: { light: "#10937B", dark: "#0FDE8D" },
    600: { light: "#1F3445", dark: "#1F3445" },
    700: { light: "#0FDE8D", dark: "#0FDE8D" },
    800: { light: "#178969", dark: "#178969" },
    900: { light: "#DFFFEB", dark: "#192E38" },
  },
  white: { light: "#ffffff", dark: "#ffffff" },
  black: { light: "#000000", dark: "#000000" },
  button: {
    secondary: { light: "#E0E0E8", dark: "#23263b" },
    secondaryDisabled: { light: "#E0E0E8", dark: "#1e2033" },
  },
  fill: {
    surfaceElevated50: { light: "#EDEDF280", dark: "#1E203380" },
    surfaceElevatedHover: { light: "#EFEFEF", dark: "#18192a" },
    surfaceHover: { light: "#696D961A", dark: "#A0A3C41A" },
  },
  typography: {
    primary: { light: "#000000", dark: "#ffffff" },
    secondary: { light: "#696D96", dark: "#a0a3c4" },
  },
});

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

function customUtilsPlugin({ addUtilities, addVariant }: any) {
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
