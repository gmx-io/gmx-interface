import { ReactNode } from "react";

import { GMListSkeleton } from "components/Skeleton/Skeleton";
import { TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";
import { TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";
import TokenIcon from "components/TokenIcon/TokenIcon";
import StandardTooltip from "components/Tooltip/StandardTooltip";

import BurgerMenuIcon from "img/ic_burger_menu.svg?react";
import CalendarIcon from "img/ic_calendar.svg?react";
import CardIcon from "img/ic_card.svg?react";
import ClockIcon from "img/ic_clock.svg?react";
import CopyIcon from "img/ic_copy_stroke.svg?react";
import InfoCircleStrokeIcon from "img/ic_info_circle_stroke.svg?react";
import PnlAnalysisIcon from "img/ic_pnl_analysis.svg?react";
import RepeatIcon from "img/ic_repeat.svg?react";
import SettingsIcon from "img/ic_settings.svg?react";
import SortableIcon from "img/ic_sortable.svg?react";
import TokensIcon from "img/ic_tokens.svg?react";

import {
  DocsChangelog,
  DocsChangelogEntry,
  DocsCode,
  DocsProp,
  DocsPropsTable,
  DocsRule,
  DocsRules,
  DocsSection,
  DocsSectionInfo,
} from "../DocsLayout";
import usageSource from "./TableUsage.tsx?raw";

// Table page of the design system site (/ui/table). The examples use the real table parts with sample data.

const SECTIONS = {
  oneLine: { id: "table-one-line", title: "One-line rows", icon: BurgerMenuIcon },
  twoLines: { id: "table-two-lines", title: "Two-line rows", icon: PnlAnalysisIcon },
  tokenIcon: { id: "table-token-icon", title: "Token icon rows", icon: TokensIcon },
  positions: { id: "table-positions", title: "Position rows", icon: CardIcon },
  loading: { id: "table-loading", title: "Loading", icon: ClockIcon },
  rows: { id: "table-rows", title: "Rows", icon: BurgerMenuIcon },
  text: { id: "table-text", title: "Text", icon: PnlAnalysisIcon },
  icons: { id: "table-icons", title: "Icons", icon: TokensIcon },
  columns: { id: "table-columns", title: "Columns and pages", icon: SortableIcon },
  usage: { id: "table-usage", title: "Usage", icon: CopyIcon },
  rowProps: {
    id: "table-props-rows",
    title: "TableTr · TableTrActionable · TableTdActionable",
    icon: InfoCircleStrokeIcon,
  },
  cellProps: { id: "table-props-cells", title: "TableTh · TableTd", icon: SettingsIcon },
  beforeAfter: { id: "table-before-after", title: "Before → after", icon: RepeatIcon },
} satisfies Record<string, DocsSectionInfo>;

const USAGE_CODE = usageSource.replace(/^(\/\/.*\n)+/, "");

// Sample data only: placeholder addresses and made-up values.
const ADDRESSES = ["0x1234…5678", "0x2345…6789", "0x3456…7890", "0x4567…8901"];
const PNLS = ["12,480.20", "10,169.70", "7,859.20", "5,548.70"];

function Positive({ children }: { children: ReactNode }) {
  return <span className="text-green-500">{children}</span>;
}

function Negative({ children }: { children: ReactNode }) {
  return <span className="text-red-500">{children}</span>;
}

// As in the app now: the $ is plain text in the colour of its number, with a hair space after it.
function Usd({ value, sign }: { value: string; sign?: "+" | "-" }) {
  return (
    <span className="numbers">
      {sign}
      {"$ "}
      {value}
    </span>
  );
}

function Market({ name, isLong }: { name: string; isLong: boolean }) {
  return (
    <span className="inline-flex items-center gap-6">
      <TokenIcon symbol={name.split("/")[0]} displaySize={20} />
      <span>{name}</span>
      {isLong ? <Positive>Long</Positive> : <Negative>Short</Negative>}
    </span>
  );
}

function Pool({ index, collateral }: { index: string; collateral: [string, string] }) {
  return (
    <div className="flex items-center gap-12">
      <TokenIcon
        symbol={index}
        displaySize={36}
        badge={collateral}
        className="min-h-36 min-w-36"
        badgeClassName="!-bottom-4"
      />
      <div>
        <div className="whitespace-nowrap text-16 font-medium">{index}/USD</div>
        <div className="text-12 text-typography-secondary">
          [{collateral[0]}-{collateral[1]}]
        </div>
      </div>
    </div>
  );
}

function TableFrame({ children, minWidth = "min-w-[640px]" }: { children: ReactNode; minWidth?: string }) {
  return (
    <TableScrollFadeContainer>
      <table className={`w-full ${minWidth}`}>{children}</table>
    </TableScrollFadeContainer>
  );
}

function OneLineTable() {
  return (
    <TableFrame>
      <thead>
        <TableTheadTr>
          <TableTh className="w-[12%]">RANK</TableTh>
          <TableTh className="w-[40%]">ADDRESS</TableTh>
          <TableTh className="w-[28%]">PNL ($)</TableTh>
          <TableTh className="w-[20%]">WIN/LOSS</TableTh>
        </TableTheadTr>
      </thead>
      <tbody>
        {ADDRESSES.map((address, index) => (
          <TableTr key={address} hoverable>
            <TableTd>{index + 1}</TableTd>
            <TableTd className="font-mono">{address}</TableTd>
            <TableTd>
              <StandardTooltip
                handle={
                  <Positive>
                    <Usd sign="+" value={PNLS[index]} />
                  </Positive>
                }
                content="Realized and unrealized PnL"
              />
            </TableTd>
            <TableTd>
              {12 - index}/{4 + index}
            </TableTd>
          </TableTr>
        ))}
      </tbody>
    </TableFrame>
  );
}

type Trade = {
  action: string;
  date: string;
  market: string;
  isLong: boolean;
  sign: "+" | "-";
  size: string;
  price: string;
};

const TRADES: Trade[] = [
  {
    action: "Market Increase",
    date: "21 Nov 2025, 09:49",
    market: "BTC/USD",
    isLong: true,
    sign: "+",
    size: "12,500.00",
    price: "64,103.31",
  },
  {
    action: "Market Decrease",
    date: "20 Nov 2025, 18:02",
    market: "ETH/USD",
    isLong: false,
    sign: "-",
    size: "4,200.00",
    price: "1,796.10",
  },
  {
    action: "Create Limit",
    date: "19 Nov 2025, 11:30",
    market: "SOL/USD",
    isLong: true,
    sign: "+",
    size: "2,000.00",
    price: "70.5518",
  },
  {
    action: "Execute Limit",
    date: "18 Nov 2025, 07:15",
    market: "BTC/USD",
    isLong: false,
    sign: "+",
    size: "8,000.00",
    price: "63,880.00",
  },
];

function TwoLinesTable() {
  return (
    <TableFrame>
      <thead>
        <TableTheadTr>
          <TableTh className="w-[28%]">ACTION</TableTh>
          <TableTh className="w-[28%]">MARKET</TableTh>
          <TableTh className="w-[22%]">SIZE</TableTh>
          <TableTh className="w-[22%]">PRICE</TableTh>
        </TableTheadTr>
      </thead>
      <tbody>
        {TRADES.map((trade) => (
          <TableTr key={trade.action + trade.date} hoverable>
            <TableTd>
              <div className="font-medium">{trade.action}</div>
              <span className="text-body-small block text-typography-secondary">{trade.date}</span>
            </TableTd>
            <TableTd>
              <Market name={trade.market} isLong={trade.isLong} />
            </TableTd>
            <TableTd>
              <Usd sign={trade.sign} value={trade.size} />
            </TableTd>
            <TableTd>
              <StandardTooltip handle={<Usd value={trade.price} />} content="Mark price when the order executed" />
            </TableTd>
          </TableTr>
        ))}
      </tbody>
    </TableFrame>
  );
}

type PoolRow = { index: string; collateral: [string, string]; tvl: string; supply: string; apy: string };

const POOLS: PoolRow[] = [
  { index: "BTC", collateral: ["BTC", "USDC"], tvl: "51.96m", supply: "22.90m GM", apy: "8.21%" },
  { index: "ETH", collateral: ["WETH", "USDC"], tvl: "42.71m", supply: "26.00m GM", apy: "7.40%" },
  { index: "SOL", collateral: ["SOL", "USDC"], tvl: "3.55m", supply: "840.46k GM", apy: "7.66%" },
];

function TokenIconTable() {
  return (
    <TableFrame>
      <thead>
        <TableTheadTr>
          <TableTh className="w-[44%] min-w-[240px]">POOL</TableTh>
          <TableTh className="w-[30%]">TVL (SUPPLY)</TableTh>
          <TableTh className="w-[26%]">FEE APY</TableTh>
        </TableTheadTr>
      </thead>
      <tbody>
        {POOLS.map((pool) => (
          <TableTr key={pool.index + pool.collateral.join("")} hoverable>
            <TableTd>
              <Pool index={pool.index} collateral={pool.collateral} />
            </TableTd>
            <TableTd>
              <Usd value={pool.tvl} />
              <br />
              <span className="text-12 text-typography-secondary numbers">({pool.supply})</span>
            </TableTd>
            <TableTd>
              <StandardTooltip handle={pool.apy} content="Fee APY of the last 7 days" />
            </TableTd>
          </TableTr>
        ))}
      </tbody>
    </TableFrame>
  );
}

const POSITIONS = [
  { market: "BTC/USD", leverage: "10.00x", isLong: true, size: "64,950.00", net: "6,612.40" },
  { market: "SOL/USD", leverage: "1.11x", isLong: false, size: "749,116.72", net: "1,202,341.10" },
];

function PositionsTable() {
  return (
    <TableFrame>
      <thead>
        <TableTheadTr>
          <TableTh className="w-[34%]">POSITION</TableTh>
          <TableTh className="w-[33%]">SIZE</TableTh>
          <TableTh className="w-[33%]">NET VALUE</TableTh>
        </TableTheadTr>
      </thead>
      <tbody>
        {POSITIONS.map((position) => (
          <TableTr key={position.market} hoverable className="h-72">
            <TableTd>
              <div className="flex items-center gap-8">
                <TokenIcon symbol={position.market.split("/")[0]} displaySize={20} />
                <span className="font-medium">{position.market}</span>
              </div>
              <span className="text-body-small block text-typography-secondary">
                {position.leverage} {position.isLong ? <Positive>Long</Positive> : <Negative>Short</Negative>}
              </span>
            </TableTd>
            <TableTd>
              <Usd value={position.size} />
            </TableTd>
            <TableTd>
              <StandardTooltip handle={<Usd value={position.net} />} content="Collateral plus PnL, minus fees" />
            </TableTd>
          </TableTr>
        ))}
      </tbody>
    </TableFrame>
  );
}

function LoadingTable() {
  return (
    <TableFrame minWidth="min-w-[900px]">
      <thead>
        <TableTheadTr>
          <TableTh>POOL</TableTh>
          <TableTh>TVL (SUPPLY)</TableTh>
          <TableTh>BALANCE</TableTh>
          <TableTh>FEE APY</TableTh>
          <TableTh>ANNUALIZED PERFORMANCE</TableTh>
          <TableTh>SNAPSHOT</TableTh>
          <TableTh />
        </TableTheadTr>
      </thead>
      <tbody>
        <GMListSkeleton count={3} />
      </tbody>
    </TableFrame>
  );
}

/**
 * Examples tab: the table rows in the app, built from the real table parts.
 */
export function TableExamples() {
  return (
    <div className="flex flex-col gap-16">
      <DocsSection section={SECTIONS.oneLine} flush>
        <OneLineTable />
      </DocsSection>
      <DocsSection section={SECTIONS.twoLines} flush>
        <TwoLinesTable />
      </DocsSection>
      <DocsSection section={SECTIONS.tokenIcon} flush>
        <TokenIconTable />
      </DocsSection>
      <DocsSection section={SECTIONS.positions} flush>
        <PositionsTable />
      </DocsSection>
      <DocsSection section={SECTIONS.loading} flush>
        <LoadingTable />
      </DocsSection>
    </div>
  );
}

const ROW_RULES: DocsRule[] = [
  ["Height", "At least 52px, with 8px above and below the text. Position rows are 72px."],
  [
    "Lines",
    "A hairline between rows and under the header (1px, one device pixel on high-density screens). It stops at the cell padding at the table edges. No stripes.",
  ],
  ["Highlight", "Hovering a row, or opening a tooltip in it, highlights the row and hides the lines next to it."],
];

const TEXT_RULES: DocsRule[] = [
  ["Cells", "14px on a 20px line."],
  ["Second lines", "Dates, pool names and amounts below a value: 12px on a 16px line, so two-line rows stay 52px."],
  ["Headers", "12px on a 16px line, always on one line."],
  ["Names", "Market and pool names stay on one line."],
  ["Numbers", "The $ sign takes the colour of its number."],
  [
    "Dotted line",
    "Tooltip values get a dotted line at 60% of their text colour. It starts at the text, not under an icon.",
  ],
];

const ICON_RULES: DocsRule[] = [
  ["Token icons", "36px in pool and market rows, 20px next to a market name."],
  ["Pool icons", "The two small collateral icons sit 4px above the row line."],
];

const COLUMN_RULES: DocsRule[] = [
  [
    "Pages",
    "Tables with pages get fixed column widths (a share of the table), so columns stay in place on every page.",
  ],
  ["First column", "Give it a minimum width that fits its widest content, like a long pool name with a badge."],
  ["Phones", "Tables keep their minimum width and scroll sideways inside their card."],
];

/**
 * Guidelines tab: the rules for rows, text, icons and columns.
 */
export function TableGuidelines() {
  return (
    <div className="flex flex-col gap-16">
      <DocsSection section={SECTIONS.rows}>
        <DocsRules rules={ROW_RULES} />
      </DocsSection>
      <DocsSection section={SECTIONS.text}>
        <DocsRules rules={TEXT_RULES} />
      </DocsSection>
      <DocsSection section={SECTIONS.icons}>
        <DocsRules rules={ICON_RULES} />
      </DocsSection>
      <DocsSection section={SECTIONS.columns}>
        <DocsRules rules={COLUMN_RULES} />
      </DocsSection>
    </div>
  );
}

const ROW_PROPS: DocsProp[] = [
  {
    name: "TableTr · hoverable",
    type: "boolean",
    defaultValue: "false",
    description: "Highlights the row on hover and while one of its tooltips is open.",
  },
  {
    name: "TableTr · className",
    type: "string",
    description: 'Row classes, like "h-72" for position rows. Rows of "all" cells are at least 52px.',
  },
  {
    name: "TableTrActionable",
    type: "tr props + onClick",
    description: "A clickable row (pools). Its cells are TableTdActionable.",
  },
  {
    name: "TableTdActionable",
    type: "td props",
    description: 'Always the "all" padding: 8px above and below, a 52px minimum row, 20px at the table edges.',
  },
];

const CELL_PROPS: DocsProp[] = [
  {
    name: "TableTd · padding",
    type: '"all" | "compact" | "compact-one-column"',
    defaultValue: '"all"',
    description:
      "all: 8px above and below with a 52px minimum row, 4px sides, 20px at the table edges. compact: 12px above and below, 12px at the edges (rows 44px, dropdown lists). compact-one-column: 12px above and below, 8px sides.",
  },
  {
    name: "TableTh · padding",
    type: '"all" | "compact" | "compact-one-column"',
    defaultValue: '"all"',
    description:
      "all: 12px above and 8px below, 4px sides, 20px at the table edges. compact: 8px above and below, 12px at the edges. compact-one-column: 8px all round.",
  },
  {
    name: "className",
    type: "string",
    description: 'Cell classes. On TableTh, a width share like "w-[28%]" keeps the column in place on every page.',
  },
];

/**
 * Props tab: how to build a table, then the props of the table parts.
 */
export function TablePropsReference() {
  return (
    <div className="flex flex-col gap-16">
      <DocsSection section={SECTIONS.usage} flush>
        <DocsCode code={USAGE_CODE} collapsedHeight={320} />
      </DocsSection>
      <DocsSection section={SECTIONS.rowProps}>
        <DocsPropsTable props={ROW_PROPS} />
      </DocsSection>
      <DocsSection section={SECTIONS.cellProps}>
        <DocsPropsTable props={CELL_PROPS} />
      </DocsSection>
    </div>
  );
}

const CHANGELOG: DocsChangelogEntry[] = [
  {
    id: "table-v1-0",
    title: "v1.0 · Tables update",
    icon: CalendarIcon,
    date: "Nov 17, 2026",
    changes: [
      "Rows without stripes: a hairline between rows and under the header.",
      "A highlighted row hides the lines next to it and stays highlighted while its tooltip is open.",
      "Rows are at least 52px with 8px above and below; second lines take 16px, so two-line rows stay 52px. Position rows are 72px.",
      "Table text is 14px on a 20px line; header labels are 12px and stay on one line.",
      "Token icons in pool and market rows are 36px.",
      "Tables with pages keep the same columns on every page.",
      "The tooltip dotted line is 60% of its text colour and starts at the text. The $ sign takes the colour of its number.",
    ],
  },
];

// The old table look, kept here only to compare. Trades: striped rows, 13px text, 8px above and below, a grey $.
// Pools: a rounded card behind every row, 12px above and 8px below, 40px icons.
const LEGACY_HEAD =
  "text-caption px-4 py-12 pb-8 text-left first-of-type:pl-20 last-of-type:pr-20 last-of-type:text-right";
const LEGACY_CELL = "text-[13px] px-4 py-8 first-of-type:pl-20 last-of-type:pr-20 last-of-type:text-right";
const LEGACY_CARD_CELL =
  "relative select-none text-[13px] last-of-type:[&:not(:first-of-type)]:text-right px-4 py-12 pb-8 first-of-type:pl-20 first-of-type:before:rounded-l-8 last-of-type:pr-20 last-of-type:before:rounded-r-8 group-hover/tr:before:bg-fill-surfaceHover before:absolute before:bottom-2 before:left-0 before:top-2 before:z-0 before:bg-fill-surfaceElevated50 before:h-[calc(100%-4px)] before:w-full before:content-['']";

function LegacyUsd({ value, sign }: { value: string; sign?: "+" | "-" }) {
  return (
    <span className="numbers">
      {sign}
      <span className="numeric-affix">$</span>
      {value}
    </span>
  );
}

function LegacyTradesTable() {
  return (
    <TableFrame>
      <thead>
        <tr>
          <th className={`${LEGACY_HEAD} w-[28%]`}>ACTION</th>
          <th className={`${LEGACY_HEAD} w-[28%]`}>MARKET</th>
          <th className={`${LEGACY_HEAD} w-[22%]`}>SIZE</th>
          <th className={`${LEGACY_HEAD} w-[22%]`}>PRICE</th>
        </tr>
      </thead>
      <tbody>
        {TRADES.map((trade) => (
          <tr key={trade.action + trade.date} className="odd:bg-fill-surfaceElevated50">
            <td className={LEGACY_CELL}>
              <div className="font-medium">{trade.action}</div>
              <div className="text-12 text-typography-secondary">{trade.date}</div>
            </td>
            <td className={LEGACY_CELL}>
              <Market name={trade.market} isLong={trade.isLong} />
            </td>
            <td className={LEGACY_CELL}>
              <LegacyUsd sign={trade.sign} value={trade.size} />
            </td>
            <td className={LEGACY_CELL}>
              <LegacyUsd value={trade.price} />
            </td>
          </tr>
        ))}
      </tbody>
    </TableFrame>
  );
}

function LegacyPoolsTable() {
  return (
    <TableFrame>
      <thead>
        <tr>
          <th className={`${LEGACY_HEAD} w-[44%]`}>POOL</th>
          <th className={`${LEGACY_HEAD} w-[30%]`}>TVL (SUPPLY)</th>
          <th className={`${LEGACY_HEAD} w-[26%]`}>FEE APY</th>
        </tr>
      </thead>
      <tbody>
        {POOLS.map((pool) => (
          <tr key={pool.index + pool.collateral.join("")} className="group/tr">
            <td className={LEGACY_CARD_CELL}>
              <div className="z-1 relative flex items-center gap-12">
                <TokenIcon symbol={pool.index} displaySize={40} badge={pool.collateral} className="min-h-40 min-w-40" />
                <div>
                  <div className="text-16 font-medium">{pool.index}/USD</div>
                  <div className="text-12 text-typography-secondary">
                    [{pool.collateral[0]}-{pool.collateral[1]}]
                  </div>
                </div>
              </div>
            </td>
            <td className={LEGACY_CARD_CELL}>
              <div className="z-1 relative">
                <LegacyUsd value={pool.tvl} />
                <br />
                <span className="text-12 text-typography-secondary">({pool.supply})</span>
              </div>
            </td>
            <td className={LEGACY_CARD_CELL}>
              <div className="z-1 relative">{pool.apy}</div>
            </td>
          </tr>
        ))}
      </tbody>
    </TableFrame>
  );
}

function BeforeAfter({
  label,
  change,
  before,
  after,
}: {
  label: string;
  change: string;
  before: ReactNode;
  after: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-16 p-24 max-md:p-16">
      <div className="flex flex-col gap-4">
        <span className="text-body-large font-medium text-typography-primary">{label}</span>
        <span className="text-body-medium text-typography-secondary">{change}</span>
      </div>
      <div className="flex flex-col gap-8">
        <span className="text-body-medium text-typography-secondary">Before</span>
        {before}
      </div>
      <div className="flex flex-col gap-8">
        <span className="text-body-medium font-medium text-typography-primary">After</span>
        {after}
      </div>
    </div>
  );
}

/**
 * Changelog tab: what changed, then the old and new rows, one above the other.
 */
export function TableChangelog() {
  return (
    <div className="flex flex-col gap-16">
      <DocsChangelog entries={CHANGELOG} />
      <DocsSection section={SECTIONS.beforeAfter} flush>
        <div className="flex flex-col divide-y divide-fill-surfaceElevated">
          <BeforeAfter
            label="Two-line rows"
            change="Lines instead of stripes. 14px text; the date line takes 16px, so rows are 52px instead of 48px. The $ takes the colour of its number."
            before={<LegacyTradesTable />}
            after={<TwoLinesTable />}
          />
          <BeforeAfter
            label="Token icon rows"
            change="Lines instead of a rounded card behind each row. 36px token icons, rows 52px instead of 60px."
            before={<LegacyPoolsTable />}
            after={<TokenIconTable />}
          />
        </div>
      </DocsSection>
    </div>
  );
}
