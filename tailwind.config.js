/* eslint-disable */

const range = require("lodash/range");
const fromPairs = require("lodash/fromPairs");
const merge = require("lodash/merge");
const defaultConfig = require("tailwindcss/defaultConfig");

/**
 * @See https://www.notion.so/gmxio/Colors-Clean-Up-13303574745d80deb5dcebb6f15e41ad#13303574745d8066aad0cbd650848ca6
 */

// Dark theme colors
const darkColors = {
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
    active: "#7885FF33",
  },
  textIcon: {
    default: "#a0a3c4",
    active: "#ffffff",
    strong: "#ffffff",
  },
};

// Light theme colors
const lightColors = {
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
    900: "#E2E5FD", // Light theme override
  },
  "pale-blue": {
    100: "rgba(180,187,255, 0.1)",
    600: "rgba(180,187,255, 0.6)",
  },
  slate: {
    100: "#696D96", // Light theme
    400: "#9FA3BC", // Light theme
    500: "#C4C6D5", // Light theme
    600: "#CCCCE0", // Light theme
    650: "#D4D6E27f",
    700: "#DADAE7", // Light theme
    750: "#D4D6E2", // Light theme
    800: "#EDEDF2", // Light theme
    900: "#FCFCFC", // Light theme
    950: "#EEEEF4", // Light theme
  },
  gray: {
    50: "rgba(0, 0, 0, 0.95)",
    100: "#333333",
    200: "#555555",
    300: "#777777",
    400: "#999999",
    500: "#BBBBBB",
    600: "#DDDDDD",
    700: "#F0F0F0",
    800: "rgba(0, 0, 0, 0.2)",
    900: "rgba(0, 0, 0, 0.1)",
    950: "rgba(0, 0, 0, 0.05)",
  },
  yellow: {
    300: "#FF9400", // Light theme
    500: "#f3b50c",
    900: "#FFF9D0", // Light theme
  },
  red: {
    100: "#F9A4A5",
    400: "#ff637a",
    500: "#EA2A46", // Light theme
    700: "#B33055",
    900: "#F9E2E5", // Light theme
  },
  green: {
    100: "#A4F9D9",
    300: "#56dba8",
    400: "#8CF3CB",
    500: "#10937B", // Light theme
    600: "#1F3445",
    700: "#0FDE8D",
    800: "#178969",
    900: "#DFFFEB", // Light theme
  },
  white: "#ffffff",
  black: "#000000",
  button: {
    secondary: "#E0E0EB", // Light theme
  },
  fill: {
    surfaceElevated50: "#F5F5F780",
    surfaceElevatedHover: "#EFEFEF",
    surfaceHover: "#696D961A",
    active: "#7885FF33",
  },
  textIcon: {
    default: "#696D96",
    strong: "#000000",
    active: "#2D42FC",
  },
};

// Convert hex to RGB
function hexToRgb(hex) {
  if (hex.startsWith('rgba(')) {
    // Extract RGB values from rgba string
    const match = hex.match(/rgba?\((\d+),?\s*(\d+),?\s*(\d+)/);
    if (match) {
      return `${match[1]} ${match[2]} ${match[3]}`;
    }
    return hex;
  }
  
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result 
    ? `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`
    : hex;
}

// Main colors object using CSS variables with alpha support
const colors = {
  blue: {
    100: "rgb(var(--color-blue-100) / <alpha-value>)",
    300: "rgb(var(--color-blue-300) / <alpha-value>)",
    400: "rgb(var(--color-blue-400) / <alpha-value>)",
    500: "rgb(var(--color-blue-500) / <alpha-value>)",
    600: "rgb(var(--color-blue-600) / <alpha-value>)",
    700: "rgb(var(--color-blue-700) / <alpha-value>)",
  },
  "cold-blue": {
    500: "rgb(var(--color-cold-blue-500) / <alpha-value>)",
    700: "rgb(var(--color-cold-blue-700) / <alpha-value>)",
    900: "rgb(var(--color-cold-blue-900) / <alpha-value>)",
  },
  "pale-blue": {
    100: "var(--color-pale-blue-100-hex)",
    600: "var(--color-pale-blue-600-hex)",
  },
  slate: {
    100: "rgb(var(--color-slate-100) / <alpha-value>)",
    400: "rgb(var(--color-slate-400) / <alpha-value>)",
    500: "rgb(var(--color-slate-500) / <alpha-value>)",
    600: "rgb(var(--color-slate-600) / <alpha-value>)",
    650: "var(--color-slate-650-hex)",
    700: "rgb(var(--color-slate-700) / <alpha-value>)",
    750: "rgb(var(--color-slate-750) / <alpha-value>)",
    800: "rgb(var(--color-slate-800) / <alpha-value>)",
    900: "rgb(var(--color-slate-900) / <alpha-value>)",
    950: "rgb(var(--color-slate-950) / <alpha-value>)",
  },
  gray: {
    50: "var(--color-gray-50-hex)",
    100: "rgb(var(--color-gray-100) / <alpha-value>)",
    200: "rgb(var(--color-gray-200) / <alpha-value>)",
    300: "rgb(var(--color-gray-300) / <alpha-value>)",
    400: "rgb(var(--color-gray-400) / <alpha-value>)",
    500: "rgb(var(--color-gray-500) / <alpha-value>)",
    600: "rgb(var(--color-gray-600) / <alpha-value>)",
    700: "rgb(var(--color-gray-700) / <alpha-value>)",
    800: "var(--color-gray-800-hex)",
    900: "var(--color-gray-900-hex)",
    950: "var(--color-gray-950-hex)",
  },
  yellow: {
    300: "rgb(var(--color-yellow-300) / <alpha-value>)",
    500: "rgb(var(--color-yellow-500) / <alpha-value>)",
    900: "rgb(var(--color-yellow-900) / <alpha-value>)",
  },
  red: {
    100: "rgb(var(--color-red-100) / <alpha-value>)",
    400: "rgb(var(--color-red-400) / <alpha-value>)",
    500: "rgb(var(--color-red-500) / <alpha-value>)",
    700: "rgb(var(--color-red-700) / <alpha-value>)",
    900: "rgb(var(--color-red-900) / <alpha-value>)",
  },
  green: {
    100: "rgb(var(--color-green-100) / <alpha-value>)",
    300: "rgb(var(--color-green-300) / <alpha-value>)",
    400: "rgb(var(--color-green-400) / <alpha-value>)",
    500: "rgb(var(--color-green-500) / <alpha-value>)",
    600: "rgb(var(--color-green-600) / <alpha-value>)",
    700: "rgb(var(--color-green-700) / <alpha-value>)",
    800: "rgb(var(--color-green-800) / <alpha-value>)",
    900: "rgb(var(--color-green-900) / <alpha-value>)",
  },
  white: "rgb(var(--color-white) / <alpha-value>)",
  black: "rgb(var(--color-black) / <alpha-value>)",
  button: {
    secondary: "rgb(var(--color-button-secondary) / <alpha-value>)",
  },
  fill: {
    surfaceElevated50: "var(--color-fill-surfaceElevated50-hex)",
    surfaceElevatedHover: "rgb(var(--color-fill-surfaceElevatedHover) / <alpha-value>)",
    surfaceHover: "var(--color-fill-surfaceHover-hex)",
  },
  textIcon: {
    default: "rgb(var(--color-textIcon-default) / <alpha-value>)",
    strong: "rgb(var(--color-textIcon-strong) / <alpha-value>)",
    active: "rgb(var(--color-textIcon-active) / <alpha-value>)",
  },
};

/**
 * @type {import('tailwindcss/types/config').PluginCreator}
 */
function injectColorsPlugin({ addBase }) {
  function extractColorVars(colorObj, colorGroup = "") {
    return Object.keys(colorObj).reduce((vars, colorKey) => {
      const value = colorObj[colorKey];

      const visualColorKey = colorKey === "DEFAULT" ? "" : `-${colorKey}`;

      if (typeof value === "string") {
        const varName = `--color${colorGroup}${visualColorKey}`;
        const hexVarName = `--color${colorGroup}${visualColorKey}-hex`;
        
        // Generate both RGB and hex versions
        return {
          ...vars,
          [varName]: hexToRgb(value), // RGB for opacity support
          [hexVarName]: value, // Hex for direct usage
        };
      } else {
        return { ...vars, ...extractColorVars(value, `-${colorKey}`) };
      }
    }, {});
  }

  // Dark theme (default) - uses darkColors
  addBase({
    ":root": extractColorVars(darkColors),
  });

  // Light theme - uses lightColors
  addBase({
    ":root:not(.dark)": extractColorVars(lightColors),
  });
}

/**
 * @type {import('tailwindcss/types/config').PluginCreator}
 */
function customUtilsPlugin({ addUtilities, addVariant }) {
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
      letterSpacing: "0.06em",
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
    }
  });
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
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
      borderWidth: {
        'stroke': '0.5px',
      },
    },
  },
  plugins: [injectColorsPlugin, customUtilsPlugin, fontComponentsPlugin],
};
