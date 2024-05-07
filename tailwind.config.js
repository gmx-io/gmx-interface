/* eslint-disable */

const range = require("lodash/range");
const fromPairs = require("lodash/fromPairs");
const merge = require("lodash/merge");

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
      // leverage slider gradient
      // 46, 61, 205
      // 45, 66, 252)
      // leverage slider ticks
      // 3d51ff
      // leverage slider slider
      // 45, 66, 252
      // leverage slider rail
      // linear-gradient(90deg, rgb(30, 34, 61) 0%, rgb(40, 45, 74) 100%)

      // tradebox inputs gradiend
      // linear-gradient(90deg, rgba(30, 34, 61, 0.9) 0%, rgba(38, 43, 71, 0.9) 100%)

      // long/short tabs monstosity
      // background: linear-gradient(90deg, rgba(30, 34, 61, 0.9) 0%, rgba(38, 43, 71, 0.9) 100%);
      // box-shadow: inset 0px 0px 30px 5px rgba(255, 255, 255, 0.01)

      // version tabs monstosity
      // linear-gradient(90deg, rgba(30, 34, 61, 0.9) 0%, rgba(38, 43, 71, 0.9) 100%)

      // secondary button
      // rgba(180, 187, 255, 0.1);

      // divider
      // #23263b

      // text decoration color
      // rgba(255, 255, 255, 0.6)

      // red transparent
      // rgba(231, 78, 93, 0.15)

      // green transparent
      // rgba(94, 201, 137, 0.15)

      blue: {
        100: "#b4bcff",
        200: "#7886ff",
        400: "#3d51ff",
        500: "#2d42fc",
      },
      "cold-blue": {
        500: "#3a3f79",
        700: "#3a3f798f",
      },
      slate: {
        100: "#a0a3c4",
        400: "#3e4361",
        500: "#3a3f5c",
        550: "#343756",
        600: "#262941",
        700: "#23263b",
        800: "#16182e",
        900: "#101124",
        950: "#08091b",
      },
      gray: {
        100: "#b7b7bd",
        200: "#babac0",
        300: "rgba(255, 255, 255, 0.7)",
        400: "#a9a9b0",
        DEFAULT: "#b8b8bd",
      },
      // f3b50e
      yellow: {
        400: "#f3b50e",
        DEFAULT: "#f3b50c",
      },
      red: { DEFAULT: "#fa3c58", 800: "rgba(231, 78, 93, 0.15)" },
      green: { DEFAULT: "#0ecc83", 800: "rgba(94, 201, 137, 0.15)" },
      white: "#ffffff",
    },
    textDecorationColor: {
      "gray-400": "rgba(255, 255, 255, 0.6)",
    },
    placeholderColor: {
      gray: "rgb(117, 117, 117)",
    },
  },
  plugins: [],
};
