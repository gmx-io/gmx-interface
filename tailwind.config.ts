import fromPairs from "lodash/fromPairs";
import merge from "lodash/merge";
import range from "lodash/range";
import type { Config } from "tailwindcss";
import defaultConfig from "tailwindcss/defaultConfig";
import type { PluginAPI } from "tailwindcss/types/config";

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

function textColorNames(tree: object, prefix = ""): string[] {
  return Object.entries(tree).flatMap(([key, value]) => {
    const name = prefix ? `${prefix}-${key}` : key;

    return value && typeof value === "object" && !("light" in value) ? textColorNames(value, name) : [name];
  });
}

const PRIMARY_TEXT_COLOR_NAMES = ["textIcon-onButton", "black", "textIcon-primary"];

function affixColor(textColorName: string) {
  return PRIMARY_TEXT_COLOR_NAMES.includes(textColorName) ? "var(--color-textIcon-secondary)" : "currentColor";
}

function injectAffixColorsPlugin({ addUtilities }: PluginAPI) {
  addUtilities({
    ".numeric-affix": {
      color: "var(--affix-color, var(--color-textIcon-secondary))",
    },
    ...fromPairs(textColorNames(colors).map((name) => [`.text-${name}`, { "--affix-color": affixColor(name) }])),
  });
}

function injectAdaptiveVariablesPlugin({ addBase }: PluginAPI) {
  addBase({
    ":root": {
      "--padding-adaptive": "16px",
    },
    [`@media (min-width: ${BREAKPOINTS.mobile}px)`]: {
      ":root": {
        "--padding-adaptive": "20px",
      },
    },
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
      background: "var(--color-fill-surfaceElevated)",
    },
    ".text-input-bg::placeholder": {
      color: "var(--color-textIcon-secondary)",
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
      "--font-size-h1": "4rem",
      "--font-size-h2": "3.2rem",
      "--font-size-h3": "2.4rem",
      "--font-size-h4": "2rem",
      "--font-size-body-large": "1.6rem",
      "--font-size-body-medium": "1.4rem",
      "--font-size-body-small": "1.2rem",
      "--font-size-caption": "1.2rem",

      "--line-height-h1": "48px",
      "--line-height-h2": "40px",
      "--line-height-h3": "32px",
      "--line-height-h4": "28px",
      "--line-height-body-large": "2.4rem",
      "--line-height-body-medium": "2rem",
      "--line-height-body-small": "1.6rem",
      "--line-height-caption": "1.6rem",
    },
  });

  addComponents({
    ".text-h1": {
      fontSize: "4rem",
      lineHeight: "4.8rem",
      fontWeight: 500,
      letterSpacing: "-0.016em",
    },
    ".text-h2": {
      fontSize: "3.2rem",
      lineHeight: "4rem",
      fontWeight: 500,
      letterSpacing: "-0.016em",
    },
    ".text-h3": {
      fontSize: "2.4rem",
      lineHeight: "3.2rem",
      fontWeight: 500,
      letterSpacing: "-0.016em",
    },
    ".text-h4": {
      fontSize: "2rem",
      lineHeight: "2.8rem",
      fontWeight: 500,
      letterSpacing: "-0.016em",
    },
    ".text-body-xlarge": {
      fontSize: "2rem",
      lineHeight: "2.8rem",
    },
    ".text-body-large": {
      fontSize: "1.6rem",
      lineHeight: "2.4rem",
    },
    ".text-body-medium": {
      fontSize: "1.4rem",
      lineHeight: "2rem",
    },
    ".text-body-small": {
      fontSize: "1.2rem",
      lineHeight: "1.6rem",
    },
    ".text-caption": {
      fontSize: "1.2rem",
      lineHeight: "1.6rem",
      fontWeight: 500,
      letterSpacing: "0.08em",
      color: "var(--color-textIcon-secondary)",
      textTransform: "uppercase",
    },
    ".label": {
      fontWeight: 500,
      color: "var(--color-textIcon-secondary)",
      "& a": {
        color: "var(--color-textIcon-secondary)",
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
      16: "1.6rem",
      20: "2rem",
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
      padding: {
        adaptive: "var(--padding-adaptive)",
      },
      letterSpacing: {
        wide: "0.02em",
      },
    },
  },
  plugins: [
    injectColorsPlugin,
    injectAffixColorsPlugin,
    customUtilsPlugin,
    fontComponentsPlugin,
    injectAdaptiveVariablesPlugin,
  ],
};

export default config;
