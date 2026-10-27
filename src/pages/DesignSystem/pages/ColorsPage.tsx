import cx from "classnames";
import { Fragment, type ReactNode, useMemo } from "react";

import { Theme, useTheme } from "context/ThemeContext/ThemeContext";

import { ThemeTabs } from "../DesignSystemThemeSwitcher";
import { DocsSection, DocsSectionInfo } from "../DocsLayout";

// Colors page of the design system site (/ui/colors).
// Examples: the semantic colors. Changelog: what developers change in the code so it matches them.

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
      { code: "button-secondary", dark: "#1E2033", light: "#E0E0EB" },
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

type ValueChange = {
  token: string;
  theme: "Dark" | "Light";
  before: string;
  after: string;
};

// Step 1 uses the current token names
const VALUE_CHANGES: ValueChange[] = [
  { token: "typography-primary", theme: "Light", before: "#000000", after: "#090A14" },
  { token: "stroke-primary", theme: "Light", before: "#D4D4E2", after: "#CCCCE0" },
  { token: "slate-500", theme: "Light", before: "#C4C6D5", after: "#9FA3BC" },
  { token: "fill-surfaceHover", theme: "Light", before: "#696D961A", after: "#A0A3C41A" },
  { token: "blue-300", theme: "Light", before: "#7885FF", after: "#2D42FC" },
  { token: "blue-100", theme: "Light", before: "#A4C3F9", after: "#2D42FC" },
  { token: "button-primaryActive", theme: "Light", before: "#2637CE", after: "#2536CD" },
  { token: "button-secondary", theme: "Dark", before: "#23263B", after: "#1E2033" },
  { token: "button-secondary", theme: "Light", before: "#E0E0E8", after: "#E0E0EB" },
  { token: "button-secondaryDisabled", theme: "Light", before: "#E0E0E8", after: "#E0E0EB" },
  { token: "green-100", theme: "Dark", before: "#A4F9D9", after: "#A4F9D8" },
  { token: "green-900", theme: "Light", before: "#DFFFEB", after: "#DFEFEB" },
];

type NewToken = {
  token: string;
  // The places that move to the new token, by their current names
  move: string;
};

// Step 2: semantic colors the code doesn't have yet. Values come from SEMANTIC_COLORS.
const NEW_TOKENS: NewToken[] = [
  {
    token: "fill-skeleton",
    move: "Loading placeholders: #B4BBFF1A is typed by hand 57 times in 19 files. In light they get a slightly darker gray. The 5% #B4BBFF0D in ConnectWalletPlaceholder stays. The rgb(180 187 255 / 10%) in LeaderboardPage.scss belongs to the unused .LeaderboardNavigation__chip rules: delete them.",
  },
  {
    token: "button-primaryDisabled",
    move: "Disabled primary and primary-action buttons: var(--color-slate-800) in Button.scss. In light they change from #EDEDF2 to #E0E0EB. Secondary buttons keep button-secondaryDisabled.",
  },
  {
    token: "stroke-accent",
    move: "hover:border-typography-primary (2 places) and ring-typography-primary (1 place). The depth chart's lines stay with typography-primary and follow its rename in step 3.",
  },
  {
    token: "blue-backgroundOpacity",
    move: "bg-blue-300/20 (10 places), ColorfulBanner's blue variant (bg-blue-300 bg-opacity-20) and ChartTokenSelector's bg-blue-300 bg-opacity-[20%]. Write bg-blue-backgroundOpacity with no /20 or bg-opacity: the token is already see-through, and a /20 on it produces no CSS.",
  },
  {
    token: "yellow-backgroundOpacity",
    move: "ColorfulBanner's yellow variant (bg-yellow-300 bg-opacity-20) and the Frozen badge in OrderItem (bg-yellow-300/20). Both go from 20% to 12%. Write it with no /20 or bg-opacity, as above.",
  },
  {
    token: "overlay-50",
    move: "The modal backdrop (#090a1480 in Modal.css) and the mobile menu's backdrop (bg-[#090A1480] in MobileSideNav.tsx).",
  },
];

type Rename = {
  from: string;
  to: string;
  note?: string;
};

// Step 3: names that say what each color is for. A note only where there is more to do than a rename.
const RENAMES: Rename[] = [
  { from: "slate-950", to: "fill-background" },
  { from: "slate-900", to: "fill-surfaceBase" },
  { from: "fill-card", to: "fill-surfaceBase88" },
  {
    from: "slate-800",
    to: "fill-surfaceElevated",
    note: "Same values as fill-surfaceElevated, so the two become one. 19 uses are borders: rename them too (same color).",
  },
  { from: "typography-inactive", to: "textIcon-inactive" },
  {
    from: "slate-600",
    to: "stroke-primary, fill-accent",
    note: "Borders (112 uses), the 9 divider lines drawn as a fill (.card-divider, .Tooltip-divider, h-[0.5px] and similar) and 6 chart grid and axis lines → stroke-primary: in light they change from #D4D4E2 to #CCCCE0. The other fills (22) and the hover gradient in TradeBox → fill-accent, same color. The Breadcrumbs separator and the disabled row text in SelectorBase.scss → textIcon-inactive, the closest text color (dark #363A59 → #3E4361, light #D4D4E2 → #C4C4D5).",
  },
  {
    from: "blue-600",
    to: "button-primary",
    note: "2 borders in App.scss and 1 text color in DeprecatedExchageStyles.scss: rename them too (same color).",
  },
  { from: "blue-300", to: "blue-strong" },
  {
    from: "blue-400",
    to: "button-primary, blue-strong",
    note: "Fills (13 uses) → button-primary, including 8 highlights at /20 (7 in the side menu, 1 on the wallet icon buttons) that become bg-button-primary/20 (no visible change). Text (17) → blue-strong: in dark it changes from #2D42FC to #7885FF. The ToggleSwitch border goes with the fills, the AnimatedGradientText stop with the text. --primary-btn-hover and --primary-btn-active in Shared.scss belong to the unused .default-btn: delete them.",
  },
  {
    from: "slate-700",
    to: "button-background",
    note: "15 uses are borders: rename them too (same color). bg-fill-slate-700 in ToggleSwitch.tsx draws nothing today: fix it separately.",
  },
  {
    from: "typography-primary",
    to: "textIcon-primary",
    note: "2 chart lines: rename them too (same color). Its 2 fills or borders are in unused CSS (.pagination-btn and .LeaderboardNavigation__chip): delete those rules.",
  },
  { from: "typography-secondary", to: "textIcon-secondary" },
  {
    from: "slate-100",
    to: "textIcon-secondary",
    note: "Same values as typography-secondary, so both become textIcon-secondary. 10 fills or borders and 2 chart lines: rename them too (same color).",
  },
  {
    from: "slate-500",
    to: "textIcon-disabled",
    note: "8 fills or borders, the scrollbar color and 5 chart lines: rename them too (same color).",
  },
  { from: "white", to: "textIcon-onButton", note: "8 uses are fills or borders: rename them too (same color)." },
  { from: "blue-100", to: "blue-secondary" },
  { from: "cold-blue-900", to: "blue-background" },
  { from: "green-500", to: "green-strong" },
  { from: "green-100", to: "green-secondary" },
  { from: "green-900", to: "green-background" },
  { from: "red-500", to: "red-strong" },
  { from: "red-100", to: "red-secondary" },
  { from: "red-900", to: "red-background" },
  { from: "yellow-300", to: "yellow-strong" },
  {
    from: "yellow-900",
    to: "yellow-background",
    note: "The warning announcement keeps bg-yellow-background/90, like the other announcements.",
  },
];

// Where token names are used, besides src/config/colors.ts
const NAME_PLACES = [
  "Tailwind classes and --color-* variables",
  "the color names in tailwind.config.ts: PRIMARY_TEXT_COLOR_NAMES includes white and typography-primary",
  "colors.<group>[<shade>] reads in TypeScript (the charts and their spec, the wallet provider)",
  "color names passed as strings, like the gradientColor of TableScrollFade",
  "index.html",
  "class names checked in tests, in src and autotests/, including regex forms like border-(yellow-300|red-500)",
];

type Swap = {
  from: string;
  // No new color: the styles that use the token are unused, so they go
  to?: string;
  before?: ThemeValues;
  note?: string;
};

// Step 4: colors only in the code. They take the closest semantic color, by the names from steps 2 and 3.
const SWAPS: Swap[] = [
  {
    from: "green-700",
    to: "green-strong",
    before: { dark: "#0FDE8D", light: "#0FDE8D" },
    note: "Its other use, ColorfulBanner's unused green variant, is deleted with green-600 (see below).",
  },
  {
    from: "gray-50",
    note: "Only used by the .App-header link styles in App.scss and the .menu-item-label hover in NetworkDropdown.scss, which nothing uses: delete those rules.",
  },
  { from: "green-600", note: "Only used by ColorfulBanner's green variant, which nothing uses: delete it." },
  {
    from: "red-400",
    to: "red-strong",
    before: { dark: "#FF637A", light: "#FF637A" },
    note: "Mostly on debug pages. One live use: the TP/SL Cancel button text. In light, the link in ErrorToastWithSupport loses its hover color: its text-red-100 becomes red-secondary, which has the same light value as red-strong (#EA2A46).",
  },
  {
    from: "blue-500",
    to: "button-primary",
    before: { dark: "#3D51FF", light: "#3D51FF" },
    note: "Update the bg-blue-500 checks in autotests/regression/ui (settings.spec.ts, swapDetails.spec.ts).",
  },
  {
    from: "fill-surfaceElevatedHover",
    to: "fill-surfaceHover",
    before: { dark: "#18192A", light: "#EFEFEF" },
    note: "The hover becomes a 10% tint over whatever is behind the field. In dark, on a fill-surfaceBase card, it is barely different from the field (#202332 vs #1E2033). Check the input hovers.",
  },
  { from: "gray-100", to: "textIcon-primary", before: { dark: "#E7E7E9", light: "#333333" } },
  {
    from: "gray-400",
    to: "textIcon-secondary",
    before: { dark: "#9FA0A7", light: "#999999" },
    note: "7 uses are underlines or borders. There is no stroke-secondary token yet, so for now they take textIcon-secondary too.",
  },
  { from: "green-300", to: "green-strong", before: { dark: "#56DBA8", light: "#56DBA8" } },
  {
    from: "green-400",
    to: "green-secondary",
    before: { dark: "#8CF3CB", light: "#8CF3CB" },
    note: "Only on debug pages.",
  },
  { from: "gray-300", to: "textIcon-secondary", before: { dark: "#B7B8BD", light: "#777777" } },
  {
    from: "yellow-500",
    to: "yellow-strong",
    before: { dark: "#F3B50C", light: "#F3B50C" },
    note: "Update the 2 selectors in TradeBox.ct.spec.tsx.",
  },
  {
    from: "gray-800",
    to: "fill-accent",
    before: { dark: "#FFFFFF33", light: "#00000033" },
    note: "2 uses are 1px divider lines (ChainsStatsTooltipRow, GmxCard): give them stroke-primary, like the other dividers (light #CCCCE0). Its border in Pagination.css (.pagination-btn:hover) and --dark-blue-border in Shared.scss are unused: delete them.",
  },
  {
    from: "gray-900",
    to: "stroke-primary",
    before: { dark: "#FFFFFF1A", light: "#0000001A" },
    note: "2 uses are fills: give them fill-accent (dark #363A59, light #D4D4E2).",
  },
  {
    from: "gray-700",
    to: "stroke-primary",
    before: { dark: "#585866", light: "#F0F0F0" },
    note: "Only on debug cards.",
  },
  {
    from: "gray-500",
    to: "textIcon-disabled",
    before: { dark: "#878891", light: "#BBBBBB" },
    note: "Almost all on debug pages.",
  },
  { from: "gray-200", to: "textIcon-secondary", before: { dark: "#CFCFD3", light: "#555555" } },
  {
    from: "red-700",
    to: "red-strong",
    before: { dark: "#B33055", light: "#B33055" },
    note: "One live use: the TP/SL hover. The debug button in ErrorBoundary loses its hover.",
  },
  {
    from: "cold-blue-700",
    note: "Only used by the block tab hover in Tabs.css and --dark-blue-active in Shared.scss (used by NetworkDropdown.scss), which nothing uses: delete those rules.",
  },
];

// Step 5: tokens nothing uses
const UNUSED_TOKENS = ["slate-750", "gray-600", "gray-950", "green-800"];

// "#RRGGBBAA" reads as "#RRGGBB · 10%"
function formatColor(value: string) {
  if (value.length !== 9) {
    return value;
  }
  return `${value.slice(0, 7)} · ${Math.round((parseInt(value.slice(7), 16) / 255) * 100)}%`;
}

function ColorValue({ value }: { value: string }) {
  const swatchStyle = useMemo(() => ({ backgroundColor: value }), [value]);

  return (
    <span className="flex items-center gap-8">
      {/* The swatch shows the raw value, so it can't use a color token */}
      <span className="size-16 shrink-0 rounded-4 border border-slate-600" style={swatchStyle} />
      <span className="font-mono text-15">{formatColor(value)}</span>
    </span>
  );
}

function ColorChange({ before, after }: { before: string; after: string }) {
  return (
    <span className="flex items-center gap-8 whitespace-nowrap">
      <ColorValue value={before} />
      <span className="text-typography-secondary">→</span>
      <ColorValue value={after} />
    </span>
  );
}

function ThemeChange({ theme, before, after }: { theme: string; before: string; after: string }) {
  return (
    <span className="flex items-center gap-8">
      <span className="text-body-small w-40 shrink-0 text-typography-secondary">{theme}</span>
      <ColorChange before={before} after={after} />
    </span>
  );
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

const CHANGELOG_SECTIONS = {
  values: { id: "colors-change-values", title: "1. Change these values" },
  added: { id: "colors-add-tokens", title: "2. Add these tokens" },
  names: { id: "colors-rename-tokens", title: "3. Rename these tokens" },
  swaps: { id: "colors-swap-tokens", title: "4. Replace these tokens with semantic colors" },
  unused: { id: "colors-delete-unused", title: "5. Delete these unused tokens" },
} satisfies Record<string, DocsSectionInfo>;

const INTRO_CLASSNAME = "text-body-large text-typography-secondary";
const TH_CLASSNAME = "pb-8 pr-16 font-normal";
const CODE_CELL_CLASSNAME = "whitespace-nowrap py-10 pr-16 font-mono text-15";
const NEW_NAME_CLASSNAME = cx(CODE_CELL_CLASSNAME, "text-blue-400 dark:text-blue-300");

// A row's note on its own line under it, across the table, so long notes stay readable
function NoteRow({ columns, children }: { columns: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={columns} className="pb-12 text-typography-secondary">
        {children}
      </td>
    </tr>
  );
}

/**
 * Changelog tab: what to change in the code, step by step. Values first, with the current names; then the new tokens
 * and the places that move to them; then the renames; then the colors only in the code; then the unused tokens.
 */
export function ColorsChangelog() {
  return (
    <div className="flex flex-col gap-16">
      <p className={INTRO_CLASSNAME}>
        Steps to move src/config/colors.ts to the semantic colors, in this order. None of them are done yet.
      </p>

      <DocsSection section={CHANGELOG_SECTIONS.values}>
        <div className="flex flex-col gap-16">
          <p className={INTRO_CLASSNAME}>In src/config/colors.ts, with the current token names.</p>
          <div className="overflow-x-auto">
            <table className="text-body-large w-full min-w-[560px] border-collapse text-left">
              <thead>
                <tr className="text-body-medium uppercase text-typography-secondary">
                  <th className={TH_CLASSNAME}>Token</th>
                  <th className={TH_CLASSNAME}>Theme</th>
                  <th className={TH_CLASSNAME}>Old → New</th>
                </tr>
              </thead>
              <tbody>
                {VALUE_CHANGES.map((change) => (
                  <tr key={`${change.token}-${change.theme}`} className="border-t-1/2 border-slate-600">
                    <td className={CODE_CELL_CLASSNAME}>{change.token}</td>
                    <td className="py-10 pr-16">{change.theme}</td>
                    <td className="py-10 pr-16">
                      <ColorChange before={change.before} after={change.after} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </DocsSection>

      <DocsSection section={CHANGELOG_SECTIONS.added}>
        <div className="flex flex-col gap-16">
          <p className={INTRO_CLASSNAME}>
            In src/config/colors.ts, with these values. Then move the listed places to the new token. They use the
            current names, so do this before the renames in step 3.
          </p>
          <div className="overflow-x-auto">
            <table className="text-body-large w-full min-w-[560px] border-collapse text-left">
              <thead>
                <tr className="text-body-medium uppercase text-typography-secondary">
                  <th className={TH_CLASSNAME}>New token</th>
                  <th className={TH_CLASSNAME}>Dark</th>
                  <th className="pb-8 font-normal">Light</th>
                </tr>
              </thead>
              <tbody>
                {NEW_TOKENS.map(({ token, move }) => (
                  <Fragment key={token}>
                    <tr className="border-t-1/2 border-slate-600 align-top">
                      <td className={NEW_NAME_CLASSNAME}>{token}</td>
                      <td className="whitespace-nowrap py-10 pr-16">
                        <ColorValue value={getSemanticColor(token).dark} />
                      </td>
                      <td className="whitespace-nowrap py-10">
                        <ColorValue value={getSemanticColor(token).light} />
                      </td>
                    </tr>
                    <NoteRow columns={3}>Move here: {move}</NoteRow>
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </DocsSection>

      <DocsSection section={CHANGELOG_SECTIONS.names}>
        <div className="flex flex-col gap-16">
          <div className={cx(INTRO_CLASSNAME, "flex flex-col gap-8")}>
            <p>In src/config/colors.ts and everywhere the old name is used:</p>
            <ul className="flex list-disc flex-col gap-4 pl-20">
              {NAME_PLACES.map((place) => (
                // pb-0 resets the padding that Shared.scss adds under every li
                <li key={place} className="pb-0">
                  {place}
                </li>
              ))}
            </ul>
            <p>
              Leave landing/ and public/tradingview-chart.css alone: they have their own colors. Values stay the same,
              except where a note says so.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="text-body-large w-full min-w-[480px] border-collapse text-left">
              <thead>
                <tr className="text-body-medium uppercase text-typography-secondary">
                  <th className={TH_CLASSNAME}>Old name</th>
                  <th className="pb-8 font-normal">New name</th>
                </tr>
              </thead>
              <tbody>
                {RENAMES.map((rename) => (
                  <Fragment key={rename.from}>
                    <tr className="border-t-1/2 border-slate-600 align-top">
                      <td className={CODE_CELL_CLASSNAME}>{rename.from}</td>
                      <td className={NEW_NAME_CLASSNAME}>{rename.to}</td>
                    </tr>
                    {rename.note && <NoteRow columns={2}>{rename.note}</NoteRow>}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </DocsSection>

      <DocsSection section={CHANGELOG_SECTIONS.swaps}>
        <div className="flex flex-col gap-16">
          <p className={INTRO_CLASSNAME}>
            Do this after steps 2 and 3, because the new colors below use the token names those steps add. Replace every
            use of the old token, in the same places as in step 3, then delete it from src/config/colors.ts. The old
            neutral grays become the bluish grays of the semantic colors, so some look lighter or darker. Three rows
            have no replacement: only unused styles use them, so those styles are deleted. blue-700, slate-400,
            cold-blue-500 and black are not part of these steps and stay as they are.
          </p>
          <div className="overflow-x-auto">
            <table className="text-body-large w-full min-w-[680px] border-collapse text-left">
              <thead>
                <tr className="text-body-medium uppercase text-typography-secondary">
                  <th className={TH_CLASSNAME}>Old token</th>
                  <th className={TH_CLASSNAME}>New color</th>
                  <th className="pb-8 font-normal">Old → New</th>
                </tr>
              </thead>
              <tbody>
                {SWAPS.map((swap) => (
                  <Fragment key={swap.from}>
                    <tr className="border-t-1/2 border-slate-600 align-top">
                      <td className={CODE_CELL_CLASSNAME}>{swap.from}</td>
                      <td className={NEW_NAME_CLASSNAME}>{swap.to ?? "—"}</td>
                      <td className="py-10">
                        {swap.to && swap.before && (
                          <div className="flex flex-col gap-6">
                            <ThemeChange
                              theme="Dark"
                              before={swap.before.dark}
                              after={getSemanticColor(swap.to).dark}
                            />
                            <ThemeChange
                              theme="Light"
                              before={swap.before.light}
                              after={getSemanticColor(swap.to).light}
                            />
                          </div>
                        )}
                      </td>
                    </tr>
                    {swap.note && <NoteRow columns={3}>{swap.note}</NoteRow>}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </DocsSection>

      <DocsSection section={CHANGELOG_SECTIONS.unused}>
        <div className="flex flex-col gap-16">
          <p className={INTRO_CLASSNAME}>From src/config/colors.ts. Nothing in the app uses them.</p>
          <div className="flex flex-wrap gap-8">
            {UNUSED_TOKENS.map((token) => (
              <span key={token} className="rounded-4 bg-slate-800 px-8 py-4 font-mono text-15">
                {token}
              </span>
            ))}
          </div>
        </div>
      </DocsSection>
    </div>
  );
}
