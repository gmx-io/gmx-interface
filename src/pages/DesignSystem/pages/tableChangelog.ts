// The Table Changelog as data: exact edits for the product repo, step by step (rendered by DocsChangelog).
import type { ChangelogStep } from "../DocsChangelog";

// Rules for all steps
export const TABLE_CHANGELOG_NOTES: string[] = [
  "Scope: Table.tsx (TableTd, TableTdActionable), the two leaderboard tables, LeaderboardPage.scss, Tooltip.tsx and Tooltip.scss; nothing here is done at origin/release 0f9e06e991.",
  "Each edit: replace the find text with the replace text (DELETE removes it); line numbers are from origin/release, so after earlier steps match the find text.",
  "Do Typography step 1 with Table step 1: it makes text-body-medium 14px on a 20px line and text-caption 12px on a 16px line.",
  "Merge the Tooltip PR before Table step 3: the Tooltip.scss rule it deletes comes with that PR.",
];

export const TABLE_CHANGELOG_STEPS: ChangelogStep[] = [
  {
    id: "table-change-rows",
    title: "1. Rows at 44px",
    goal: "Every table gets 14px text with 12px above and below: one-line rows 44px, two-line rows 60px, the header 36px.",
    dependsOn: ["Typography step 1"],
    edits: [
      {
        file: "src/components/Table/Table.tsx",
        line: "84-87",
        find: 'className={cx("text-[13px] last-of-type:[&:not(:first-of-type)]:text-right", props.className, {\n        "px-4 py-8 first-of-type:pl-20 last-of-type:pr-20": padding === "all",\n        "px-4 py-8 first-of-type:pl-12 last-of-type:pr-12": padding === "compact",\n        "px-8 py-8": padding === "compact-one-column",',
        replace:
          'className={cx("text-body-medium last-of-type:[&:not(:first-of-type)]:text-right", props.className, {\n        "px-4 py-12 first-of-type:pl-20 last-of-type:pr-20": padding === "all",\n        "px-4 py-12 first-of-type:pl-12 last-of-type:pr-12": padding === "compact",\n        "px-8 py-12": padding === "compact-one-column",',
        note: "TableTd. The compact paddings get py-12 too, so every table has 44px rows. TableTh (lines 21-24) does not change.",
      },
      {
        file: "src/components/Table/Table.tsx",
        line: "66",
        find: '"relative select-none text-[13px] last-of-type:[&:not(:first-of-type)]:text-right",',
        replace: '"relative select-none text-body-medium last-of-type:[&:not(:first-of-type)]:text-right",',
        note: "TableTdActionable keeps its padding.",
      },
      {
        file: "src/pages/LeaderboardPage/components/LeaderboardAccountsTable.tsx",
        line: "364",
        find: '<AddressView size={20} address={account.account} breakpoint="XL" />',
        replace:
          '<div className="[&_.AddressView]:flex">\n            <AddressView size={20} address={account.account} breakpoint="XL" />\n          </div>',
        note: "AddressView is inline-flex, which adds 5px under the 20px avatar (rows 45px); as a flex box the row stays 44px.",
      },
      {
        file: "src/pages/LeaderboardPage/components/LeaderboardPositionsTable.tsx",
        line: "403",
        find: '<AddressView size={20} address={position.account} breakpoint="XL" />',
        replace:
          '<div className="[&_.AddressView]:flex">\n            <AddressView size={20} address={position.account} breakpoint="XL" />\n          </div>',
        note: "Same as the accounts table.",
      },
    ],
    verify: [
      "git grep -n 'text-\\[13px\\]' src/components/Table/Table.tsx prints nothing",
      "yarn tscheck && yarn lint:ci && yarn test:ci",
      "Measure in the browser at 1280px: one-line rows are 44px and the header 36px on /leaderboard (both tables), the trade page positions and orders, and /pools.",
    ],
    visible: "Table text 13px to 14px; one-line rows 44px and the header 36px in every table.",
  },
  {
    id: "table-change-medal",
    title: "2. Medal 24px",
    goal: "The top 3 leaderboard medals are 24px instead of 25px, still centred in the row.",
    dependsOn: [],
    edits: [
      {
        file: "src/pages/LeaderboardPage/LeaderboardPage.scss",
        line: "144-145",
        find: '  content: "";\n  width: 2.5rem;',
        replace: '  content: "";\n  width: 2.4rem;',
        note: "In the .LeaderboardRank-1::after … .LeaderboardRank-4::after rule.",
      },
      {
        file: "src/pages/LeaderboardPage/LeaderboardPage.scss",
        line: "153-154",
        find: "  z-index: 111;\n  height: 2.5rem;",
        replace: "  z-index: 111;\n  height: 2.4rem;",
      },
    ],
    verify: ["Measure on /leaderboard: the top 3 medals are 24×24 and centred in their rows."],
    visible: "The top 3 medals are 1px smaller (24px).",
  },
  {
    id: "table-change-underline",
    title: "3. Quieter dotted line, real dots",
    goal: "The dotted line under a value with a tooltip keeps the value's color at 50% and draws whole 1px dots with 2px gaps; today's 0.75px dashes on the svg's top edge are half cut off.",
    dependsOn: ["Tooltip PR"],
    edits: [
      {
        file: "src/components/Tooltip/Tooltip.tsx",
        line: "357",
        find: '<line stroke="currentColor" x1="0" y1="0" x2="100%" y2="0" strokeWidth="0.75" strokeDasharray="1.25,2.25" />',
        replace:
          '<line\n        stroke="currentColor"\n        strokeOpacity="0.5"\n        x1="0"\n        y1="0.5"\n        x2="100%"\n        y2="0.5"\n        strokeWidth="1"\n        strokeDasharray="1,2"\n      />',
        note: "In TooltipUnderline. After the Tooltip PR the same line is at Tooltip.tsx:629.",
      },
      {
        file: "src/components/Tooltip/Tooltip.scss",
        line: "495-499",
        find: ".Tooltip-handle--standard .Tooltip-underline line {\n  stroke: #a0a3c4;\n  stroke-width: 1;\n  transform: translateY(0.5px);\n}",
        replace: "DELETE",
        note: "The rule comes with the Tooltip PR; delete the two comment lines above it too, so standard tooltips get the same dots.",
      },
    ],
    verify: [
      "git grep -n 'Tooltip-underline line' src/components/Tooltip prints nothing",
      "yarn tscheck && yarn lint:ci && yarn test:ci",
      "Compare a PnL value with a tooltip in the positions table (green and red) and a standard tooltip: the dotted line is the value's color at 50%, with whole dots.",
    ],
    visible: "The dotted line under values with a tooltip is lighter and draws whole dots.",
  },
];
