// The Colors Changelog as data: exact edits and rename scripts for the product repo, step by step
// (rendered by DocsChangelog).
import type { ChangelogStep } from "../DocsChangelog";

// Rules for all steps: scope, order of work, the scripts, known gaps
export const COLORS_CHANGELOG_NOTES: string[] = [
  "Scope: the colors in src/config/colors.ts and every place that uses them in src, autotests and index.html; landing has its own palette and stays out. Nothing here is done at origin/release 0f9e06e991.",
  "Each step: apply its edits first (line numbers are from origin/release, so after earlier steps match the find text), then run its script. A script renames classes (bg-, text-, border- and the rest) and --color-* variables in one pass and prints the files it changed, which go straight to prettier.",
  "After a script, prettier-plugin-tailwindcss re-sorts the renamed classes: the find texts of later steps are written for that formatted text.",
  "Tokens: 62 at release, 41 after step 5: the 37 semantic colors on the Examples tab plus blue-700, cold-blue-500, slate-400 and black, which stay as they are.",
  "Order of work: Colors steps 1-5, then the Typography changelog, then Button, Table and Spacing. Those three use the release names: run their copied Markdown through the script of Typography step 10 first.",
  "Rename tokens in .scss files in the same change as their step: a missed --color-* name there fails silently, with no build error.",
  "Known gap: 5 class names at release use colors that don't exist (slate-200, slate-300, red-300, yellow-400, typography-tertiary). They draw nothing today and stay as they are.",
  "Known gap: the bg-black/70 backdrops in SlideModal.tsx and Curtain.tsx stay as they are; only the modal and mobile menu backdrops move to overlay-50.",
  "The pre-commit hook runs yarn lingui:prepare (extract and compile), yarn build-sdk, yarn tscheck and lint-staged (eslint --fix --max-warnings=0 and prettier --write on staged src, landing and sdk files; autotests are not covered), then stages src/locales; the pre-push hook runs yarn test:ci, yarn test:ct and the sdk tests.",
];

export const COLORS_CHANGELOG_STEPS: ChangelogStep[] = [
  {
    id: "colors-change-values",
    title: "1. Change these values",
    goal: "11 values in src/config/colors.ts move to the semantic color they stand for. The names don't change yet.",
    dependsOn: [],
    edits: [
      {
        file: "src/config/colors.ts",
        line: "5",
        find: '    100: { light: "#A4C3F9", dark: "#A4C3F9" },',
        replace: '    100: { light: "#2D42FC", dark: "#A4C3F9" },',
      },
      {
        file: "src/config/colors.ts",
        line: "6",
        find: '    300: { light: "#7885FF", dark: "#7885FF" },',
        replace: '    300: { light: "#2D42FC", dark: "#7885FF" },',
      },
      {
        file: "src/config/colors.ts",
        line: "20",
        find: '    500: { light: "#C4C6D5", dark: "#646a8f" },',
        replace: '    500: { light: "#9FA3BC", dark: "#646a8f" },',
      },
      {
        file: "src/config/colors.ts",
        line: "54",
        find: '    100: { light: "#109375", dark: "#A4F9D9" },',
        replace: '    100: { light: "#109375", dark: "#A4F9D8" },',
      },
      {
        file: "src/config/colors.ts",
        line: "61",
        find: '    900: { light: "#DFFFEB", dark: "#192E38" },',
        replace: '    900: { light: "#DFEFEB", dark: "#192E38" },',
      },
      {
        file: "src/config/colors.ts",
        line: "66",
        find: '    secondary: { light: "#E0E0E8", dark: "#23263b" },',
        replace: '    secondary: { light: "#E0E0EB", dark: "#23263b" },',
      },
      {
        file: "src/config/colors.ts",
        line: "68",
        find: '    secondaryDisabled: { light: "#E0E0E8", dark: "#1e2033" },',
        replace: '    secondaryDisabled: { light: "#E0E0EB", dark: "#1e2033" },',
      },
      {
        file: "src/config/colors.ts",
        line: "70",
        find: '    primaryActive: { light: "#2637ce", dark: "#2536cd" },',
        replace: '    primaryActive: { light: "#2536cd", dark: "#2536cd" },',
      },
      {
        file: "src/config/colors.ts",
        line: "76",
        find: '    surfaceHover: { light: "#696D961A", dark: "#A0A3C41A" },',
        replace: '    surfaceHover: { light: "#A0A3C41A", dark: "#A0A3C41A" },',
      },
      {
        file: "src/config/colors.ts",
        line: "81",
        find: '    primary: { light: "#000000", dark: "#ffffff" },',
        replace: '    primary: { light: "#090A14", dark: "#ffffff" },',
      },
      {
        file: "src/config/colors.ts",
        line: "86",
        find: '    primary: { light: "#D4D4E2", dark: "#363a59" },',
        replace: '    primary: { light: "#CCCCE0", dark: "#363a59" },',
      },
    ],
    verify: ["yarn tscheck"],
    visible:
      "Light theme only: primary text #090A14 instead of #000000, lines #CCCCE0, disabled text #9FA3BC, blue text and links #2D42FC, a softer hover tint. The other changes are too small to see.",
  },
  {
    id: "colors-add-tokens",
    title: "2. Add these tokens",
    goal: "Six semantic colors the code doesn't have yet (fill-skeleton, button-primaryDisabled, stroke-accent, blue-backgroundOpacity, yellow-backgroundOpacity, overlay-50), and the places that move to them.",
    dependsOn: [],
    edits: [
      {
        file: "src/config/colors.ts",
        line: "10",
        find: '    700: { light: "#2e3dcd", dark: "#2e3dcd" },',
        replace:
          '    700: { light: "#2e3dcd", dark: "#2e3dcd" },\n    backgroundOpacity: { light: "#7885FF33", dark: "#7885FF33" },',
      },
      {
        file: "src/config/colors.ts",
        line: "44",
        find: '    900: { light: "#FFF9D0", dark: "#2E2D29" },',
        replace:
          '    900: { light: "#FFF9D0", dark: "#2E2D29" },\n    backgroundOpacity: { light: "#FF94001F", dark: "#FFE1661F" },',
      },
      {
        file: "src/config/colors.ts",
        line: "67",
        find: '    secondaryHover: { light: "#dadce8", dark: "#282d46" },',
        replace:
          '    secondaryHover: { light: "#dadce8", dark: "#282d46" },\n    primaryDisabled: { light: "#E0E0EB", dark: "#1E2033" },',
      },
      {
        file: "src/config/colors.ts",
        line: "77",
        find: '    accent: { light: "#D4D4E2", dark: "#363A59" },',
        replace:
          '    accent: { light: "#D4D4E2", dark: "#363A59" },\n    skeleton: { light: "#696D961F", dark: "#B4BBFF1A" },',
      },
      {
        file: "src/config/colors.ts",
        line: "85",
        find: "  stroke: {",
        replace: '  stroke: {\n    accent: { light: "#090A14", dark: "#FFFFFF" },',
      },
      {
        file: "src/config/colors.ts",
        line: "88",
        find: "} satisfies ColorTree;",
        replace: '  overlay: {\n    50: { light: "#090A1480", dark: "#090A1480" },\n  },\n} satisfies ColorTree;',
      },
      {
        file: "src/components/Skeleton/Skeleton.scss",
        line: "2",
        find: "  background: linear-gradient(to right, transparent, #b4bbff1a, transparent);",
        replace: "  background: linear-gradient(to right, transparent, var(--color-fill-skeleton), transparent);",
        note: "In light, the loading shimmer gets the slightly darker skeleton gray, like the skeleton fills.",
      },
      {
        file: "src/components/Button/Button.scss",
        line: "142",
        find: "      background-color: var(--color-slate-800);",
        replace: "      background-color: var(--color-button-primaryDisabled);",
        note: "In light, disabled primary and primary-action buttons change from #EDEDF2 to #E0E0EB.",
      },
      {
        file: "src/components/PositionItem/PositionItemTPSLCell.tsx",
        line: "89",
        find: '              : "ml-8 gap-2 rounded-full border border-slate-500 px-8 py-3 text-12 font-medium text-typography-secondary hover:border-typography-primary hover:text-typography-primary"',
        replace:
          '              : "ml-8 gap-2 rounded-full border border-slate-500 px-8 py-3 text-12 font-medium text-typography-secondary hover:border-stroke-accent hover:text-typography-primary"',
      },
      {
        file: "src/components/PositionItem/PositionItemTPSLCell.tsx",
        line: "143-144",
        find: '            ? "size-20 text-typography-secondary hover:text-typography-primary"\n            : "ml-8 gap-2 rounded-full border border-slate-500 px-8 py-3 text-12 font-medium text-typography-secondary hover:border-typography-primary hover:text-typography-primary"',
        replace:
          '            ? "size-20 text-typography-secondary hover:text-typography-primary"\n            : "ml-8 gap-2 rounded-full border border-slate-500 px-8 py-3 text-12 font-medium text-typography-secondary hover:border-stroke-accent hover:text-typography-primary"',
      },
      {
        file: "src/components/SettingsModal/shared.tsx",
        line: "153",
        find: '    outline: "text-typography-primary ring-1 ring-inset ring-typography-primary",',
        replace: '    outline: "text-typography-primary ring-1 ring-inset ring-stroke-accent",',
      },
      {
        file: "src/components/ColorfulBanner/ColorfulBanner.tsx",
        line: "25",
        find: '    bg: "bg-blue-300 bg-opacity-20",',
        replace: '    bg: "bg-blue-backgroundOpacity",',
      },
      {
        file: "src/components/ColorfulBanner/ColorfulBanner.tsx",
        line: "31",
        find: '    bg: "bg-yellow-300 bg-opacity-20",',
        replace: '    bg: "bg-yellow-backgroundOpacity",',
        note: "Yellow banners get a fainter background: 20% yellow becomes 12% in both themes.",
      },
      {
        file: "src/components/ChartTokenSelector/ChartTokenSelector.tsx",
        line: "136",
        find: '                <div className="rounded-4 bg-blue-300 bg-opacity-[20%] px-7 py-4 text-blue-300">',
        replace: '                <div className="rounded-4 bg-blue-backgroundOpacity px-7 py-4 text-blue-300">',
      },
      {
        file: "src/components/Modal/Modal.css",
        line: "34",
        find: "  background: #090a1480;",
        replace: "  background: var(--color-overlay-50);",
      },
      {
        file: "src/components/SideNav/MobileSideNav.tsx",
        line: "29",
        find: '          <div className="fixed inset-0 z-[999] bg-[#090A1480]" onClick={handleToggle} />',
        replace: '          <div className="fixed inset-0 z-[999] bg-overlay-50" onClick={handleToggle} />',
      },
      {
        file: "src/pages/LeaderboardPage/LeaderboardPage.scss",
        line: "409-442",
        find: ".LeaderboardNavigation__chip {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  border-radius: 999rem;\n  font-size: 1.1rem;\n  padding: 0.3rem 0.6rem;\n  margin-right: 0.8rem;\n  height: 2.2rem;\n\n  &_soon {\n    background-color: var(--color-blue-600);\n  }\n\n  &_over {\n    background-color: rgb(180 187 255 / 10%);\n  }\n\n  &_live {\n    background-color: #b42941;\n    color: var(--color-typography-primary);\n  }\n\n  &-circle {\n    background-color: var(--color-typography-primary);\n    border-radius: 9999rem;\n    width: 1.1rem;\n    height: 1.1rem;\n    display: inline-block;\n    margin-right: 0.3rem;\n  }\n}\n\n",
        replace: "DELETE",
      },
    ],
    verify: ["yarn tscheck", "git grep -n -i '\"#B4BBFF1A\"' -- src returns nothing"],
    visible:
      "Light theme: loading placeholders get a slightly darker gray, disabled primary buttons #E0E0EB instead of #EDEDF2. Both themes: the Frozen badge and yellow banners use a 12% tint instead of 20%.",
    scripts: [
      {
        title: "Move the hand-typed skeleton color and the 20% tints to the new tokens",
        file: "colors-step-2.mjs",
        run: "node colors-step-2.mjs | xargs npx prettier --write",
        code: 'const STEPS = [\n[\n  {\n    "literal": "\\"#B4BBFF1A\\"",\n    "to": "\\"var(--color-fill-skeleton)\\""\n  },\n  {\n    "literal": "\\"#b4bbff1a\\"",\n    "to": "\\"var(--color-fill-skeleton)\\""\n  },\n  {\n    "cls": "bg-blue-300/20",\n    "to": "bg-blue-backgroundOpacity"\n  },\n  {\n    "cls": "bg-yellow-300/20",\n    "to": "bg-yellow-backgroundOpacity"\n  }\n],\n];\n// Renames design-system names in the app (src, autotests, index.html), in text from stdin (--text), in a JSON list of\n// { file, text } (--json), or in the Find and Replace blocks of a changelog\'s Markdown (--markdown).\n// STEPS (set above this code) run in order. Each rule: { color, to } renames <prefix>-<color> classes and\n// --color-<color> variables, where "to" is one name or { fill, stroke, text, default } by how the color is used;\n// { cls, to } renames a class, { cssVar, to } a variable, { literal, to } an exact text. A step\'s rules apply in one pass.\nimport fs from "node:fs";\nimport path from "node:path";\n\nconst SCOPE = ["src", "autotests", "index.html"];\nconst SKIP = ["node_modules", "src/locales", "src/pages/DesignSystem", "src/config/colors.ts"];\nconst EXT = /\\.(tsx|ts|jsx|js|scss|css|html)$/;\nconst PREFIX_KIND = {\n  bg: "fill", from: "fill", via: "fill", to: "fill", fill: "fill", accent: "fill",\n  border: "stroke", "border-t": "stroke", "border-r": "stroke", "border-b": "stroke", "border-l": "stroke",\n  "border-x": "stroke", "border-y": "stroke", "border-s": "stroke", "border-e": "stroke", divide: "stroke",\n  ring: "stroke", "ring-offset": "stroke", outline: "stroke", stroke: "stroke", decoration: "stroke", shadow: "stroke",\n  text: "text", placeholder: "text", caret: "text",\n};\nconst PROPERTY_KIND = [\n  [/^(background|background-color|backgroundColor|background-image|fill|stop-color|stopColor)$/, "fill"],\n  [/^(border|border-[\\w-]+|border[A-Z]\\w*|outline|outline-color|outlineColor|box-shadow|boxShadow|stroke|text-decoration-color|column-rule-color|scrollbar-color)$/, "stroke"],\n  [/^(color|caret-color|caretColor|-webkit-text-fill-color)$/, "text"],\n];\nconst esc = (s) => s.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&");\nconst alt = (keys) => [...keys].sort((a, b) => b.length - a.length).map(esc).join("|");\nconst pick = (to, kind) => (typeof to === "string" ? to : (to[kind] ?? to.default));\nconst inScope = (file) =>\n  SCOPE.some((d) => file === d || file.startsWith(`${d}/`)) && !SKIP.some((s) => file === s || file.startsWith(`${s}/`));\n\nfunction propertyKind(before) {\n  const match = /([A-Za-z-]+)\\s*:\\s*[^;:{}]*$/.exec(before);\n  const found = match && PROPERTY_KIND.find(([rx]) => rx.test(match[1]));\n  return found ? found[1] : "default";\n}\n\nconst counts = new Map();\nconst unresolved = [];\nconst count = (key) => counts.set(key, (counts.get(key) ?? 0) + 1);\n\nfunction makeRenamer(rules) {\n  const classMap = new Map();\n  const varMap = new Map();\n  const literalMap = new Map();\n  for (const rule of rules) {\n    if (rule.color) {\n      for (const prefix of Object.keys(PREFIX_KIND)) {\n        const name = pick(rule.to, PREFIX_KIND[prefix]);\n        classMap.set(`${prefix}-${rule.color}`, name ? `${prefix}-${name}` : null);\n      }\n      varMap.set(`--color-${rule.color}`, rule.to);\n    } else if (rule.cls) classMap.set(rule.cls, rule.to);\n    else if (rule.cssVar) varMap.set(rule.cssVar, rule.to);\n    else if (rule.literal) literalMap.set(rule.literal, rule.to);\n  }\n  const classRx = classMap.size && new RegExp(`(?<![\\\\w\\\\-\\\\[])(${alt(classMap.keys())})(?![\\\\w\\\\-.])`, "g");\n  const varRx = varMap.size && new RegExp(`(?<![\\\\w-])(${alt(varMap.keys())})(?![\\\\w-])`, "g");\n  const literalRx = literalMap.size && new RegExp(`(${alt(literalMap.keys())})`, "g");\n  const renameLine = (line, where) => {\n    let out = line;\n    if (literalRx) out = out.replace(literalRx, (m) => (count(m), literalMap.get(m)));\n    if (classRx) {\n      out = out.replace(classRx, (m) => {\n        const to = classMap.get(m);\n        if (to == null) return unresolved.push(`${where}: ${m}`), m;\n        return count(m), to;\n      });\n    }\n    if (varRx) {\n      out = out.replace(varRx, (m, _g, offset, whole) => {\n        const to = varMap.get(m);\n        const name = typeof to === "string" ? to : pick(to, propertyKind(whole.slice(0, offset)));\n        if (!name) return unresolved.push(`${where}: ${m}`), m;\n        return count(m), m.startsWith("--color-") ? `--color-${name}` : name;\n      });\n    }\n    return out;\n  };\n  return (text, file) =>\n    text\n      .split("\\n")\n      .map((line, i) => renameLine(line, `${file}:${i + 1}`))\n      .join("\\n");\n}\n\nconst renamers = STEPS.map(makeRenamer);\nconst renameAll = (text, file) => renamers.reduce((out, rename) => rename(out, file), text);\nconst mode = process.argv[2];\nconst stdin = () => fs.readFileSync(0, "utf8");\n\nif (mode === "--text") {\n  process.stdout.write(renameAll(stdin(), "stdin"));\n} else if (mode === "--json") {\n  const items = JSON.parse(stdin());\n  process.stdout.write(JSON.stringify(items.map(({ file, text }) => (inScope(file) ? renameAll(text, file) : text))));\n} else if (mode === "--markdown") {\n  // Edits in the copied Markdown look like "3. src/x.tsx:12 (note)" followed by fenced Find / Replace blocks\n  let file = null;\n  let fence = null;\n  const out = [];\n  for (const line of stdin().split("\\n")) {\n    const heading = /^\\d+\\. (\\S+?)(?::[\\d-]+)?(?: \\(|$)/.exec(line);\n    if (!fence && heading) file = heading[1];\n    if (line.startsWith("```")) {\n      if (fence) {\n        out.push(file && inScope(file) ? renameAll(fence.join("\\n"), file) : fence.join("\\n"), line);\n        fence = null;\n      } else {\n        out.push(line);\n        fence = [];\n      }\n      continue;\n    }\n    if (fence) fence.push(line);\n    else out.push(line);\n  }\n  process.stdout.write(out.join("\\n"));\n} else {\n  const files = [];\n  const walk = (p) => {\n    if (SKIP.some((s) => p === s || p.startsWith(`${s}/`)) || !fs.existsSync(p)) return;\n    if (fs.statSync(p).isDirectory()) fs.readdirSync(p).forEach((f) => walk(path.join(p, f)));\n    else if (EXT.test(p)) files.push(p);\n  };\n  SCOPE.forEach(walk);\n  const changed = [];\n  for (const file of files) {\n    const text = fs.readFileSync(file, "utf8");\n    const next = renameAll(text, file);\n    if (next !== text) {\n      fs.writeFileSync(file, next);\n      changed.push(file);\n    }\n  }\n  const total = [...counts.values()].reduce((a, b) => a + b, 0);\n  console.error(`Renamed ${total} names in ${changed.length} files.`);\n  if (unresolved.length) console.error(`Left for the edits (${unresolved.length}):\\n  ${unresolved.join("\\n  ")}`);\n  console.log(changed.join("\\n"));\n}\n',
        expect: "Renamed 67 names in 27 files.",
      },
    ],
  },
  {
    id: "colors-rename-tokens",
    title: "3. Rename these tokens",
    goal: "25 tokens get names that say what they are for (slate-900 becomes fill-surfaceBase, typography-secondary becomes textIcon-secondary); slate-600 and blue-400 split by use.",
    dependsOn: [],
    edits: [
      {
        file: "src/config/colors.ts",
        line: "5-10",
        find: '    100: { light: "#2D42FC", dark: "#A4C3F9" },\n    300: { light: "#2D42FC", dark: "#7885FF" },\n    400: { light: "#2D42FC", dark: "#2D42FC" },\n    500: { light: "#3d51ff", dark: "#3d51ff" },\n    600: { light: "#2d42fc", dark: "#2d42fc" },\n    700: { light: "#2e3dcd", dark: "#2e3dcd" },',
        replace:
          '    500: { light: "#3d51ff", dark: "#3d51ff" },\n    700: { light: "#2e3dcd", dark: "#2e3dcd" },\n    strong: { light: "#2D42FC", dark: "#7885FF" },\n    secondary: { light: "#2D42FC", dark: "#A4C3F9" },\n    background: { light: "#E2E5FD", dark: "#1E223C" },',
        note: "In the order of the semantic colors: 300 and 100 become strong and secondary, background comes from cold-blue-900; 400 goes and 600 moves to button.primary.",
      },
      {
        file: "src/config/colors.ts",
        line: "15-16",
        find: '    900: { light: "#E2E5FD", dark: "#1E223C" },\n',
        replace: "DELETE",
      },
      {
        file: "src/config/colors.ts",
        line: "18-19",
        find: '    100: { light: "#696D96", dark: "#a0a3c4" },\n',
        replace: "DELETE",
        note: "Same values as typography.secondary, so both become textIcon.secondary.",
      },
      {
        file: "src/config/colors.ts",
        line: "20-23",
        find: '    500: { light: "#9FA3BC", dark: "#646a8f" },\n    600: { light: "#D4D4E2", dark: "#363a59" },\n    700: { light: "#DADAE7", dark: "#22243a" },\n',
        replace: "DELETE",
        note: "slate-500 and slate-700 move to textIcon.disabled and button.background; slate-600 goes (its uses become stroke-primary, fill-accent or textIcon-inactive).",
      },
      {
        file: "src/config/colors.ts",
        line: "24-27",
        find: '    800: { light: "#EDEDF2", dark: "#1e2033" },\n    900: { light: "#FCFCFC", dark: "#121421" },\n    950: { light: "#EEEEF4", dark: "#090A14" },\n',
        replace: "DELETE",
        note: "slate-800 has the same values as fill.surfaceElevated, so it merges into it; slate-900 and slate-950 move to fill.surfaceBase and fill.background.",
      },
      {
        file: "src/config/colors.ts",
        line: "42",
        find: '    300: { light: "#FF9400", dark: "#ffe166" },',
        replace: '    strong: { light: "#FF9400", dark: "#ffe166" },',
      },
      {
        file: "src/config/colors.ts",
        line: "44",
        find: '    900: { light: "#FFF9D0", dark: "#2E2D29" },\n    backgroundOpacity: { light: "#FF94001F", dark: "#FFE1661F" },',
        replace:
          '    background: { light: "#FFF9D0", dark: "#2E2D29" },\n    backgroundOpacity: { light: "#FF94001F", dark: "#FFE1661F" },',
      },
      {
        file: "src/config/colors.ts",
        line: "47-48",
        find: '    100: { light: "#EA2A46", dark: "#F9A4A5" },\n',
        replace: "DELETE",
        note: "Moves below red.strong as red.secondary, the order of the semantic colors.",
      },
      {
        file: "src/config/colors.ts",
        line: "49",
        find: '    500: { light: "#EA2A46", dark: "#FF506A" },',
        replace:
          '    strong: { light: "#EA2A46", dark: "#FF506A" },\n    secondary: { light: "#EA2A46", dark: "#F9A4A5" },',
      },
      {
        file: "src/config/colors.ts",
        line: "51",
        find: '    900: { light: "#F9E2E5", dark: "#2D192D" },',
        replace: '    background: { light: "#F9E2E5", dark: "#2D192D" },',
      },
      {
        file: "src/config/colors.ts",
        line: "54-55",
        find: '    100: { light: "#109375", dark: "#A4F9D8" },\n',
        replace: "DELETE",
        note: "Moves below green.strong as green.secondary, the order of the semantic colors.",
      },
      {
        file: "src/config/colors.ts",
        line: "57",
        find: '    500: { light: "#109375", dark: "#0FDE8D" },',
        replace:
          '    strong: { light: "#109375", dark: "#0FDE8D" },\n    secondary: { light: "#109375", dark: "#A4F9D8" },',
      },
      {
        file: "src/config/colors.ts",
        line: "61",
        find: '    900: { light: "#DFEFEB", dark: "#192E38" },',
        replace: '    background: { light: "#DFEFEB", dark: "#192E38" },',
      },
      {
        file: "src/config/colors.ts",
        line: "63-64",
        find: '  white: { light: "#ffffff", dark: "#ffffff" },\n',
        replace: "DELETE",
      },
      {
        file: "src/config/colors.ts",
        line: "66-70",
        find: '    secondary: { light: "#E0E0EB", dark: "#23263b" },\n    secondaryHover: { light: "#dadce8", dark: "#282d46" },\n    primaryDisabled: { light: "#E0E0EB", dark: "#1E2033" },\n    secondaryDisabled: { light: "#E0E0EB", dark: "#1e2033" },\n    primaryHover: { light: "#293ce4", dark: "#2a3de5" },\n    primaryActive: { light: "#2536cd", dark: "#2536cd" },',
        replace:
          '    primary: { light: "#2d42fc", dark: "#2d42fc" },\n    primaryHover: { light: "#293ce4", dark: "#2a3de5" },\n    primaryActive: { light: "#2536cd", dark: "#2536cd" },\n    secondary: { light: "#E0E0EB", dark: "#23263b" },\n    secondaryHover: { light: "#dadce8", dark: "#282d46" },\n    primaryDisabled: { light: "#E0E0EB", dark: "#1E2033" },\n    secondaryDisabled: { light: "#E0E0EB", dark: "#1e2033" },\n    background: { light: "#DADAE7", dark: "#22243a" },',
        note: "In the order of the semantic colors, with primary (from blue-600) and background (from slate-700).",
      },
      {
        file: "src/config/colors.ts",
        line: "73-74",
        find: '    surfaceElevated50: { light: "#EDEDF280", dark: "#1E203380" },\n    surfaceElevated: { light: "#EDEDF2", dark: "#1E2033" },',
        replace:
          '    background: { light: "#EEEEF4", dark: "#090A14" },\n    surfaceBase: { light: "#FCFCFC", dark: "#121421" },\n    surfaceBase88: { light: "#FCFCFCE0", dark: "#121421E0" },\n    surfaceElevated: { light: "#EDEDF2", dark: "#1E2033" },\n    surfaceElevated50: { light: "#EDEDF280", dark: "#1E203380" },',
        note: "In the order of the semantic colors, with background, surfaceBase and surfaceBase88 from slate-950, slate-900 and fill-card.",
      },
      {
        file: "src/config/colors.ts",
        line: "78-79",
        find: '    card: { light: "#FCFCFCE0", dark: "#121421E0" },\n',
        replace: "DELETE",
      },
      {
        file: "src/config/colors.ts",
        line: "80",
        find: "  typography: {",
        replace: "  textIcon: {",
      },
      {
        file: "src/config/colors.ts",
        line: "83",
        find: '    inactive: { light: "#C4C4D5", dark: "#3E4361" },',
        replace:
          '    disabled: { light: "#9FA3BC", dark: "#646a8f" },\n    inactive: { light: "#C4C4D5", dark: "#3E4361" },\n    onButton: { light: "#ffffff", dark: "#ffffff" },',
        note: "disabled comes from slate-500 (with its step 1 value) and onButton from white.",
      },
      {
        file: "tailwind.config.ts",
        line: "36",
        find: 'const PRIMARY_TEXT_COLOR_NAMES = ["white", "black", "typography-primary"];',
        replace: 'const PRIMARY_TEXT_COLOR_NAMES = ["textIcon-onButton", "black", "textIcon-primary"];',
      },
      {
        file: "tailwind.config.ts",
        line: "39",
        find: '  return PRIMARY_TEXT_COLOR_NAMES.includes(textColorName) ? "var(--color-typography-secondary)" : "currentColor";',
        replace:
          '  return PRIMARY_TEXT_COLOR_NAMES.includes(textColorName) ? "var(--color-textIcon-secondary)" : "currentColor";',
      },
      {
        file: "tailwind.config.ts",
        line: "45",
        find: '      color: "var(--affix-color, var(--color-typography-secondary))",',
        replace: '      color: "var(--affix-color, var(--color-textIcon-secondary))",',
      },
      {
        file: "tailwind.config.ts",
        line: "85",
        find: '      background: "var(--color-slate-800)",',
        replace: '      background: "var(--color-fill-surfaceElevated)",',
      },
      {
        file: "tailwind.config.ts",
        line: "87-88",
        find: '    ".text-input-bg::placeholder": {\n      color: "var(--color-slate-100)",',
        replace: '    ".text-input-bg::placeholder": {\n      color: "var(--color-textIcon-secondary)",',
      },
      {
        file: "tailwind.config.ts",
        line: "176-177",
        find: '      color: "var(--color-slate-100)",\n      textTransform: "uppercase",',
        replace: '      color: "var(--color-textIcon-secondary)",\n      textTransform: "uppercase",',
      },
      {
        file: "tailwind.config.ts",
        line: "181-183",
        find: '      color: "var(--color-slate-100)",\n      "& a": {\n        color: "var(--color-slate-100)",',
        replace:
          '      color: "var(--color-textIcon-secondary)",\n      "& a": {\n        color: "var(--color-textIcon-secondary)",',
      },
      {
        file: "src/components/DepthChart/DepthChart.tsx",
        line: "121-122",
        find: "    const redColor = colors.red[500][theme.theme];\n    const greenColor = colors.green[500][theme.theme];",
        replace:
          "    const redColor = colors.red.strong[theme.theme];\n    const greenColor = colors.green.strong[theme.theme];",
      },
      {
        file: "src/components/TVChartContainer/TVChartContainer.tsx",
        line: "792",
        find: '          direction === "up" ? colors.green[500][theme] : direction === "down" ? colors.red[500][theme] : neutralColor;',
        replace:
          '          direction === "up"\n            ? colors.green.strong[theme]\n            : direction === "down"\n              ? colors.red.strong[theme]\n              : neutralColor;',
      },
      {
        file: "src/components/TVChartContainer/chartThemeOverrides.spec.ts",
        line: "128",
        find: "    const savedValues = readSavedChartValues(makeSavedState({ priceLineColor: colors.green[500].dark }), darkKeys);",
        replace:
          "    const savedValues = readSavedChartValues(makeSavedState({ priceLineColor: colors.green.strong.dark }), darkKeys);",
      },
      {
        file: "src/components/TVChartContainer/chartThemeOverrides.spec.ts",
        line: "155",
        find: "    expect(isAppChartValue(PRICE_LINE_COLOR_KEY, colors.red[500].light)).toBe(true);",
        replace: "    expect(isAppChartValue(PRICE_LINE_COLOR_KEY, colors.red.strong.light)).toBe(true);",
      },
      {
        file: "src/components/TVChartContainer/chartThemeOverrides.ts",
        line: "12-15",
        find: "  colors.green[500].dark,\n  colors.green[500].light,\n  colors.red[500].dark,\n  colors.red[500].light,",
        replace:
          "  colors.green.strong.dark,\n  colors.green.strong.light,\n  colors.red.strong.dark,\n  colors.red.strong.light,",
      },
      {
        file: "src/components/TVChartContainer/constants.ts",
        line: "42",
        find: '  "scalesProperties.textColor": colors.typography["secondary"].dark,',
        replace: '  "scalesProperties.textColor": colors.textIcon["secondary"].dark,',
      },
      {
        file: "src/components/TVChartContainer/constants.ts",
        line: "44",
        find: "  ...createChartStyleOverrides(colors.green[500].dark, colors.red[500].dark),",
        replace: "  ...createChartStyleOverrides(colors.green.strong.dark, colors.red.strong.dark),",
      },
      {
        file: "src/components/TVChartContainer/constants.ts",
        line: "59",
        find: '  "scalesProperties.textColor": colors.typography["secondary"].light,',
        replace: '  "scalesProperties.textColor": colors.textIcon["secondary"].light,',
      },
      {
        file: "src/components/TVChartContainer/constants.ts",
        line: "61",
        find: "  ...createChartStyleOverrides(colors.green[500].light, colors.red[500].light),",
        replace: "  ...createChartStyleOverrides(colors.green.strong.light, colors.red.strong.light),",
      },
      {
        file: "src/lib/wallets/WalletProvider.tsx",
        line: "47",
        find: "        accentColor: colors.blue[600][theme] as `#${string}`,",
        replace: "        accentColor: colors.button.primary[theme] as `#${string}`,",
      },
      {
        file: "src/App/App.scss",
        line: "136-139",
        find: ".App-card-divider-vertical {\n  width: 0.5px;\n  height: 8.8rem;\n  background: var(--color-slate-600);",
        replace:
          ".App-card-divider-vertical {\n  width: 0.5px;\n  height: 8.8rem;\n  background: var(--color-stroke-primary);",
        note: "Divider line drawn as a fill: stroke-primary, not the script's fill-accent; in light it changes from #D4D4E2 to #CCCCE0.",
      },
      {
        file: "src/App/App.scss",
        line: "194-196",
        find: ".App-card-divider {\n  height: 0.5px;\n  background: var(--color-slate-600);",
        replace: ".App-card-divider {\n  height: 0.5px;\n  background: var(--color-stroke-primary);",
      },
      {
        file: "src/components/Card/Card.css",
        line: "18-20",
        find: ".card-divider {\n  height: 0.5px;\n  background: var(--color-slate-600);",
        replace: ".card-divider {\n  height: 0.5px;\n  background: var(--color-stroke-primary);",
        note: "Divider line drawn as a fill: stroke-primary, not the script's fill-accent; in light it changes from #D4D4E2 to #CCCCE0.",
      },
      {
        file: "src/components/Tooltip/Tooltip.scss",
        line: "127-129",
        find: ".Tooltip-divider {\n  height: 1px;\n  background-color: var(--color-slate-600);",
        replace: ".Tooltip-divider {\n  height: 1px;\n  background-color: var(--color-stroke-primary);",
        note: "Divider line drawn as a fill: stroke-primary, not the script's fill-accent; in light it changes from #D4D4E2 to #CCCCE0.",
      },
      {
        file: "src/components/AddressDropdown/AddressDropdownWithMultichain.tsx",
        line: "97",
        find: '<div className="h-20 w-1 shrink-0 bg-slate-600" />',
        replace: '<div className="h-20 w-1 shrink-0 bg-stroke-primary" />',
        note: "Divider line drawn as a fill: stroke-primary, not the script's fill-accent; in light it changes from #D4D4E2 to #CCCCE0.",
      },
      {
        file: "src/components/OrderEditor/OrderEditor.tsx",
        line: "1223",
        find: '<div className="h-1 bg-slate-600" />',
        replace: '<div className="h-1 bg-stroke-primary" />',
        note: "Divider line drawn as a fill: stroke-primary, not the script's fill-accent; in light it changes from #D4D4E2 to #CCCCE0.",
      },
      {
        file: "src/components/TradeBox/TradeBoxHeaderTabs.tsx",
        line: "145-147",
        find: "`last:relative last:after:absolute last:after:left-0 last:after:top-[calc(50%+1px)]\n                last:after:block last:after:h-20 last:after:w-2 last:after:-translate-y-1/2 last:after:rounded-full\n                last:after:bg-slate-600 last:after:content-[''] max-md:last:after:h-16`",
        replace:
          "`last:relative last:after:absolute last:after:left-0 last:after:top-[calc(50%+1px)]\n                last:after:block last:after:h-20 last:after:w-2 last:after:-translate-y-1/2 last:after:rounded-full\n                last:after:bg-stroke-primary last:after:content-[''] max-md:last:after:h-16`",
        note: "The Long/Short tab separator is a line drawn as a fill: stroke-primary, not the script's fill-accent; in light it changes from #D4D4E2 to #CCCCE0.",
      },
      {
        file: "src/pages/AccountDashboard/GeneralPerformanceDetails.tsx",
        line: "250-252",
        find: '<div className="my-12 h-[0.5px] bg-slate-600" />\n\n      <div className="mb-10 font-medium text-typography-primary">',
        replace:
          '<div className="my-12 h-[0.5px] bg-stroke-primary" />\n\n      <div className="mb-10 font-medium text-typography-primary">',
        note: "Divider line drawn as a fill: stroke-primary, not the script's fill-accent; in light it changes from #D4D4E2 to #CCCCE0.",
      },
      {
        file: "src/pages/AccountDashboard/GeneralPerformanceDetails.tsx",
        line: "280-281",
        find: '<div className="my-12 h-[0.5px] bg-slate-600" />\n      <PnlBreakdownTooltipContent row={row} />',
        replace:
          '<div className="my-12 h-[0.5px] bg-stroke-primary" />\n      <PnlBreakdownTooltipContent row={row} />',
      },
      {
        file: "src/components/MarketStats/MarketGraphs.tsx",
        line: "374",
        find: '<CartesianGrid vertical={false} strokeDasharray="5 3" strokeWidth={0.5} stroke="var(--color-slate-600)" />',
        replace:
          '<CartesianGrid\n            vertical={false}\n            strokeDasharray="5 3"\n            strokeWidth={0.5}\n            stroke="var(--color-stroke-primary)"\n          />',
        note: "Chart grid line: stroke-primary (in light #D4D4E2 becomes #CCCCE0), split over lines as prettier does.",
      },
      {
        file: "src/components/NetRateChart/NetRateChart.tsx",
        line: "404",
        find: '<CartesianGrid vertical={false} strokeDasharray="5 3" strokeWidth={0.5} stroke="var(--color-slate-600)" />',
        replace:
          '<CartesianGrid\n                vertical={false}\n                strokeDasharray="5 3"\n                strokeWidth={0.5}\n                stroke="var(--color-stroke-primary)"\n              />',
        note: "Chart grid line: stroke-primary (in light #D4D4E2 becomes #CCCCE0), split over lines as prettier does.",
      },
      {
        file: "src/pages/AccountDashboard/DailyAndCumulativePnLChart.tsx",
        line: "635",
        find: '<CartesianGrid vertical={false} strokeDasharray="5 3" strokeWidth={0.5} stroke="var(--color-slate-600)" />',
        replace:
          '<CartesianGrid\n              vertical={false}\n              strokeDasharray="5 3"\n              strokeWidth={0.5}\n              stroke="var(--color-stroke-primary)"\n            />',
        note: "Chart grid line: stroke-primary (in light #D4D4E2 becomes #CCCCE0), split over lines as prettier does.",
      },
      {
        file: "src/components/TradeBox/TradeBox.tsx",
        line: "1048",
        find: '"hover:bg-[var(--color-fill-surfaceHover)] hover:bg-[linear-gradient(0deg,var(--color-slate-600),var(--color-slate-600))] hover:bg-blend-overlay"',
        replace:
          '"hover:bg-[var(--color-fill-surfaceHover)] hover:bg-[linear-gradient(0deg,var(--color-fill-accent),var(--color-fill-accent))] hover:bg-blend-overlay"',
      },
      {
        file: "src/components/AnimatedGradientText/AnimatedGradientText.scss",
        line: "9-13",
        find: "background: linear-gradient(\n    var(--animated-gradient-text-angle),\n    var(--color-blue-100) 0%,\n    var(--color-blue-400) 100%\n  );",
        replace:
          "background: linear-gradient(\n    var(--animated-gradient-text-angle),\n    var(--color-blue-100) 0%,\n    var(--color-blue-strong) 100%\n  );",
        note: "The gradient stop goes with the text: in dark it changes from #2D42FC to #7885FF.",
      },
      {
        file: "src/components/ShimmerText/ShimmerText.scss",
        line: "8",
        find: "$gray: rgba(var(--color-typography-primary-raw) / 0.75);",
        replace: "$gray: rgba(var(--color-textIcon-primary-raw) / 0.75);",
      },
      {
        file: "src/img/long.svg",
        line: "2",
        find: '<path d="M1 9L9 1M9 1H3M9 1V7" stroke="var(--color-green-500)" stroke-linecap="round"/>',
        replace: '<path d="M1 9L9 1M9 1H3M9 1V7" stroke="var(--color-green-strong)" stroke-linecap="round"/>',
      },
      {
        file: "src/img/short.svg",
        line: "2",
        find: '<path d="M1 1L9 9M9 9L9 3M9 9L3 9" stroke="var(--color-red-500)" stroke-linecap="round"/>',
        replace: '<path d="M1 1L9 9M9 9L9 3M9 9L3 9" stroke="var(--color-red-strong)" stroke-linecap="round"/>',
      },
      {
        file: "src/components/TableScrollFade/TableScrollFade.tsx",
        line: "201-207",
        find: 'type ScrollFadeGradientColor = "slate-800" | "slate-900" | "slate-950";\n\nconst GRADIENT_TO_CLASS: Record<ScrollFadeGradientColor, string> = {\n  "slate-800": "to-slate-800",\n  "slate-900": "to-slate-900",\n  "slate-950": "to-slate-950",\n};',
        replace:
          'type ScrollFadeGradientColor = "fill-surfaceElevated" | "fill-surfaceBase" | "fill-background";\n\nconst GRADIENT_TO_CLASS: Record<ScrollFadeGradientColor, string> = {\n  "fill-surfaceElevated": "to-slate-800",\n  "fill-surfaceBase": "to-slate-900",\n  "fill-background": "to-slate-950",\n};',
      },
      {
        file: "src/components/TableScrollFade/TableScrollFade.tsx",
        line: "216",
        find: 'gradientColor = "slate-900",',
        replace: 'gradientColor = "fill-surfaceBase",',
      },
      {
        file: "src/components/TableScrollFade/TableScrollFade.tsx",
        line: "225",
        find: '* @default "slate-900"',
        replace: '* @default "fill-surfaceBase"',
      },
      {
        file: "src/components/TableScrollFade/TableScrollFade.tsx",
        line: "320",
        find: '<ScrollFadeControls {...scrollFade} gradientColor="slate-900" />',
        replace: '<ScrollFadeControls {...scrollFade} gradientColor="fill-surfaceBase" />',
      },
      {
        file: "src/pages/Announcements/Announcements.tsx",
        line: "372",
        find: '<ButtonRowScrollFadeContainer className="min-w-0 grow max-lg:basis-full" gradientColor="slate-950">',
        replace:
          '<ButtonRowScrollFadeContainer className="min-w-0 grow max-lg:basis-full" gradientColor="fill-background">',
      },
      {
        file: "autotests/regression/connected-state/tpsl.spec.ts",
        line: "136",
        find: "await expect(box(sl)).not.toHaveClass(/border-(yellow-300|red-500)/);",
        replace: "await expect(box(sl)).not.toHaveClass(/border-(yellow-strong|red-strong)/);",
      },
      {
        file: "autotests/regression/connected-state/tpsl.spec.ts",
        line: "157",
        find: "await expect(box(tp)).not.toHaveClass(/border-(yellow-300|red-500)/);",
        replace: "await expect(box(tp)).not.toHaveClass(/border-(yellow-strong|red-strong)/);",
      },
      {
        file: "src/pages/UiPage/NumericAffixes.tsx",
        line: "48",
        find: 'title: "Positive (green-500)",',
        replace: 'title: "Positive (green-strong)",',
        note: "Labels on the internal /ui test page name the classes the script renames, so they follow; text only.",
      },
      {
        file: "src/pages/UiPage/NumericAffixes.tsx",
        line: "57",
        find: 'title: "Negative (red-500)",',
        replace: 'title: "Negative (red-strong)",',
      },
      {
        file: "src/pages/UiPage/NumericAffixes.tsx",
        line: "66",
        find: 'title: "Incomplete (yellow-300)",',
        replace: 'title: "Incomplete (yellow-strong)",',
      },
      {
        file: "src/pages/UiPage/NumericAffixes.tsx",
        line: "77",
        find: 'title: "Hover / active (blue-300)",',
        replace: 'title: "Hover / active (blue-strong)",',
      },
      {
        file: "src/pages/UiPage/NumericAffixes.tsx",
        line: "83",
        find: 'title: "Muted (typography-secondary)",',
        replace: 'title: "Muted (textIcon-secondary)",',
      },
      {
        file: "src/pages/UiPage/UiPage.tsx",
        line: "134",
        find: "Yellow 300",
        replace: "Yellow strong",
        note: "Labels on the internal /ui test page name the classes the script renames, so they follow; text only.",
      },
      {
        file: "src/pages/UiPage/UiPage.tsx",
        line: "135",
        find: "Red 500",
        replace: "Red strong",
      },
      {
        file: "src/pages/UiPage/UiPage.tsx",
        line: "136",
        find: "Green 500",
        replace: "Green strong",
      },
      {
        file: "src/pages/UiPage/UiPage.tsx",
        line: "137",
        find: "Typography primary",
        replace: "TextIcon primary",
      },
      {
        file: "src/pages/UiPage/UiPage.tsx",
        line: "138",
        find: "Typography secondary",
        replace: "TextIcon secondary",
      },
      {
        file: "src/components/Pagination/Pagination.css",
        line: "17-34",
        find: ".pagination-btn {\n  text-decoration: none;\n  display: flex;\n  align-items: center;\n  background: transparent;\n  padding: 1rem 1.5rem;\n  color: var(--color-typography-primary);\n  font-size: 1.2rem;\n  cursor: pointer;\n  border: none;\n  justify-content: center;\n  left: 1px solid var(--dark-blue-border);\n  border-bottom: 2px solid transparent;\n  user-select: none;\n  width: 4rem;\n}\n\n",
        replace: "DELETE",
      },
      {
        file: "src/components/Pagination/Pagination.css",
        line: "44-48",
        find: ".pagination-btn:hover {\n  border-color: var(--color-gray-800);\n}\n\n",
        replace: "DELETE",
        note: "This gray-800 border (step 4) goes here with the other .pagination-btn rules.",
      },
      {
        file: "src/components/Pagination/Pagination.css",
        line: "48-52",
        find: ".pagination-btn.active {\n  border-color: var(--color-typography-primary);\n}\n\n",
        replace: "DELETE",
      },
      {
        file: "src/components/Pagination/Pagination.css",
        line: "53-58",
        find: "  .pagination-button-secondary,\n  .pagination-btn {\n    font-size: 1rem !important;\n  }\n\n",
        replace: "DELETE",
        note: "The whole rule goes: .pagination-button-secondary is unused too, and Typography step 9 lists this rule.",
      },
      {
        file: "src/components/Pagination/Pagination.css",
        line: "65-69",
        find: "\n  .pagination-btn {\n    padding: 1rem 1.25rem;\n  }\n",
        replace: "DELETE",
      },
      {
        file: "src/styles/Shared.scss",
        line: "111-113",
        find: "  --primary-btn-hover: var(--color-blue-400);\n  --primary-btn-active: color-mix(in srgb, var(--color-blue-300), var(--color-blue-400) 90%);\n",
        replace: "DELETE",
        note: "Until Typography step 9 deletes the unused .default-btn, its :hover and :active rules still name them.",
      },
    ],
    verify: [
      "yarn tscheck",
      "yarn lint",
      "git grep -nE '(^|[^A-Za-z0-9_-])(bg|text|border(-[trblxy])?|divide|ring|outline|fill|stroke|from|via|to|decoration|placeholder|--color)-(slate-(950|900|800|700|600|500|100)|typography-(primary|secondary|inactive)|white|blue-(600|400|300|100)|cold-blue-900|(green|red)-(500|100|900)|yellow-(300|900)|fill-card)([^A-Za-z0-9_-]|$)' -- src autotests index.html ':!src/pages/DesignSystem' ':!src/config/colors.ts' returns nothing",
    ],
    visible:
      "Light theme: borders and dividers #CCCCE0 instead of #D4D4E2. Dark theme: blue text that used blue-400 is #7885FF instead of #2D42FC. Everything else keeps its color.",
    scripts: [
      {
        title: "Rename the tokens in classes and --color-* variables, by how each color is used",
        file: "colors-step-3.mjs",
        run: "node colors-step-3.mjs | xargs npx prettier --write",
        code: 'const STEPS = [\n[\n  {\n    "color": "slate-950",\n    "to": "fill-background"\n  },\n  {\n    "color": "slate-900",\n    "to": "fill-surfaceBase"\n  },\n  {\n    "color": "fill-card",\n    "to": "fill-surfaceBase88"\n  },\n  {\n    "color": "slate-800",\n    "to": "fill-surfaceElevated"\n  },\n  {\n    "color": "typography-inactive",\n    "to": "textIcon-inactive"\n  },\n  {\n    "color": "slate-600",\n    "to": {\n      "fill": "fill-accent",\n      "stroke": "stroke-primary",\n      "text": "textIcon-inactive"\n    }\n  },\n  {\n    "color": "blue-600",\n    "to": "button-primary"\n  },\n  {\n    "color": "blue-300",\n    "to": "blue-strong"\n  },\n  {\n    "color": "blue-400",\n    "to": {\n      "fill": "button-primary",\n      "stroke": "button-primary",\n      "text": "blue-strong"\n    }\n  },\n  {\n    "color": "slate-700",\n    "to": "button-background"\n  },\n  {\n    "color": "typography-primary",\n    "to": "textIcon-primary"\n  },\n  {\n    "color": "typography-secondary",\n    "to": "textIcon-secondary"\n  },\n  {\n    "color": "slate-100",\n    "to": "textIcon-secondary"\n  },\n  {\n    "color": "slate-500",\n    "to": "textIcon-disabled"\n  },\n  {\n    "color": "white",\n    "to": "textIcon-onButton"\n  },\n  {\n    "color": "blue-100",\n    "to": "blue-secondary"\n  },\n  {\n    "color": "cold-blue-900",\n    "to": "blue-background"\n  },\n  {\n    "color": "green-500",\n    "to": "green-strong"\n  },\n  {\n    "color": "green-100",\n    "to": "green-secondary"\n  },\n  {\n    "color": "green-900",\n    "to": "green-background"\n  },\n  {\n    "color": "red-500",\n    "to": "red-strong"\n  },\n  {\n    "color": "red-100",\n    "to": "red-secondary"\n  },\n  {\n    "color": "red-900",\n    "to": "red-background"\n  },\n  {\n    "color": "yellow-300",\n    "to": "yellow-strong"\n  },\n  {\n    "color": "yellow-900",\n    "to": "yellow-background"\n  }\n],\n];\n// Renames design-system names in the app (src, autotests, index.html), in text from stdin (--text), in a JSON list of\n// { file, text } (--json), or in the Find and Replace blocks of a changelog\'s Markdown (--markdown).\n// STEPS (set above this code) run in order. Each rule: { color, to } renames <prefix>-<color> classes and\n// --color-<color> variables, where "to" is one name or { fill, stroke, text, default } by how the color is used;\n// { cls, to } renames a class, { cssVar, to } a variable, { literal, to } an exact text. A step\'s rules apply in one pass.\nimport fs from "node:fs";\nimport path from "node:path";\n\nconst SCOPE = ["src", "autotests", "index.html"];\nconst SKIP = ["node_modules", "src/locales", "src/pages/DesignSystem", "src/config/colors.ts"];\nconst EXT = /\\.(tsx|ts|jsx|js|scss|css|html)$/;\nconst PREFIX_KIND = {\n  bg: "fill", from: "fill", via: "fill", to: "fill", fill: "fill", accent: "fill",\n  border: "stroke", "border-t": "stroke", "border-r": "stroke", "border-b": "stroke", "border-l": "stroke",\n  "border-x": "stroke", "border-y": "stroke", "border-s": "stroke", "border-e": "stroke", divide: "stroke",\n  ring: "stroke", "ring-offset": "stroke", outline: "stroke", stroke: "stroke", decoration: "stroke", shadow: "stroke",\n  text: "text", placeholder: "text", caret: "text",\n};\nconst PROPERTY_KIND = [\n  [/^(background|background-color|backgroundColor|background-image|fill|stop-color|stopColor)$/, "fill"],\n  [/^(border|border-[\\w-]+|border[A-Z]\\w*|outline|outline-color|outlineColor|box-shadow|boxShadow|stroke|text-decoration-color|column-rule-color|scrollbar-color)$/, "stroke"],\n  [/^(color|caret-color|caretColor|-webkit-text-fill-color)$/, "text"],\n];\nconst esc = (s) => s.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&");\nconst alt = (keys) => [...keys].sort((a, b) => b.length - a.length).map(esc).join("|");\nconst pick = (to, kind) => (typeof to === "string" ? to : (to[kind] ?? to.default));\nconst inScope = (file) =>\n  SCOPE.some((d) => file === d || file.startsWith(`${d}/`)) && !SKIP.some((s) => file === s || file.startsWith(`${s}/`));\n\nfunction propertyKind(before) {\n  const match = /([A-Za-z-]+)\\s*:\\s*[^;:{}]*$/.exec(before);\n  const found = match && PROPERTY_KIND.find(([rx]) => rx.test(match[1]));\n  return found ? found[1] : "default";\n}\n\nconst counts = new Map();\nconst unresolved = [];\nconst count = (key) => counts.set(key, (counts.get(key) ?? 0) + 1);\n\nfunction makeRenamer(rules) {\n  const classMap = new Map();\n  const varMap = new Map();\n  const literalMap = new Map();\n  for (const rule of rules) {\n    if (rule.color) {\n      for (const prefix of Object.keys(PREFIX_KIND)) {\n        const name = pick(rule.to, PREFIX_KIND[prefix]);\n        classMap.set(`${prefix}-${rule.color}`, name ? `${prefix}-${name}` : null);\n      }\n      varMap.set(`--color-${rule.color}`, rule.to);\n    } else if (rule.cls) classMap.set(rule.cls, rule.to);\n    else if (rule.cssVar) varMap.set(rule.cssVar, rule.to);\n    else if (rule.literal) literalMap.set(rule.literal, rule.to);\n  }\n  const classRx = classMap.size && new RegExp(`(?<![\\\\w\\\\-\\\\[])(${alt(classMap.keys())})(?![\\\\w\\\\-.])`, "g");\n  const varRx = varMap.size && new RegExp(`(?<![\\\\w-])(${alt(varMap.keys())})(?![\\\\w-])`, "g");\n  const literalRx = literalMap.size && new RegExp(`(${alt(literalMap.keys())})`, "g");\n  const renameLine = (line, where) => {\n    let out = line;\n    if (literalRx) out = out.replace(literalRx, (m) => (count(m), literalMap.get(m)));\n    if (classRx) {\n      out = out.replace(classRx, (m) => {\n        const to = classMap.get(m);\n        if (to == null) return unresolved.push(`${where}: ${m}`), m;\n        return count(m), to;\n      });\n    }\n    if (varRx) {\n      out = out.replace(varRx, (m, _g, offset, whole) => {\n        const to = varMap.get(m);\n        const name = typeof to === "string" ? to : pick(to, propertyKind(whole.slice(0, offset)));\n        if (!name) return unresolved.push(`${where}: ${m}`), m;\n        return count(m), m.startsWith("--color-") ? `--color-${name}` : name;\n      });\n    }\n    return out;\n  };\n  return (text, file) =>\n    text\n      .split("\\n")\n      .map((line, i) => renameLine(line, `${file}:${i + 1}`))\n      .join("\\n");\n}\n\nconst renamers = STEPS.map(makeRenamer);\nconst renameAll = (text, file) => renamers.reduce((out, rename) => rename(out, file), text);\nconst mode = process.argv[2];\nconst stdin = () => fs.readFileSync(0, "utf8");\n\nif (mode === "--text") {\n  process.stdout.write(renameAll(stdin(), "stdin"));\n} else if (mode === "--json") {\n  const items = JSON.parse(stdin());\n  process.stdout.write(JSON.stringify(items.map(({ file, text }) => (inScope(file) ? renameAll(text, file) : text))));\n} else if (mode === "--markdown") {\n  // Edits in the copied Markdown look like "3. src/x.tsx:12 (note)" followed by fenced Find / Replace blocks\n  let file = null;\n  let fence = null;\n  const out = [];\n  for (const line of stdin().split("\\n")) {\n    const heading = /^\\d+\\. (\\S+?)(?::[\\d-]+)?(?: \\(|$)/.exec(line);\n    if (!fence && heading) file = heading[1];\n    if (line.startsWith("```")) {\n      if (fence) {\n        out.push(file && inScope(file) ? renameAll(fence.join("\\n"), file) : fence.join("\\n"), line);\n        fence = null;\n      } else {\n        out.push(line);\n        fence = [];\n      }\n      continue;\n    }\n    if (fence) fence.push(line);\n    else out.push(line);\n  }\n  process.stdout.write(out.join("\\n"));\n} else {\n  const files = [];\n  const walk = (p) => {\n    if (SKIP.some((s) => p === s || p.startsWith(`${s}/`)) || !fs.existsSync(p)) return;\n    if (fs.statSync(p).isDirectory()) fs.readdirSync(p).forEach((f) => walk(path.join(p, f)));\n    else if (EXT.test(p)) files.push(p);\n  };\n  SCOPE.forEach(walk);\n  const changed = [];\n  for (const file of files) {\n    const text = fs.readFileSync(file, "utf8");\n    const next = renameAll(text, file);\n    if (next !== text) {\n      fs.writeFileSync(file, next);\n      changed.push(file);\n    }\n  }\n  const total = [...counts.values()].reduce((a, b) => a + b, 0);\n  console.error(`Renamed ${total} names in ${changed.length} files.`);\n  if (unresolved.length) console.error(`Left for the edits (${unresolved.length}):\\n  ${unresolved.join("\\n  ")}`);\n  console.log(changed.join("\\n"));\n}\n',
        expect: "Renamed 2143 names in 384 files.",
      },
    ],
  },
  {
    id: "colors-swap-tokens",
    title: "4. Replace these tokens with semantic colors",
    goal: "19 colors that only the code has take the closest semantic color, or go with the unused styles that need them.",
    dependsOn: [],
    edits: [
      {
        file: "src/config/colors.ts",
        line: "8-9",
        find: '    500: { light: "#3d51ff", dark: "#3d51ff" },\n',
        replace: "DELETE",
      },
      {
        file: "src/config/colors.ts",
        line: "14-15",
        find: '    700: { light: "#282b54", dark: "#282b54" },\n',
        replace: "DELETE",
      },
      {
        file: "src/config/colors.ts",
        line: "29-35",
        find: '    50: { light: "rgba(0, 0, 0, 0.95)", dark: "rgba(255, 255, 255, 0.95)", type: "rgba" },\n    100: { light: "#333333", dark: "#e7e7e9" },\n    200: { light: "#555555", dark: "#cfcfd3" },\n    300: { light: "#777777", dark: "#b7b8bd" },\n    400: { light: "#999999", dark: "#9fa0a7" },\n    500: { light: "#BBBBBB", dark: "#878891" },\n',
        replace: "DELETE",
      },
      {
        file: "src/config/colors.ts",
        line: "36-39",
        find: '    700: { light: "#F0F0F0", dark: "#585866" },\n    800: { light: "rgba(0, 0, 0, 0.2)", dark: "rgba(255, 255, 255, 0.2)", type: "rgba" },\n    900: { light: "rgba(0, 0, 0, 0.1)", dark: "rgba(255, 255, 255, 0.1)", type: "rgba" },\n',
        replace: "DELETE",
      },
      {
        file: "src/config/colors.ts",
        line: "43-44",
        find: '    500: { light: "#f3b50c", dark: "#f3b50c" },\n',
        replace: "DELETE",
      },
      {
        file: "src/config/colors.ts",
        line: "48-49",
        find: '    400: { light: "#ff637a", dark: "#ff637a" },\n',
        replace: "DELETE",
      },
      {
        file: "src/config/colors.ts",
        line: "50-51",
        find: '    700: { light: "#B33055", dark: "#B33055" },\n',
        replace: "DELETE",
      },
      {
        file: "src/config/colors.ts",
        line: "55-57",
        find: '    300: { light: "#56dba8", dark: "#56dba8" },\n    400: { light: "#8CF3CB", dark: "#8CF3CB" },\n',
        replace: "DELETE",
      },
      {
        file: "src/config/colors.ts",
        line: "58-60",
        find: '    600: { light: "#DFEFEB", dark: "#1F3445" },\n    700: { light: "#0FDE8D", dark: "#0FDE8D" },\n',
        replace: "DELETE",
      },
      {
        file: "src/config/colors.ts",
        line: "75-76",
        find: '    surfaceElevatedHover: { light: "#EFEFEF", dark: "#18192a" },\n',
        replace: "DELETE",
      },
      {
        file: "src/components/StatsTooltip/ChainsStatsTooltipRow.tsx",
        line: "45",
        find: '<div className="my-5 h-1 bg-gray-800" />',
        replace: '<div className="my-5 h-1 bg-stroke-primary" />',
        note: "1px divider line: stroke-primary like the other dividers, not the script's fill-accent (light #CCCCE0).",
      },
      {
        file: "src/pages/Dashboard/GmxCard.tsx",
        line: "215",
        find: '<div className="!my-8 h-1 bg-gray-800" />',
        replace: '<div className="!my-8 h-1 bg-stroke-primary" />',
        note: "1px divider line in the staked GMX tooltip: stroke-primary like the other dividers, not the script's fill-accent (light #CCCCE0).",
      },
      {
        file: "src/pages/AccountDashboard/DailyAndCumulativePnLChart.tsx",
        line: "783",
        find: 'fill = "var(--color-gray-900)";',
        replace: 'fill = "var(--color-fill-accent)";',
        note: "The zero-PnL bar is one of gray-900's 2 fills, but the script finds no CSS property on this line and would give it stroke-primary.",
      },
      {
        file: "src/components/Errors/ErrorBoundary.tsx",
        line: "94",
        find: 'className="absolute z-[11000] size-8 rounded-full bg-red-700 hover:bg-red-strong"',
        replace: 'className="absolute z-[11000] size-8 rounded-full bg-red-strong"',
        note: "After the swap the hover class repeats bg-red-strong, so it goes: the debug button loses its hover.",
      },
      {
        file: "src/components/NetworkDropdown/NetworkDropdown.tsx",
        line: "269",
        find: 'className="mr-[2.5px] size-[5px] rounded-full bg-green-300 shadow-[0_0_0_2.5px_rgb(var(--color-green-300-raw)/0.2)]"',
        replace:
          'className="mr-[2.5px] size-[5px] rounded-full bg-green-strong shadow-[0_0_0_2.5px_rgb(var(--color-green-strong-raw)/0.2)]"',
        note: "The script never renames the -raw companion variables: without this the halo around the selected network's green dot would vanish when green-300 goes.",
      },
      {
        file: "src/components/NetworkDropdown/SolanaNetworkItem.tsx",
        line: "35",
        find: 'className="mr-[2.5px] size-[5px] rounded-full bg-green-300 shadow-[0_0_0_2.5px_rgb(var(--color-green-300-raw)/0.2)]"',
        replace:
          'className="mr-[2.5px] size-[5px] rounded-full bg-green-strong shadow-[0_0_0_2.5px_rgb(var(--color-green-strong-raw)/0.2)]"',
      },
      {
        file: "src/pages/UiPage/UiPage.tsx",
        line: "133",
        find: "Blue 500",
        replace: "Button primary",
        note: "Labels on the internal /ui test page name the classes the script renames, so they follow; text only.",
      },
      {
        file: "src/pages/UiPage/UiPage.tsx",
        line: "141",
        find: "Decoration is gray-400",
        replace: "Decoration is textIcon-secondary",
      },
      {
        file: "src/App/App.scss",
        line: "439-446",
        find: ".App-header .a.active,\n.App-header a.active {\n  pointer-events: none;\n  opacity: 1;\n  color: var(--color-gray-50);\n}\n\n",
        replace: "DELETE",
      },
      {
        file: "src/App/App.scss",
        line: "446-452",
        find: ".App-header .a:hover,\n.App-header a:hover {\n  opacity: 1;\n  color: var(--color-gray-50);\n}\n\n",
        replace: "DELETE",
      },
      {
        file: "src/components/NetworkDropdown/NetworkDropdown.scss",
        line: "96-100",
        find: ".menu-item:not(.disabled):hover .menu-item-label {\n  color: var(--color-gray-50);\n}\n\n",
        replace: "DELETE",
      },
      {
        file: "src/components/ColorfulBanner/ColorfulBanner.tsx",
        line: "10-16",
        find: '  green: {\n    border: "border-l-green-700",\n    bg: "bg-green-600",\n    icon: "text-green-600",\n    accent: "[--colorful-banner-accent-color:var(--color-green-600)]",\n  },\n',
        replace: "DELETE",
        note: 'ColorfulBanner and ColorfulButtonLink no longer accept color "green"; nothing passes it.',
      },
      {
        file: "src/styles/Shared.scss",
        line: "114-115",
        find: "  --dark-blue-border: var(--color-gray-800);\n",
        replace: "DELETE",
      },
      {
        file: "src/components/Tabs/Tabs.css",
        line: "28-33",
        find: ".Tab.Tab__block .Tab-option:not(.disabled):not(.active):hover {\n  color: var(--color-textIcon-primary);\n  background: var(--color-cold-blue-700);\n}\n\n",
        replace: "DELETE",
      },
      {
        file: "src/components/NetworkDropdown/NetworkDropdown.scss",
        line: "27-33",
        find: ".App-header-network:active {\n  background: var(--dark-blue-active);\n}\n.network-dropdown:active {\n  background: var(--dark-blue-active);\n}\n",
        replace: "DELETE",
      },
      {
        file: "src/styles/Shared.scss",
        line: "115-116",
        find: "  --dark-blue-active: var(--color-cold-blue-700);\n",
        replace: "DELETE",
      },
    ],
    verify: [
      "yarn tscheck",
      "yarn lint",
      "git grep -nE '(^|[^A-Za-z0-9_-])(bg|text|border(-[trblxy])?|divide|ring|outline|fill|stroke|from|via|to|decoration|placeholder|--color)-(gray-[0-9]+|green-(300|400|600|700)|red-(400|700)|blue-500|yellow-500|cold-blue-700|fill-surfaceElevatedHover)([^A-Za-z0-9_-]|$)' -- src autotests index.html ':!src/pages/DesignSystem' ':!src/config/colors.ts' returns nothing",
      "Update nothing in autotests by hand: the script renames the bg-blue-500 checks (settings.spec.ts, swapDetails.spec.ts) and the yellow-500 selectors (TradeBox.ct.spec.tsx).",
    ],
    visible:
      "Small shifts where a code-only gray or green moves to its semantic color (gray-400 #9FA0A7 to #A0A3C4); the TP/SL Cancel text and hover use red-strong; input hovers become a 10% tint.",
    scripts: [
      {
        title: "Swap the code-only colors to semantic colors, by how each color is used",
        file: "colors-step-4.mjs",
        run: "node colors-step-4.mjs | xargs npx prettier --write",
        code: 'const STEPS = [\n[\n  {\n    "color": "green-700",\n    "to": "green-strong"\n  },\n  {\n    "color": "red-400",\n    "to": "red-strong"\n  },\n  {\n    "color": "blue-500",\n    "to": "button-primary"\n  },\n  {\n    "color": "fill-surfaceElevatedHover",\n    "to": "fill-surfaceHover"\n  },\n  {\n    "color": "gray-100",\n    "to": "textIcon-primary"\n  },\n  {\n    "color": "gray-400",\n    "to": "textIcon-secondary"\n  },\n  {\n    "color": "green-300",\n    "to": "green-strong"\n  },\n  {\n    "color": "green-400",\n    "to": "green-secondary"\n  },\n  {\n    "color": "gray-300",\n    "to": "textIcon-secondary"\n  },\n  {\n    "color": "yellow-500",\n    "to": "yellow-strong"\n  },\n  {\n    "color": "gray-800",\n    "to": "fill-accent"\n  },\n  {\n    "color": "gray-900",\n    "to": {\n      "fill": "fill-accent",\n      "stroke": "stroke-primary",\n      "text": "stroke-primary",\n      "default": "stroke-primary"\n    }\n  },\n  {\n    "color": "gray-700",\n    "to": "stroke-primary"\n  },\n  {\n    "color": "gray-500",\n    "to": "textIcon-disabled"\n  },\n  {\n    "color": "gray-200",\n    "to": "textIcon-secondary"\n  },\n  {\n    "color": "red-700",\n    "to": "red-strong"\n  }\n],\n];\n// Renames design-system names in the app (src, autotests, index.html), in text from stdin (--text), in a JSON list of\n// { file, text } (--json), or in the Find and Replace blocks of a changelog\'s Markdown (--markdown).\n// STEPS (set above this code) run in order. Each rule: { color, to } renames <prefix>-<color> classes and\n// --color-<color> variables, where "to" is one name or { fill, stroke, text, default } by how the color is used;\n// { cls, to } renames a class, { cssVar, to } a variable, { literal, to } an exact text. A step\'s rules apply in one pass.\nimport fs from "node:fs";\nimport path from "node:path";\n\nconst SCOPE = ["src", "autotests", "index.html"];\nconst SKIP = ["node_modules", "src/locales", "src/pages/DesignSystem", "src/config/colors.ts"];\nconst EXT = /\\.(tsx|ts|jsx|js|scss|css|html)$/;\nconst PREFIX_KIND = {\n  bg: "fill", from: "fill", via: "fill", to: "fill", fill: "fill", accent: "fill",\n  border: "stroke", "border-t": "stroke", "border-r": "stroke", "border-b": "stroke", "border-l": "stroke",\n  "border-x": "stroke", "border-y": "stroke", "border-s": "stroke", "border-e": "stroke", divide: "stroke",\n  ring: "stroke", "ring-offset": "stroke", outline: "stroke", stroke: "stroke", decoration: "stroke", shadow: "stroke",\n  text: "text", placeholder: "text", caret: "text",\n};\nconst PROPERTY_KIND = [\n  [/^(background|background-color|backgroundColor|background-image|fill|stop-color|stopColor)$/, "fill"],\n  [/^(border|border-[\\w-]+|border[A-Z]\\w*|outline|outline-color|outlineColor|box-shadow|boxShadow|stroke|text-decoration-color|column-rule-color|scrollbar-color)$/, "stroke"],\n  [/^(color|caret-color|caretColor|-webkit-text-fill-color)$/, "text"],\n];\nconst esc = (s) => s.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&");\nconst alt = (keys) => [...keys].sort((a, b) => b.length - a.length).map(esc).join("|");\nconst pick = (to, kind) => (typeof to === "string" ? to : (to[kind] ?? to.default));\nconst inScope = (file) =>\n  SCOPE.some((d) => file === d || file.startsWith(`${d}/`)) && !SKIP.some((s) => file === s || file.startsWith(`${s}/`));\n\nfunction propertyKind(before) {\n  const match = /([A-Za-z-]+)\\s*:\\s*[^;:{}]*$/.exec(before);\n  const found = match && PROPERTY_KIND.find(([rx]) => rx.test(match[1]));\n  return found ? found[1] : "default";\n}\n\nconst counts = new Map();\nconst unresolved = [];\nconst count = (key) => counts.set(key, (counts.get(key) ?? 0) + 1);\n\nfunction makeRenamer(rules) {\n  const classMap = new Map();\n  const varMap = new Map();\n  const literalMap = new Map();\n  for (const rule of rules) {\n    if (rule.color) {\n      for (const prefix of Object.keys(PREFIX_KIND)) {\n        const name = pick(rule.to, PREFIX_KIND[prefix]);\n        classMap.set(`${prefix}-${rule.color}`, name ? `${prefix}-${name}` : null);\n      }\n      varMap.set(`--color-${rule.color}`, rule.to);\n    } else if (rule.cls) classMap.set(rule.cls, rule.to);\n    else if (rule.cssVar) varMap.set(rule.cssVar, rule.to);\n    else if (rule.literal) literalMap.set(rule.literal, rule.to);\n  }\n  const classRx = classMap.size && new RegExp(`(?<![\\\\w\\\\-\\\\[])(${alt(classMap.keys())})(?![\\\\w\\\\-.])`, "g");\n  const varRx = varMap.size && new RegExp(`(?<![\\\\w-])(${alt(varMap.keys())})(?![\\\\w-])`, "g");\n  const literalRx = literalMap.size && new RegExp(`(${alt(literalMap.keys())})`, "g");\n  const renameLine = (line, where) => {\n    let out = line;\n    if (literalRx) out = out.replace(literalRx, (m) => (count(m), literalMap.get(m)));\n    if (classRx) {\n      out = out.replace(classRx, (m) => {\n        const to = classMap.get(m);\n        if (to == null) return unresolved.push(`${where}: ${m}`), m;\n        return count(m), to;\n      });\n    }\n    if (varRx) {\n      out = out.replace(varRx, (m, _g, offset, whole) => {\n        const to = varMap.get(m);\n        const name = typeof to === "string" ? to : pick(to, propertyKind(whole.slice(0, offset)));\n        if (!name) return unresolved.push(`${where}: ${m}`), m;\n        return count(m), m.startsWith("--color-") ? `--color-${name}` : name;\n      });\n    }\n    return out;\n  };\n  return (text, file) =>\n    text\n      .split("\\n")\n      .map((line, i) => renameLine(line, `${file}:${i + 1}`))\n      .join("\\n");\n}\n\nconst renamers = STEPS.map(makeRenamer);\nconst renameAll = (text, file) => renamers.reduce((out, rename) => rename(out, file), text);\nconst mode = process.argv[2];\nconst stdin = () => fs.readFileSync(0, "utf8");\n\nif (mode === "--text") {\n  process.stdout.write(renameAll(stdin(), "stdin"));\n} else if (mode === "--json") {\n  const items = JSON.parse(stdin());\n  process.stdout.write(JSON.stringify(items.map(({ file, text }) => (inScope(file) ? renameAll(text, file) : text))));\n} else if (mode === "--markdown") {\n  // Edits in the copied Markdown look like "3. src/x.tsx:12 (note)" followed by fenced Find / Replace blocks\n  let file = null;\n  let fence = null;\n  const out = [];\n  for (const line of stdin().split("\\n")) {\n    const heading = /^\\d+\\. (\\S+?)(?::[\\d-]+)?(?: \\(|$)/.exec(line);\n    if (!fence && heading) file = heading[1];\n    if (line.startsWith("```")) {\n      if (fence) {\n        out.push(file && inScope(file) ? renameAll(fence.join("\\n"), file) : fence.join("\\n"), line);\n        fence = null;\n      } else {\n        out.push(line);\n        fence = [];\n      }\n      continue;\n    }\n    if (fence) fence.push(line);\n    else out.push(line);\n  }\n  process.stdout.write(out.join("\\n"));\n} else {\n  const files = [];\n  const walk = (p) => {\n    if (SKIP.some((s) => p === s || p.startsWith(`${s}/`)) || !fs.existsSync(p)) return;\n    if (fs.statSync(p).isDirectory()) fs.readdirSync(p).forEach((f) => walk(path.join(p, f)));\n    else if (EXT.test(p)) files.push(p);\n  };\n  SCOPE.forEach(walk);\n  const changed = [];\n  for (const file of files) {\n    const text = fs.readFileSync(file, "utf8");\n    const next = renameAll(text, file);\n    if (next !== text) {\n      fs.writeFileSync(file, next);\n      changed.push(file);\n    }\n  }\n  const total = [...counts.values()].reduce((a, b) => a + b, 0);\n  console.error(`Renamed ${total} names in ${changed.length} files.`);\n  if (unresolved.length) console.error(`Left for the edits (${unresolved.length}):\\n  ${unresolved.join("\\n  ")}`);\n  console.log(changed.join("\\n"));\n}\n',
        expect: "Renamed 137 names in 60 files.",
      },
    ],
  },
  {
    id: "colors-delete-unused",
    title: "5. Delete these unused tokens",
    goal: "slate-750, gray-600, gray-950 and green-800: nothing uses them.",
    dependsOn: [],
    edits: [
      {
        file: "src/config/colors.ts",
        line: "23-24",
        find: '    750: { light: "#D4D6E2", dark: "#17182c" },\n',
        replace: "DELETE",
      },
      {
        file: "src/config/colors.ts",
        line: "28-41",
        find: '  gray: {\n    600: { light: "#DDDDDD", dark: "#70707c" },\n    950: { light: "rgba(0, 0, 0, 0.05)", dark: "rgba(255, 255, 255, 0.05)", type: "rgba" },\n  },\n',
        replace: "DELETE",
      },
      {
        file: "src/config/colors.ts",
        line: "60-61",
        find: '    800: { light: "#178969", dark: "#178969" },\n',
        replace: "DELETE",
      },
    ],
    verify: ["yarn tscheck"],
    visible: "Nothing.",
  },
];
