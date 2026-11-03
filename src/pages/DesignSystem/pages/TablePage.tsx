import { ComponentType, ReactNode, useState } from "react";

import Tabs from "components/Tabs/Tabs";

import { DocsChangelog } from "../DocsChangelog";
import { DocsProp, DocsPropsTable, DocsSection, DocsSectionInfo } from "../DocsLayout";
import { TABLE_CHANGELOG_NOTES, TABLE_CHANGELOG_STEPS } from "./tableChangelog";
import {
  ClaimsTable,
  LeaderboardCard,
  MarketsTable,
  OrdersTable,
  PoolsPage,
  PoolsTable,
  PositionsTable,
  ReferralCodesTable,
  type RowStyle,
  TopAddressesTable,
  TopPositionsTable,
  TradesTable,
} from "./TableDemos";

// Table page of the design system site (/ui/table).
// Examples: the app's tables built from the shared table parts. Props: the parts' props and the parts → code map.
// Changelog: what developers change in the table parts.
// Experiment 1 and 2: design tries on a full table and a full page, not decided yet.

type TableExample = DocsSectionInfo & { table: ComponentType };

const TABLES: TableExample[] = [
  { id: "table-top-addresses", title: "Leaderboard · Top addresses", table: TopAddressesTable },
  { id: "table-top-positions", title: "Leaderboard · Top positions", table: TopPositionsTable },
  { id: "table-positions", title: "Trade · Positions", table: PositionsTable },
  { id: "table-orders", title: "Trade · Orders", table: OrdersTable },
  { id: "table-trades", title: "Trade · Trades", table: TradesTable },
  { id: "table-claims", title: "Trade · Claims", table: ClaimsTable },
  { id: "table-pools", title: "Pools", table: PoolsTable },
  { id: "table-markets", title: "Stats · Markets", table: MarketsTable },
  { id: "table-referral-codes", title: "Referrals · Codes", table: ReferralCodesTable },
];

const PARTS_SECTION: DocsSectionInfo = { id: "table-parts", title: "Parts → code" };

type PartRow = { part: string; code: string };

const PARTS: PartRow[] = [
  { part: "Header cell", code: "TableTh (+ Sorter, TooltipWithPortal)" },
  { part: "… row", code: "TableTr hoverable" },
  { part: "Striped switch", code: "Automatic: TableTr stripes every odd row" },
  { part: "Table cell, Market cell, Position cell", code: "TableTd + the cell content" },
  { part: "Tooltip switch", code: 'TooltipWithPortal variant="underline"' },
  { part: "Pagination", code: "BottomTablePagination" },
];

const TH_CLASSNAME = "pb-8 pr-16 font-normal";

function PartsTable() {
  return (
    <div className="overflow-x-auto">
      <table className="text-body-large w-full min-w-[480px] border-collapse text-left">
        <thead>
          <tr className="text-body-medium uppercase text-textIcon-secondary">
            <th className={TH_CLASSNAME}>Part</th>
            <th className="pb-8 font-normal">Code</th>
          </tr>
        </thead>
        <tbody>
          {PARTS.map((part) => (
            <tr key={part.part} className="border-t-1/2 border-stroke-primary align-top">
              <td className="w-[240px] py-10 pr-16">{part.part}</td>
              <td className="text-body-medium py-10 font-mono">{part.code}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Examples tab: every table.
 */
export function TableExamples() {
  return (
    <div className="flex flex-col gap-16">
      {TABLES.map(({ table: ExampleTable, ...section }) => (
        <DocsSection key={section.id} section={section} flush>
          <ExampleTable />
        </DocsSection>
      ))}
    </div>
  );
}

const PROPS_SECTIONS = {
  table: { id: "table-props-table", title: "Table · TableTr" },
  cells: { id: "table-props-cells", title: "TableTh · TableTd" },
} satisfies Record<string, DocsSectionInfo>;

const TABLE_PROPS: DocsProp[] = [
  {
    name: "Table · className",
    type: "string",
    description: "Classes for the table, like a min width that keeps columns readable.",
  },
  {
    name: "TableTr · hoverable",
    type: "boolean",
    defaultValue: "false",
    description: "Highlights the row under the pointer.",
  },
  { name: "TableTr", type: "tr props", description: "Every odd row gets the stripe background." },
];

const CELL_PROPS: DocsProp[] = [
  {
    name: "padding",
    type: '"all" | "compact" | "compact-one-column"',
    defaultValue: '"all"',
    description:
      "all: 4px sides, 20px at the table edges. compact: 12px at the edges. compact-one-column: 8px all round.",
  },
  { name: "className", type: "string", description: "Classes for the cell, like a width or right alignment." },
];

/**
 * Props tab: the props of the table parts, then how the design parts map to the code.
 */
export function TablePropsReference() {
  return (
    <div className="flex flex-col gap-16">
      <DocsSection section={PROPS_SECTIONS.table}>
        <DocsPropsTable props={TABLE_PROPS} />
      </DocsSection>
      <DocsSection section={PROPS_SECTIONS.cells}>
        <DocsPropsTable props={CELL_PROPS} />
      </DocsSection>
      <DocsSection section={PARTS_SECTION}>
        <PartsTable />
      </DocsSection>
    </div>
  );
}

/**
 * Changelog tab: the exact edits for developers, step by step, with the rules for all steps on top.
 */
export function TableChangelog() {
  return (
    <DocsChangelog
      title="Table changelog"
      summary="3 steps for the table parts and the places that use them. All of them are applied. Each edit gives the file, the exact text to find at release 0f9e06e991 and the text to put instead."
      notes={TABLE_CHANGELOG_NOTES}
      steps={TABLE_CHANGELOG_STEPS}
    />
  );
}

const LEADERBOARD_EXPERIMENT_SECTION: DocsSectionInfo = {
  id: "table-experiment-leaderboard",
  title: "Leaderboard · Full table",
};

const POOLS_EXPERIMENT_SECTION: DocsSectionInfo = { id: "table-experiment-pools", title: "Pools · Full page" };

type RowLook = "current" | "idea1" | "idea2";

// The row looks to compare on both experiments
const ROW_LOOKS: Record<RowLook, RowStyle> = {
  current: { striped: true, lines: false, cellPadding: 12 },
  idea1: { striped: false, lines: false, cellPadding: 12 },
  idea2: { striped: false, lines: true, cellPadding: 16 },
};

const ROW_LOOK_OPTIONS: { label: string; value: RowLook }[] = [
  { label: "Current", value: "current" },
  { label: "Idea 1", value: "idea1" },
  { label: "Idea 2", value: "idea2" },
];

/**
 * The row look switch of both experiments. Current: striped, 12px. Idea 1: no stripes. Idea 2: no stripes,
 * 16px above and below, lines between rows.
 */
function useRowLook(): { rowStyle: RowStyle; switcher: ReactNode } {
  const [look, setLook] = useState<RowLook>("current");

  return {
    rowStyle: ROW_LOOKS[look],
    switcher: <Tabs type="inline" options={ROW_LOOK_OPTIONS} selectedValue={look} onChange={setLook} />,
  };
}

/**
 * Experiment 1 tab: the full leaderboard card.
 */
export function TableExperiment1() {
  const { rowStyle, switcher } = useRowLook();

  return (
    <DocsSection section={LEADERBOARD_EXPERIMENT_SECTION} flush titleAction={switcher}>
      <LeaderboardCard {...rowStyle} />
    </DocsSection>
  );
}

/**
 * Experiment 2 tab: the Pools page, on the app's page background.
 */
export function TableExperiment2() {
  const { rowStyle, switcher } = useRowLook();

  return (
    <DocsSection section={POOLS_EXPERIMENT_SECTION} flush titleAction={switcher}>
      <div className="bg-fill-background p-16">
        <PoolsPage {...rowStyle} />
      </div>
    </DocsSection>
  );
}
