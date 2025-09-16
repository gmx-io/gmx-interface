/* eslint-disable */

const range = require("lodash/range");
const fromPairs = require("lodash/fromPairs");
const merge = require("lodash/merge");
const defaultConfig = require("tailwindcss/defaultConfig");
const { resolve } = require("node:path");

/**
 * @See https://www.notion.so/gmxio/Colors-Clean-Up-13303574745d80deb5dcebb6f15e41ad#13303574745d8066aad0cbd650848ca6
 */
const colors = {
  slate: {
    950: "#0B0B14",
    900: "#090A14",
    800: "#171827",
    700: "#1E2033",
    650: "#24273F",
    600: "#3C4067",
    500: "#A0A3C4",
    400: "#BEC0DA",
  },
  light: {
    150: "#F4F5F9",
  },
  blue: {
    100: "#A4C3F9",
    300: "#7885ff",
    400: "#2D42FC",
  },
  white: "#ffffff",
  black: "#000000",
  stroke: {
    primary: "#363A59",
  },
  surface: {
    primary: "#121421",
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
    ".animate-pause": {
      "animation-play-state": "paused",
    },
    ".sr-only": {
      position: "absolute",
      width: "1px",
      height: "1px",
      padding: "0",
      margin: "-1px",
      overflow: "hidden",
      clip: "rect(0, 0, 0, 0)",
      whiteSpace: "nowrap",
      border: "0",
    },
  });
  addVariant("filled", "&:not(:placeholder-shown)");
}

/**
 * @type {import('tailwindcss/types/config').PluginCreator}
 */
function fontComponentsPlugin({ addComponents }) {
  addComponents({
    ".text-heading-1": {
      "@apply text-50 font-medium leading-heading-lg -tracking-[2.6px] sm:text-100 sm:-tracking-[5.2px]": {},
    },
    ".text-heading-2": {
      "@apply text-[40px] font-medium leading-heading-lg -tracking-[2.08px] sm:text-80 sm:-tracking-[4.16px]": {},
    },
    ".text-heading-3": {
      "@apply text-32 font-medium leading-heading-md -tracking-[0.96px]": {},
    },
    ".text-heading-4": {
      "@apply text-24 font-medium leading-heading-md -tracking-[0.96px]": {},
    },
    ".text-subheadline": {
      "@apply text-14 font-medium leading-body-sm text-slate-400 tracking-wide": {},
    },
    ".text-description": {
      "@apply text-16 font-normal leading-body-sm text-slate-400 tracking-wide": {},
    },
    ".text-terms-heading": {
      "@apply text-18 font-medium": {},
    },
    ".text-terms-body": {
      "@apply text-16 font-normal leading-[24px] text-light-150": {},
    },
    ".text-terms-subtitle": {
      "@apply text-18 font-medium": {},
    },
    ".btn-landing": {
      "@apply bg-blue-400 font-medium text-white transition-colors duration-180": {},
      "&:hover": {
        "@media (hover: hover)": {
          background:
            "linear-gradient(0deg, rgba(9, 10, 21, 0.1) 0%, rgba(9, 10, 21, 0.1) 100%), var(--color-blue-400)",
        },
      },
      "&:active": {
        "@media (hover: hover)": {
          background:
            "linear-gradient(0deg, rgba(9, 10, 21, 0.2) 0%, rgba(9, 10, 21, 0.2) 100%), var(--color-blue-400)",
        },
      },
    },
  });
}

/** @type {import('tailwindcss').Config} */
export default {
  content: [resolve(__dirname, "./index.html"), resolve(__dirname, "./src/**/*.{js,jsx,ts,tsx}")],
  theme: {
    // @see https://tailwindcss.com/docs/customizing-spacing
    spacing: fromPairs(range(0, 96 + 1).map((spacing) => [spacing, `${spacing}px`])),
    borderRadius: merge(fromPairs(range(0, 96 + 1).map((borderRadius) => [borderRadius, `${borderRadius}px`])), {
      full: "9999px",
    }),
    borderWidth: {
      "1/2": "0.5px",
    },
    fontSize: {
      12: "1.2rem",
      14: "1.4rem",
      15: "1.5rem",
      16: "1.6rem",
      18: "1.8rem",
      24: "2.4rem",
      32: "3.2rem",
      34: "3.4rem",
      50: "5rem",
      80: "8rem",
      100: "10rem",
    },
    lineHeight: {
      "body-sm": "136%",
      "body-md": "144%",
      "heading-lg": "98%",
      "heading-md": "108%",
      // Normal is browser dependent. See https://developer.mozilla.org/en-US/docs/Web/CSS/line-height#normal
      base: "normal",
    },
    letterSpacing: {
      ...defaultConfig.theme.letterSpacing,
      wide: "0.028px",
    },
    transitionDuration: {
      ...defaultConfig.theme.transitionDuration,
      "180": "180ms",
    },
    colors: colors,
    screens: defaultConfig.theme.screens,
    extend: {
      fontFamily: {
        sans: ["TTHoves", "sans-serif"],
        mono: ["TTHovesMono", "monospace"],
      },
      keyframes: {
        scroll: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        scroll: "scroll 60s linear infinite",
      },
    },
  },
  plugins: [injectColorsPlugin, customUtilsPlugin, fontComponentsPlugin],
};
