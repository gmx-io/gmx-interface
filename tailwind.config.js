/* eslint-disable */

const range = require("lodash/range");
const fromPairs = require("lodash/fromPairs");
const merge = require("lodash/merge");
const defaultConfig = require("tailwindcss/defaultConfig");
const flattenColorPalette = require("tailwindcss/lib/util/flattenColorPalette");

/**
 * @See https://www.notion.so/gmxio/Colors-Clean-Up-13303574745d80deb5dcebb6f15e41ad#13303574745d8066aad0cbd650848ca6
 */
const colors = {
  blue: {
    100: "#A4C3F9",
    300: "#7885FF",
    400: "#2D42FC",
    500: "#3d51ff",
    600: "#2d42fc",
    700: "#2e3dcd",
  },
  "cold-blue": {
    500: "#3a3f79",
    700: "#282b54",
    900: "#1E223C",
  },
  "pale-blue": {
    100: "rgba(180,187,255, 0.1)",
    600: "rgba(180,187,255, 0.6)",
  },
  slate: {
    100: "#a0a3c4",
    400: "#BEC0DA",
    500: "#646a8f",
    600: "#363a59",
    650: "#3C40677f",
    700: "#22243a",
    750: "#17182c",
    800: "#1e2033",
    900: "#121421",
    950: "#090A14",
  },
  gray: {
    50: "rgba(255, 255, 255, 0.95)",
    100: "#e7e7e9",
    200: "#cfcfd3",
    300: "#b7b8bd",
    400: "#9fa0a7",
    500: "#878891",
    600: "#70707c",
    700: "#585866",
    800: "rgba(255, 255, 255, 0.2)",
    900: "rgba(255, 255, 255, 0.1)",
    950: "rgba(255, 255, 255, 0.05)",
  },
  yellow: {
    300: "#ffe166",
    500: "#f3b50c",
    900: "#2E2D29",
  },
  red: {
    100: "#F9A4A5",
    400: "#ff637a",
    500: "#FF506A",
    700: "#B33055",
    900: "#2D192D",
  },
  green: {
    100: "#A4F9D9",
    300: "#56dba8",
    400: "#8CF3CB",
    500: "#0FDE8D",
    700: "#178969",
    600: "#1F3445",
    700: "#0FDE8D",
    800: "#178969",
    900: "#192E38",
  },
  white: "#ffffff",
  black: "#000000",
  button: {
    secondary: "#23263b",
  },
  fill: {
    surfaceElevated50: "#1E203380",
    surfaceElevatedHover: "#18192a",
    surfaceHover: "#A0A3C41A",
  },
};

/**
 * @type {import('tailwindcss/types/config').PluginCreator}
 */
function injectColorsPlugin({ addBase, theme }) {
  function extractColorVars(colorObj, colorGroup = "") {
    return Object.keys(colorObj).reduce((vars, colorKey) => {
      const value = colorObj[colorKey];

      const visualColorKey = colorKey === "DEFAULT" ? "" : `-${colorKey}`;

      const newVars =
        typeof value === "string"
          ? { [`--color${colorGroup}${visualColorKey}`]: value }
          : extractColorVars(value, `-${colorKey}`);

      return { ...vars, ...newVars };
    }, {});
  }

  addBase({
    ":root": extractColorVars(theme("colors")),
  });
}

/**
 * @type {import('tailwindcss/types/config').PluginCreator}
 */
function customUtilsPlugin({ addUtilities, matchUtilities, matchVariant, addVariant, theme }) {
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
    },
  });
}

/**
 * @type {import('tailwindcss/types/config').PluginCreator}
 * @See https://www.notion.so/gmxio/Fonts-Clean-Up-13303574745d8015b115e03426827f3c
 */
function fontComponentsPlugin({ addComponents, addBase }) {
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
      letterSpacing: "-0.02em",
    },
    ".text-h2": {
      fontSize: "2.4rem",
      lineHeight: "auto",
      fontWeight: 500,
      letterSpacing: "-0.02em",
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
      fontSize: "1rem",
      lineHeight: "1.4rem",
    }
  });
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    // @see https://tailwindcss.com/docs/customizing-spacing
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
      // Normal is browser dependent. See https://developer.mozilla.org/en-US/docs/Web/CSS/line-height#normal
      base: "normal",
    },
    // @see https://tailwindcss.com/docs/customizing-colors
    colors: colors,
    textDecorationColor: colors,
    placeholderColor: {
      ...colors,
      gray: "rgb(117, 117, 117)",
    },
    // @see https://tailwindcss.com/blog/tailwindcss-v3-2#max-width-and-dynamic-breakpoints
    // "these features will only be available if your project uses a simple screens configuration."
    // So we just copy the default screens config
    screens: { ...defaultConfig.theme.screens, sm: "400px" },
    extend: {
      gridTemplateColumns: fromPairs(
        range(200, 501, 50).map((space) => [`auto-fill-${space}`, `repeat(auto-fill, minmax(${space}px, 1fr))`])
      ),
      fontFamily: {
        'tthoves': ['TTHoves', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        'relative': ['Relative', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif']
      },
      borderWidth: {
        'stroke': '0.5px',
      },
    },
  },
  plugins: [injectColorsPlugin, customUtilsPlugin, fontComponentsPlugin],
};
