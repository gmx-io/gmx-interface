/* eslint-disable */

const range = require("lodash/range");
const fromPairs = require("lodash/fromPairs");
const merge = require("lodash/merge");

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

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    // @see https://tailwindcss.com/docs/customizing-spacing
    spacing: fromPairs(range(0, 96 + 1).map((spacing) => [spacing, `${spacing}px`])),
    borderRadius: merge(fromPairs(range(0, 96 + 1).map((borderRadius) => [borderRadius, `${borderRadius}px`])), {
      full: "9999px",
    }),
    fontSize: {
      12: "1.2rem",
      14: "1.4rem",
      15: "1.5rem",
      16: "1.6rem",
      24: "2.4rem",
      34: "3.4rem",
    },
    lineHeight: {
      1: "1",
      // Normal is browser dependent. See https://developer.mozilla.org/en-US/docs/Web/CSS/line-height#normal
      base: "normal",
    },
    // @see https://tailwindcss.com/docs/customizing-colors
    colors: {
      blue: {
        200: "#b4bcff",
        300: "#7885ff",
        400: "#4d5ffa",
        500: "#3d51ff",
        600: "#2d42fc",
        700: "#3040d0",
      },
      "cold-blue": {
        500: "#3a3f79",
        700: "#3a3f798f",
        950: "#17182c",
        //     17182e
        990: "#0e0f1f",
      },
      slate: {
        100: "#a0a3c4",
        400: "#3e4361",
        500: "#3a3f5c",
        550: "#343756",
        560: "#32344c",
        565: "#303652",
        570: "#2e3351",
        600: "#262941",
        700: "#23263b",
        750: "#212540",
        760: "#1e2136",
        800: "#16182e",
        900: "#101124",
        950: "#08091b",
      },
      gray: {
        50: "#eeeeee",
        100: "#b7b7bd",
        200: "#babac0",
        300: "rgba(255, 255, 255, 0.7)",
        400: "#a9a9b0",
        DEFAULT: "#b8b8bd",
      },
      "transparent-gray": {
        800: "#ffffff29",
      },
      yellow: {
        500: "#f3b50c",
        DEFAULT: "#f3b50c",
      },
      red: { DEFAULT: "#fa3c58", 800: "rgba(231, 78, 93, 0.15)" },
      green: { DEFAULT: "#0ecc83", 800: "rgba(94, 201, 137, 0.15)" },
      white: "#ffffff",
      black: "#000000",
    },
    textDecorationColor: {
      "gray-400": "rgba(255, 255, 255, 0.6)",
    },
    placeholderColor: {
      gray: "rgb(117, 117, 117)",
    },
  },
  plugins: [injectColorsPlugin],
};
