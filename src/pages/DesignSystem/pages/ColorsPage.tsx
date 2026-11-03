import cx from "classnames";
import { useMemo } from "react";

import { Theme, useTheme } from "context/ThemeContext/ThemeContext";

import { ThemeTabs } from "../DesignSystemThemeSwitcher";
import { DocsChangelog } from "../DocsChangelog";
import { DocsSection, DocsSectionInfo } from "../DocsLayout";
import { COLORS_CHANGELOG_NOTES, COLORS_CHANGELOG_STEPS } from "./colorsChangelog";

// Colors page of the design system site (/ui/colors).
// Examples: the semantic colors. Changelog: the exact edits and scripts that move the code to them.

type ThemeValues = {
  dark: string;
  light: string;
};

type SemanticColor = ThemeValues & { code: string };

type SemanticColorGroup = DocsSectionInfo & { colors: SemanticColor[] };

// The semantic colors with their dark and light values, by group
const SEMANTIC_COLORS: SemanticColorGroup[] = [
  {
    id: "colors-fill",
    title: "Fill",
    colors: [
      { code: "fill-background", dark: "#090A14", light: "#EEEEF4" },
      { code: "fill-surfaceBase", dark: "#121421", light: "#FCFCFC" },
      { code: "fill-surfaceBase88", dark: "#121421E0", light: "#FCFCFCE0" },
      { code: "fill-surfaceElevated", dark: "#1E2033", light: "#EDEDF2" },
      { code: "fill-surfaceElevated50", dark: "#1E203380", light: "#EDEDF280" },
      { code: "fill-surfaceHover", dark: "#A0A3C41A", light: "#A0A3C41A" },
      { code: "fill-accent", dark: "#363A59", light: "#D4D4E2" },
      { code: "fill-skeleton", dark: "#B4BBFF1A", light: "#696D961F" },
    ],
  },
  {
    id: "colors-button",
    title: "Button",
    colors: [
      { code: "button-primary", dark: "#2D42FC", light: "#2D42FC" },
      { code: "button-primaryHover", dark: "#2A3DE5", light: "#293CE4" },
      { code: "button-primaryActive", dark: "#2536CD", light: "#2536CD" },
      { code: "button-secondary", dark: "#23263B", light: "#E0E0EB" },
      { code: "button-secondaryHover", dark: "#282D46", light: "#DADCE8" },
      { code: "button-primaryDisabled", dark: "#1E2033", light: "#E0E0EB" },
      { code: "button-secondaryDisabled", dark: "#1E2033", light: "#E0E0EB" },
      { code: "button-background", dark: "#22243A", light: "#DADAE7" },
    ],
  },
  {
    id: "colors-text-icon",
    title: "TextIcon",
    colors: [
      { code: "textIcon-primary", dark: "#FFFFFF", light: "#090A14" },
      { code: "textIcon-secondary", dark: "#A0A3C4", light: "#696D96" },
      { code: "textIcon-disabled", dark: "#646A8F", light: "#9FA3BC" },
      { code: "textIcon-inactive", dark: "#3E4361", light: "#C4C4D5" },
      { code: "textIcon-onButton", dark: "#FFFFFF", light: "#FFFFFF" },
    ],
  },
  {
    id: "colors-stroke",
    title: "Stroke",
    colors: [
      { code: "stroke-accent", dark: "#FFFFFF", light: "#090A14" },
      { code: "stroke-primary", dark: "#363A59", light: "#CCCCE0" },
    ],
  },
  {
    id: "colors-blue",
    title: "Blue",
    colors: [
      { code: "blue-strong", dark: "#7885FF", light: "#2D42FC" },
      { code: "blue-secondary", dark: "#A4C3F9", light: "#2D42FC" },
      { code: "blue-background", dark: "#1E223C", light: "#E2E5FD" },
      { code: "blue-backgroundOpacity", dark: "#7885FF33", light: "#7885FF33" },
    ],
  },
  {
    id: "colors-green",
    title: "Green",
    colors: [
      { code: "green-strong", dark: "#0FDE8D", light: "#109375" },
      { code: "green-secondary", dark: "#A4F9D8", light: "#109375" },
      { code: "green-background", dark: "#192E38", light: "#DFEFEB" },
    ],
  },
  {
    id: "colors-red",
    title: "Red",
    colors: [
      { code: "red-strong", dark: "#FF506A", light: "#EA2A46" },
      { code: "red-secondary", dark: "#F9A4A5", light: "#EA2A46" },
      { code: "red-background", dark: "#2D192D", light: "#F9E2E5" },
    ],
  },
  {
    id: "colors-yellow",
    title: "Yellow",
    colors: [
      { code: "yellow-strong", dark: "#FFE166", light: "#FF9400" },
      { code: "yellow-background", dark: "#2E2D29", light: "#FFF9D0" },
      { code: "yellow-backgroundOpacity", dark: "#FFE1661F", light: "#FF94001F" },
    ],
  },
  {
    id: "colors-overlay",
    title: "Overlay",
    colors: [{ code: "overlay-50", dark: "#090A1480", light: "#090A1480" }],
  },
];

const SEMANTIC_COLORS_BY_CODE = new Map(
  SEMANTIC_COLORS.flatMap((group) => group.colors).map((color) => [color.code, color])
);

function getSemanticColor(code: string): SemanticColor {
  const color = SEMANTIC_COLORS_BY_CODE.get(code);
  if (!color) {
    throw new Error(`Unknown semantic color: ${code}`);
  }
  return color;
}

// "#RRGGBBAA" reads as "#RRGGBB · 10%"
function formatColor(value: string) {
  if (value.length !== 9) {
    return value;
  }
  return `${value.slice(0, 7)} · ${Math.round((parseInt(value.slice(7), 16) / 255) * 100)}%`;
}

// The theme surfaces (fill-surfaceBase): see-through colors are shown on them, like on a card
const SURFACE = getSemanticColor("fill-surfaceBase");

// A checkerboard strip under see-through colors, so their transparency shows
const CHECKERBOARD_STYLE = {
  backgroundImage: "repeating-conic-gradient(#8080804D 0% 25%, transparent 0% 50%)",
  backgroundSize: "12px 12px",
};

const toRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

// The color as it shows on the surface: see-through colors mix with it
function mixWithSurface(value: string, surface: string) {
  const alpha = value.length === 9 ? parseInt(value.slice(7), 16) / 255 : 1;
  const below = toRgb(surface);
  return toRgb(value).map((channel, i) => channel * alpha + below[i] * (1 - alpha));
}

// WCAG relative luminance
function getLuminance(rgb: number[]) {
  const [r, g, b] = rgb.map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Black or white text, whichever has more contrast on the swatch
function hasDarkLabel(value: string, surface: string) {
  const luminance = getLuminance(mixWithSurface(value, surface));
  return (luminance + 0.05) / 0.05 >= 1.05 / (luminance + 0.05);
}

// The color block: its name and hex sit on the swatch, in black or white, whichever reads better
function ColorSwatch({ name, value, theme }: { name: string; value: string; theme: Theme }) {
  const isDarkLabel = hasDarkLabel(value, SURFACE[theme]);
  const isSeeThrough = value.length === 9;
  const surfaceStyle = useMemo(() => ({ backgroundColor: SURFACE[theme] }), [theme]);
  const colorStyle = useMemo(() => ({ backgroundColor: value }), [value]);

  return (
    <div className="relative flex h-88 flex-1 items-end" style={surfaceStyle}>
      {isSeeThrough && <div className="absolute inset-x-0 top-0 h-24" style={CHECKERBOARD_STYLE} />}
      {/* The swatch shows the raw value, so it can't use a color token */}
      <div className="absolute inset-0" style={colorStyle} />
      <div className={cx("relative flex flex-col gap-2 p-12 font-mono", isDarkLabel ? "text-black" : "text-white")}>
        <span className="text-15">{name}</span>
        <span className="text-body-small">{formatColor(value)}</span>
      </div>
    </div>
  );
}

function ColorCard({ color, theme }: { color: SemanticColor; theme: Theme }) {
  return (
    <div className="flex overflow-hidden rounded-8 border border-slate-600">
      <ColorSwatch name={color.code} value={color[theme]} theme={theme} />
    </div>
  );
}

const EXAMPLES_SECTION: DocsSectionInfo = { id: "colors-semantic", title: "Semantic colors" };

/**
 * Examples tab: the semantic colors in one section, a grid of color blocks per group. Lines only split the groups.
 * Its Dark | Light switch changes the site theme, like the one in the header.
 */
export function ColorsExamples() {
  const { theme, setThemeMode } = useTheme();

  return (
    <DocsSection
      section={EXAMPLES_SECTION}
      flush
      titleAction={<ThemeTabs selected={theme} setSelected={setThemeMode} />}
    >
      <p className="text-body-large px-24 pt-24 text-typography-secondary max-md:px-16 max-md:pt-16">
        The semantic color tokens. Most of these names are not in src/config/colors.ts yet: the Changelog tab lists the
        steps.
      </p>
      {SEMANTIC_COLORS.map((group, index) => (
        // data-docs-section also lists each group in the "On this page" menu
        <div
          key={group.id}
          id={group.id}
          data-docs-section={group.title}
          className={cx("flex scroll-mt-16 flex-col gap-16 p-24 max-md:p-16", {
            "border-t border-fill-surfaceElevated": index > 0,
          })}
        >
          <h3 className="text-body-large font-medium">{group.title}</h3>
          <div className="grid grid-cols-1 gap-16 md:grid-cols-3">
            {group.colors.map((color) => (
              <ColorCard key={color.code} color={color} theme={theme} />
            ))}
          </div>
        </div>
      ))}
    </DocsSection>
  );
}

/**
 * Changelog tab: the steps that move the code to the semantic colors, as exact edits and rename scripts.
 */
export function ColorsChangelog() {
  return (
    <DocsChangelog
      title="Colors changelog"
      summary="5 steps that move src/config/colors.ts and the app to the semantic colors: 62 tokens become 41. None of them are done yet. Each edit gives the file, the exact text to find at release 0f9e06e991 and the text to put instead; the renames come as scripts."
      notes={COLORS_CHANGELOG_NOTES}
      steps={COLORS_CHANGELOG_STEPS}
    />
  );
}
