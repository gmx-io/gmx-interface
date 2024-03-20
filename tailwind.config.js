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
      sm: "1.4rem",
      base: "1.5rem",
      md: "1.6rem",
      lg: "2.4rem",
      xl: "3.4rem",
    },
    // @see https://tailwindcss.com/docs/customizing-colors
    colors: {
      blue: "#2d42fc",
      gray: "rgba(255, 255, 255, 0.7)",
      yellow: "rgb(243, 181, 12)",
      red: "#fa3c58",
      green: "#0ecc83",
    },
  },
  plugins: [],
};
