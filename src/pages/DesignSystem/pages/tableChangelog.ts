// The Table Changelog as data: exact edits for the product repo, step by step (rendered by DocsChangelog).
import type { ChangelogStep } from "../DocsChangelog";

// Rules for all steps
export const TABLE_CHANGELOG_NOTES: string[] = [
  "Scope: Table.tsx (TableTr, TableTd, TableTdActionable), Table.scss, PositionItem.scss, the table skeletons, the Referrals grid tables, the two leaderboard tables, LeaderboardPage.scss, Tooltip.tsx and Tooltip.scss; nothing here is done at origin/release 0f9e06e991.",
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
  {
    id: "table-change-no-stripes",
    title: "4. Rows without stripes",
    goal: "Every table gets the row look of the Experiment 2 test: no stripes, 16px above and below the content (one-line rows 52px), a hairline between rows that stops at the cell padding at the table edges, and the same hover tint on every row. The Pools rows (TableTdActionable) and the Referrals grid tables become plain rows too, and the loading skeletons and empty rows match. Names and line numbers are the ones after the Colors changelog and steps 1-3.",
    dependsOn: ["Table steps 1-3", "Colors changelog"],
    edits: [
      {
        file: "src/components/Table/Table.tsx",
        line: "42",
        find: '      className={cx("odd:bg-fill-surfaceElevated50", className, {',
        replace: '      className={cx("TableTr", className, {',
        note: "TableTr: no stripe. The TableTr class gets the line from Table.scss.",
      },
      {
        file: "src/components/Table/Table.tsx",
        line: "54",
        find: '  return <tr {...props} ref={ref} className={cx("group/tr", className)} />;',
        replace: '  return <tr {...props} ref={ref} className={cx("TableTr group/tr", className)} />;',
        note: "TableTrActionable gets the line too.",
      },
      {
        file: "src/components/Table/Table.tsx",
        line: "67-70",
        find: '        "px-4 py-12 pb-8 first-of-type:pl-20 first-of-type:before:rounded-l-8",\n        "last-of-type:pr-20 last-of-type:before:rounded-r-8 group-hover/tr:before:bg-fill-surfaceHover",\n        "before:absolute before:bottom-4 before:left-0 before:top-4 before:z-0 before:bg-fill-surfaceElevated50",\n        "before:h-[calc(100%-4px)] before:w-full before:content-[\'\']",',
        replace:
          '        "px-4 py-16 first-of-type:pl-20 last-of-type:pr-20",\n        "before:absolute before:inset-0 before:z-0 before:content-[\'\'] group-hover/tr:before:bg-fill-surfaceHover",',
        note: "TableTdActionable: a plain cell. No resting background or 4px gaps; the hover fills the whole cell.",
      },
      {
        file: "src/components/Table/Table.tsx",
        line: "85-87",
        find: '        "px-4 py-12 first-of-type:pl-20 last-of-type:pr-20": padding === "all",\n        "px-4 py-12 first-of-type:pl-12 last-of-type:pr-12": padding === "compact",\n        "px-8 py-12": padding === "compact-one-column",',
        replace:
          '        "px-4 py-16 first-of-type:pl-20 last-of-type:pr-20": padding === "all",\n        "TableTd_compact px-4 py-12 first-of-type:pl-12 last-of-type:pr-12": padding === "compact",\n        "TableTd_compactOneColumn px-8 py-12": padding === "compact-one-column",',
        note: 'TableTd: 16px above and below in padding "all" (one-line rows 52px). Compact cells keep 12px and get a class for the line inset.',
      },
      {
        file: "src/components/Table/Table.scss",
        line: "1-11",
        find: ".TableTr_hoverable {\n  &:nth-child(even):hover {\n    background: linear-gradient(0deg, var(--color-fill-surfaceElevated50), var(--color-fill-surfaceElevated50)),\n      linear-gradient(0deg, var(--color-fill-surfaceHover), var(--color-fill-surfaceHover));\n  }\n\n  &:nth-child(odd):hover {\n    background: var(--color-fill-surfaceHover);\n  }\n}\n",
        replace:
          '// Rows have no stripes: a hairline between them, drawn as a background so rows keep their height. At the table\n// edges the line stops at the cell padding: 20px, 12px in compact cells, 8px in single-column cells.\n.TableTr:not(:last-child) > td,\n.TableTr:not(:last-child) > [role="cell"] {\n  --table-line-inset: 20px;\n  background-image: linear-gradient(var(--color-button-background), var(--color-button-background));\n  background-repeat: no-repeat;\n  background-position: bottom;\n  background-size: 100% 1px;\n\n  &.TableTd_compact {\n    --table-line-inset: 12px;\n  }\n\n  &.TableTd_compactOneColumn {\n    --table-line-inset: 8px;\n  }\n\n  // Div grid cells (GridCell, Referrals tables) are padded with the adaptive padding: 16px, 20px from 768px\n  &[role="cell"] {\n    --table-line-inset: var(--padding-adaptive);\n  }\n\n  &:first-child {\n    background-position: right bottom;\n    background-size: calc(100% - var(--table-line-inset)) 1px;\n  }\n\n  &:last-child {\n    background-position: left bottom;\n    background-size: calc(100% - var(--table-line-inset)) 1px;\n  }\n\n  &:only-child {\n    background-position: center bottom;\n    background-size: calc(100% - 2 * var(--table-line-inset)) 1px;\n  }\n}\n\n// One device pixel on high-density screens: the lower half of the 1px tile. Chrome doesn\'t draw a 0.5px tile.\n@media (min-resolution: 2dppx) {\n  .TableTr:not(:last-child) > td,\n  .TableTr:not(:last-child) > [role="cell"] {\n    background-image: linear-gradient(to top, var(--color-button-background) 50%, transparent 50%);\n  }\n}\n\n.TableTr_hoverable:hover {\n  background: var(--color-fill-surfaceHover);\n}\n',
        note: "The hairline between rows, inset to the cell padding at the table edges (the adaptive padding in div grids), and one hover for every row. Chrome draws nothing for a 0.5px tile, so it is a 1px tile, its lower half on high-density screens.",
      },
      {
        file: "src/components/PositionItem/PositionItem.scss",
        line: "66-78",
        find: "tbody > tr:nth-child(odd) > .PositionItem-actions-cell {\n  background: linear-gradient(var(--color-fill-surfaceElevated50), var(--color-fill-surfaceElevated50)),\n    var(--color-fill-surfaceBase);\n}\n\n.TableTr_hoverable:nth-child(even):hover > .PositionItem-actions-cell {\n  background: linear-gradient(var(--color-fill-surfaceElevated50), var(--color-fill-surfaceElevated50)),\n    linear-gradient(var(--color-fill-surfaceHover), var(--color-fill-surfaceHover)), var(--color-fill-surfaceBase);\n}\n\n.TableTr_hoverable:nth-child(odd):hover > .PositionItem-actions-cell {\n  background: linear-gradient(var(--color-fill-surfaceHover), var(--color-fill-surfaceHover)),\n    var(--color-fill-surfaceBase);",
        replace:
          "// The sticky cell covers the row hover, so it adds the hover tint itself (over its line, which stays visible)\n.TableTr_hoverable:hover > .PositionItem-actions-cell {\n  box-shadow: inset 0 0 0 100vmax var(--color-fill-surfaceHover);",
        note: "The sticky actions cell of the positions table: no stripe; the hover tint as an inset shadow over its line.",
      },
      {
        file: "src/components/Skeleton/GMListSkeletonStructure.tsx",
        line: "9-10",
        find: '        <div className="flex items-center">\n          {withFavorite && <Skeleton width={32} height={32} borderRadius={4} className="-ml-8 mr-4" />}',
        replace:
          '        <div className="flex items-center gap-8">\n          {withFavorite && <Skeleton width={32} height={32} borderRadius={4} />}',
        note: "The Pools loading skeleton: the star, the icon and the name line up with the real rows (gap-8, like GmListItem).",
      },
      {
        file: "src/components/MarketsList/MarketsList.tsx",
        line: "117",
        find: '              <TableTr className="h-[64.5px]">',
        replace: '              <TableTr className="h-72">',
        note: "The markets list empty row is as tall as the other rows (72px), so the table keeps its height.",
      },
      {
        file: "src/pages/LeaderboardPage/LeaderboardPage.scss",
        line: "148",
        find: "  top: 10px;",
        replace: "  top: calc(50% - 1.2rem);",
        note: "The leaderboard medals stay centred in the taller rows.",
      },
      {
        file: "src/components/Referrals/distributions/table/Grid.tsx",
        line: "11",
        find: '      className={cx("group/row col-span-full grid grid-cols-subgrid", className, {',
        replace: '      className={cx("TableTr group/row col-span-full grid grid-cols-subgrid", className, {',
        note: "GridRow (the Referrals grid tables) gets the TableTr class, so its rows get the line.",
      },
      {
        file: "src/components/Referrals/distributions/table/Grid.tsx",
        line: "27",
        find: '        "bg-fill-surfaceElevated50 px-4 py-8 first-of-type:rounded-l-8 first-of-type:pl-adaptive last-of-type:rounded-r-8 last-of-type:pr-adaptive",',
        replace: '        "px-4 py-16 first-of-type:pl-adaptive last-of-type:pr-adaptive",',
        note: "GridCell: no card background or rounded ends; 16px above and below.",
      },
      {
        file: "src/components/Referrals/distributions/table/RebatesDistributionTable.tsx",
        line: "36",
        find: '        <div role="table" className="grid min-w-max grid-cols-[1fr_1fr_1fr_1fr_auto] gap-y-4">',
        replace: '        <div role="table" className="grid min-w-max grid-cols-[1fr_1fr_1fr_1fr_auto]">',
        note: "No 4px gaps between the distributions rows.",
      },
      {
        file: "src/components/Referrals/affiliates/dashboard/AffiliatesStats.tsx",
        line: "404",
        find: '    <div role="table" className="grid grid-cols-[1fr_1fr_auto] gap-y-4 px-4">',
        replace: '    <div role="table" className="grid grid-cols-[1fr_1fr_auto] px-4">',
        note: "No 4px gaps between the rows of the mobile referral codes table.",
      },
      {
        file: "src/components/UserIncentiveDistribution/UserIncentiveDistribution.tsx",
        line: "255",
        find: "        <tr>",
        replace: '        <tr className="TableTr">',
        note: "An expanded distribution's details get the line under them.",
      },
      {
        file: "src/pages/ParseTransaction/ParseTransaction.tsx",
        line: "746-749",
        find: '        <TableTr>\n          <TableTd padding="compact" className="bg-fill-surfaceBase" colSpan={3}></TableTd>\n        </TableTr>\n      </tbody>',
        replace:
          '      </tbody>\n      <tfoot>\n        <TableTr>\n          <TableTd padding="compact" className="bg-fill-surfaceBase" colSpan={3}></TableTd>\n        </TableTr>\n      </tfoot>',
        note: "The parse transaction page: the spacer row moves to a tfoot, so the last value row has no line.",
      },
    ],
    verify: [
      "git grep -n 'odd:bg' src/components/Table prints nothing",
      "yarn tscheck && yarn lint:ci && yarn test:ci",
      "On /leaderboard and /pools, in both themes: no stripes, one-line rows 52px, a hairline between rows that stops 20px from the table edges, the medals centred, and hovering a row tints it.",
      "While /pools loads, the skeleton's star, icon and name sit where the real row's do.",
    ],
    visible:
      "Tables lose their stripes: rows grow from 44px to 52px with a thin line between them, and the Pools and Referrals rows lose their rounded card backgrounds.",
  },
];
