import cx from "classnames";
import { ReactNode, useMemo, useState } from "react";

import type { SortDirection } from "context/SorterContext/types";
import PoolsCard from "pages/Pools/PoolsCard";

import AddressView from "components/AddressView/AddressView";
import Badge from "components/Badge/Badge";
import Button from "components/Button/Button";
import Checkbox from "components/Checkbox/Checkbox";
import { BottomTablePagination } from "components/Pagination/BottomTablePagination";
import SearchInput from "components/SearchInput/SearchInput";
import { Sorter } from "components/Sorter/Sorter";
import { Table, TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";
import Tabs from "components/Tabs/Tabs";
import TokenIcon from "components/TokenIcon/TokenIcon";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import CopyIcon from "img/ic_copy_stroke.svg?react";
import CrossIcon from "img/ic_cross.svg?react";
import EditIcon from "img/ic_edit.svg?react";
import MenuDotsIcon from "img/ic_menu_dots.svg?react";
import NewLinkIcon from "img/ic_new_link.svg?react";
import ShareIcon from "img/ic_share_arrow_outline.svg?react";
import rank1Icon from "img/rank1.svg";
import rank2Icon from "img/rank2.svg";
import rank3Icon from "img/rank3.svg";
import sparkleIcon from "img/sparkle.svg";

// Example tables for the Table page (/ui/table), built from the shared table parts.
// All numbers, names and addresses are made up.

// Preview of Changelog step 1 (TableTd and the 12px caption), only on this page: 14px text, 12px above and below
// (rows 44px with one line, 60px with two), header 36px.
const PLANNED_LOOK_CLASSNAME = "[&_td]:!text-[14px] [&_td]:!leading-[20px] [&_th]:!text-[12px] [&_th]:!leading-[16px]";

// Space above and below the cell content: 12 (rows 44px) or 16 (rows 52px, Experiment tab)
export type CellPadding = 12 | 16;

const CELL_PADDING_CLASSNAMES: Record<CellPadding, string> = {
  12: "[&_td]:!py-12",
  16: "[&_td]:!py-16",
};

// Made-up addresses: the pattern makes clear they aren't real wallets
const fakeAddress = (start: string, end: string) => `0x${start}${"0".repeat(32)}${end}`;

type Column = {
  title: string;
  // ⓘ icon after the title
  info?: boolean;
  // Dotted line under the title
  tooltip?: boolean;
  sort?: SortDirection;
  className?: string;
};

function HeaderCell({ column }: { column: Column }) {
  const [direction, setDirection] = useState<SortDirection>(column.sort ?? "unspecified");
  const title = <span className="whitespace-nowrap">{column.title}</span>;

  let label: ReactNode = title;
  if (column.info || column.tooltip) {
    label = (
      <TooltipWithPortal
        handle={title}
        content={`About ${column.title.toLowerCase()}`}
        variant={column.info ? "iconStroke" : "underline"}
      />
    );
  }

  return (
    <TableTh className={column.className}>
      {column.sort ? (
        <Sorter direction={direction} onChange={setDirection}>
          {label}
        </Sorter>
      ) : (
        label
      )}
    </TableTh>
  );
}

// How the rows look, switched on the Experiment tab
export type RowStyle = {
  // TableTr stripes every odd row; off clears that background (hover stays)
  striped?: boolean;
  // A 0.5px line between rows
  lines?: boolean;
  cellPadding?: CellPadding;
};

// The line is a 0.5px background at the bottom of the cells, so rows stay 44px (a border would add 0.5px).
// slate-700 keeps it quiet; in the first and last cell it stops 20px short of the table edge.
const ROW_LINE_CLASSNAME = cx(
  "[&:not(:last-child)>td]:bg-[linear-gradient(var(--color-button-background),var(--color-button-background))]",
  "[&:not(:last-child)>td]:bg-[length:100%_0.5px] [&:not(:last-child)>td]:bg-bottom [&:not(:last-child)>td]:bg-no-repeat",
  "[&:not(:last-child)>td:first-child]:bg-[length:calc(100%-20px)_0.5px] [&:not(:last-child)>td:first-child]:bg-right-bottom",
  "[&:not(:last-child)>td:last-child]:bg-[length:calc(100%-20px)_0.5px] [&:not(:last-child)>td:last-child]:bg-left-bottom"
);

function DemoTable({
  columns,
  rows,
  minWidth,
  striped = true,
  lines = false,
  cellPadding = 12,
}: {
  columns: Column[];
  rows: ReactNode[][];
  minWidth: string;
} & RowStyle) {
  return (
    <div className={cx("overflow-x-auto", PLANNED_LOOK_CLASSNAME, CELL_PADDING_CLASSNAMES[cellPadding])}>
      <Table className={minWidth}>
        <thead>
          <TableTheadTr>
            {columns.map((column, index) => (
              <HeaderCell key={index} column={column} />
            ))}
          </TableTheadTr>
        </thead>
        <tbody>
          {rows.map((cells, rowIndex) => (
            <TableTr
              key={rowIndex}
              hoverable
              className={cx({
                "[&:nth-child(odd):not(:hover)]:!bg-[transparent]": !striped,
                [ROW_LINE_CLASSNAME]: lines,
              })}
            >
              {cells.map((cell, cellIndex) => (
                <TableTd key={cellIndex} className={columns[cellIndex]?.className}>
                  {cell}
                </TableTd>
              ))}
            </TableTr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}

type Tone = "positive" | "negative" | "secondary";

const TONE_CLASSNAMES: Record<Tone, string> = {
  positive: "positive",
  negative: "negative",
  secondary: "text-textIcon-secondary",
};

// A number, with the dotted tooltip line when tip is set
function Value({ children, tone, tip }: { children: ReactNode; tone?: Tone; tip?: string }) {
  const className = cx("numbers", tone && TONE_CLASSNAMES[tone]);
  if (!tip) return <span className={className}>{children}</span>;

  return <TooltipWithPortal handle={children} handleClassName={className} content={tip} variant="underline" />;
}

// A value with a smaller second line under it
function TwoLines({ children, sub, subTone = "secondary" }: { children: ReactNode; sub: ReactNode; subTone?: Tone }) {
  return (
    <div className="flex flex-col">
      {children}
      <span className={cx("text-body-small numbers", TONE_CLASSNAMES[subTone])}>{sub}</span>
    </div>
  );
}

// The base img style (max-width: 100%) lets a table column shrink below the icon, so the text overflows
const TOKEN_ICON_CLASSNAME = "max-w-none";

function Direction({ isLong }: { isLong: boolean }) {
  return <span className={isLong ? "positive" : "negative"}>{isLong ? "Long" : "Short"}</span>;
}

// Coin icon + market. With leverage, the leverage and direction go on a second line and the market is Medium.
function Market({
  symbol,
  name,
  isLong,
  leverage,
}: {
  symbol: string;
  name: string;
  isLong?: boolean;
  leverage?: string;
}) {
  return (
    <div className="flex items-center gap-8">
      <TokenIcon symbol={symbol} displaySize={20} className={TOKEN_ICON_CLASSNAME} />
      {leverage ? (
        <div className="flex flex-col">
          <span className="font-medium">{name}</span>
          <span className="text-body-small">
            <span className="text-textIcon-secondary">{leverage} </span>
            {isLong !== undefined && <Direction isLong={isLong} />}
          </span>
        </div>
      ) : (
        <span className="whitespace-nowrap">
          {name} {isLong !== undefined && <Direction isLong={isLong} />}
        </span>
      )}
    </div>
  );
}

function Leverage({ value }: { value: string }) {
  return (
    <span className="numbers">
      {value}
      <span className="text-textIcon-secondary">x</span>
    </span>
  );
}

const MEDALS: Record<number, string> = { 1: rank1Icon, 2: rank2Icon, 3: rank3Icon };

// Rank and the top 3 medal, placed like LeaderboardPage.scss (24px, 36px from the left, centred)
function Rank({ rank }: { rank: number }) {
  return (
    <>
      <span className="text-textIcon-secondary numbers">{rank}</span>
      {MEDALS[rank] && <img src={MEDALS[rank]} alt="" className="absolute left-36 top-1/2 size-24 -translate-y-1/2" />}
    </>
  );
}

// AddressView is inline-flex, which adds 5px under the 20px avatar (rows 45px). As a flex box the row stays 44px.
function Address({ address }: { address: string }) {
  return (
    <div className="[&_.AddressView]:flex">
      <AddressView address={address} size={20} breakpoint="XL" noLink />
    </div>
  );
}

function IconAction({ label, icon: Icon }: { label: string; icon: typeof EditIcon }) {
  return (
    <button type="button" aria-label={label} className="text-textIcon-secondary hover:text-textIcon-primary">
      <Icon className="size-16" />
    </button>
  );
}

const RANK_COLUMN: Column = { title: "Rank", info: true, className: "relative w-[92px]" };
const ADDRESS_COLUMN: Column = { title: "Address" };

type AddressRow = [string, string, string, string, string, number, number];

const TOP_ADDRESS_ROWS: AddressRow[] = [
  [fakeAddress("3fA1", "7b2E"), "+$8,263,048.30", "+111.17%", "$3,195,070.87", "13.57", 404, 342],
  [fakeAddress("9b2C", "4e1D"), "+$7,356,741.24", "+107.77%", "$3,975,929.17", "4.35", 43, 24],
  [fakeAddress("5d7E", "1a9F"), "+$5,876,376.77", "+159.09%", "$786,302.69", "8.18", 517, 421],
  [fakeAddress("7c4B", "3d2A"), "+$5,152,403.33", "+149.16%", "$14,743,250.89", "10.87", 24, 10],
  [fakeAddress("2e8F", "6c5B"), "-$388.47", "-3.21%", "$3,141,478.94", "7.20", 197, 156],
  [fakeAddress("6a3D", "9f8C"), "+$4,024,610.51", "+371.29%", "$17,094,846.20", "24.76", 17, 9],
];

const TOP_ADDRESSES_COLUMNS: Column[] = [
  RANK_COLUMN,
  ADDRESS_COLUMN,
  { title: "PnL ($)", info: true, sort: "desc" },
  { title: "PnL (%)", info: true, sort: "unspecified" },
  { title: "Avg. size", info: true, sort: "unspecified" },
  { title: "Avg. lev.", info: true, sort: "unspecified" },
  { title: "Win / Loss", info: true, sort: "unspecified" },
];

export function TopAddressesTable({ rows = TOP_ADDRESS_ROWS, ...rowStyle }: { rows?: AddressRow[] } & RowStyle) {
  return (
    <DemoTable
      {...rowStyle}
      minWidth="min-w-[760px]"
      columns={TOP_ADDRESSES_COLUMNS}
      rows={rows.map(([address, pnl, pnlPercent, avgSize, avgLeverage, wins, losses], index) => {
        const tone = pnl.startsWith("-") ? "negative" : "positive";
        return [
          <Rank key="rank" rank={index + 1} />,
          <Address key="address" address={address} />,
          <Value key="pnl" tone={tone} tip="Realized and unrealized PnL">
            {pnl}
          </Value>,
          <Value key="pnlPercent" tone={tone} tip="PnL divided by the capital used">
            {pnlPercent}
          </Value>,
          <Value key="avgSize">{avgSize}</Value>,
          <Leverage key="avgLeverage" value={avgLeverage} />,
          <Value key="winLoss" tip="Total trades and win rate">
            {wins} <span className="text-textIcon-secondary">/</span> {losses}
          </Value>,
        ];
      })}
    />
  );
}

type PositionRow = [string, string, string, string, boolean, string, string, string, string];

const TOP_POSITION_ROWS: PositionRow[] = [
  [
    fakeAddress("3fA1", "7b2E"),
    "+$1,070,474.66",
    "SOL",
    "SOL/USD",
    false,
    "$237.0092",
    "$749,116.72",
    "0.66",
    "$450.8054",
  ],
  [
    fakeAddress("9b2C", "4e1D"),
    "+$775,312.72",
    "ETH",
    "ETH/USD",
    false,
    "$3,425.43",
    "$2,740,036.32",
    "1.32",
    "$11,917.50",
  ],
  [
    fakeAddress("5d7E", "1a9F"),
    "+$218,958.93",
    "LINK",
    "LINK/USD",
    true,
    "$19.2036",
    "$252,623.79",
    "1.43",
    "$12.3617",
  ],
];

const TOP_POSITIONS_COLUMNS: Column[] = [
  RANK_COLUMN,
  ADDRESS_COLUMN,
  { title: "PnL ($)", info: true, sort: "desc" },
  { title: "Position" },
  { title: "Entry price", sort: "unspecified" },
  { title: "Size", sort: "unspecified" },
  { title: "Lev.", sort: "unspecified" },
  { title: "Liquidation price" },
];

export function TopPositionsTable({ rows = TOP_POSITION_ROWS, ...rowStyle }: { rows?: PositionRow[] } & RowStyle) {
  return (
    <DemoTable
      {...rowStyle}
      minWidth="min-w-[760px]"
      columns={TOP_POSITIONS_COLUMNS}
      rows={rows.map(([address, pnl, symbol, market, isLong, entry, size, leverage, liquidation], index) => [
        <Rank key="rank" rank={index + 1} />,
        <Address key="address" address={address} />,
        <Value key="pnl" tone="positive" tip="Realized and unrealized PnL">
          {pnl}
        </Value>,
        <TooltipWithPortal
          key="position"
          handle={<Market symbol={symbol} name={market} isLong={isLong} />}
          content="Position details"
          // Inline, the tooltip adds 1px under the 20px coin icon
          className="flex"
          variant="underline"
        />,
        <Value key="entry">{entry}</Value>,
        <Value key="size" tip="Size in USD">
          {size}
        </Value>,
        <Leverage key="leverage" value={leverage} />,
        <Value key="liquidation" tip="Liquidation price">
          {liquidation}
        </Value>,
      ])}
    />
  );
}

const POSITIONS_COLUMNS: Column[] = [
  { title: "Position" },
  { title: "Size" },
  { title: "Net value" },
  { title: "Margin" },
  { title: "Entry price" },
  { title: "Mark price" },
  { title: "Liq. price" },
  { title: "" },
];

export function PositionsTable() {
  const rows: [string, string, string, boolean, string, string, string, string, string, string, string][] = [
    [
      "SOL",
      "SOL/USD",
      "1.10x",
      false,
      "$\u200a749,116.72",
      "$\u200a1,130,628.45",
      "+$\u200a450,702.28 (+65.46%)",
      "$\u200a679,926.18",
      "(680,081.98 USDC)",
      "$\u200a237.0092",
      "$\u200a94.4138",
    ],
    [
      "BTC",
      "BTC/USD",
      "11.07x",
      false,
      "$\u200a1,256,227.85",
      "$\u200a144,473.29",
      "+$\u200a30,956.11 (+27.26%)",
      "$\u200a113,517.18",
      "(113,542.26 USDC)",
      "$\u200a78,528.91",
      "$\u200a76,593.80",
    ],
    [
      "ETH",
      "ETH/USD",
      "4.20x",
      true,
      "$\u200a302,410.00",
      "$\u200a70,821.64",
      "-$\u200a1,204.33 (-1.67%)",
      "$\u200a72,025.97",
      "(72,031.10 USDC)",
      "$\u200a2,310.55",
      "$\u200a2,271.80",
    ],
  ];

  return (
    <DemoTable
      minWidth="min-w-[860px]"
      columns={POSITIONS_COLUMNS}
      rows={rows.map(([symbol, market, leverage, isLong, size, netValue, pnl, margin, marginToken, entry, mark]) => [
        <Market key="position" symbol={symbol} name={market} leverage={leverage} isLong={isLong} />,
        <Value key="size">{size}</Value>,
        <TwoLines key="netValue" sub={pnl} subTone={pnl.startsWith("-") ? "negative" : "positive"}>
          <Value>{netValue}</Value>
        </TwoLines>,
        <TwoLines key="margin" sub={marginToken}>
          <Value>{margin}</Value>
        </TwoLines>,
        <Value key="entry">{entry}</Value>,
        <Value key="mark">{mark}</Value>,
        <Value key="liquidation" tip="Liquidation price">
          {isLong ? "$\u200a1,840.20" : "$\u200a450.8004"}
        </Value>,
        <div key="actions" className="flex items-center justify-end gap-8">
          <Button variant="secondary" size="small">
            Close
          </Button>
          <Button variant="ghost" size="small" aria-label="Position menu">
            <MenuDotsIcon className="size-14" />
          </Button>
        </div>,
      ])}
    />
  );
}

const ORDERS_COLUMNS: Column[] = [
  { title: "", className: "w-[48px]" },
  { title: "Market" },
  { title: "Type" },
  { title: "Size" },
  { title: "Trigger price" },
  { title: "Mark price" },
  { title: "" },
];

export function OrdersTable() {
  const rows: [string, string, boolean, string, string, string, string][] = [
    ["SOL", "SOL/USD", false, "Limit", "+$499,619.38", "> $236.0000", "$94.4138"],
    ["BTC", "BTC/USD", true, "Take-Profit", "-$374,558.36", "> $85,000.00", "$76,593.80"],
    ["ETH", "ETH/USD", true, "Stop-Loss", "Full position close", "< $2,100.00", "$2,271.80"],
  ];

  return (
    <DemoTable
      minWidth="min-w-[800px]"
      columns={ORDERS_COLUMNS}
      rows={rows.map(([symbol, market, isLong, type, size, trigger, mark]) => [
        <Checkbox key="select" isChecked={false} />,
        <Market key="market" symbol={symbol} name={market} isLong={isLong} />,
        <span key="type">{type}</span>,
        <Value key="size">{size}</Value>,
        <Value key="trigger">{trigger}</Value>,
        <Value key="mark">{mark}</Value>,
        <div key="actions" className="flex justify-end gap-12">
          <IconAction label="Edit order" icon={EditIcon} />
          <IconAction label="Cancel order" icon={CrossIcon} />
        </div>,
      ])}
    />
  );
}

const TRADES_COLUMNS: Column[] = [
  { title: "Action" },
  { title: "Market" },
  { title: "Size" },
  { title: "Price" },
  { title: "RPnL" },
  { title: "Fees" },
  { title: "" },
];

export function TradesTable() {
  const rows: [string, string, string, string, boolean, string, string, string, string][] = [
    [
      "Market Decrease",
      "yesterday at 7:20 PM",
      "SOL",
      "SOL/USD",
      false,
      "-$749,116.72",
      "$121.4391",
      "+$168,490.10",
      "-$7,119.98",
    ],
    ["Limit Increase", "21 Oct 2026, 09:45", "BTC", "BTC/USD", true, "+$1,256,227.85", "$78,528.91", "-", "-$1,256.23"],
    ["Stop-Loss", "18 Oct 2026, 14:02", "ETH", "ETH/USD", true, "-$72,025.97", "$2,105.00", "-$4,812.40", "-$72.03"],
  ];

  return (
    <DemoTable
      minWidth="min-w-[860px]"
      columns={TRADES_COLUMNS}
      rows={rows.map(([action, time, symbol, market, isLong, size, price, rpnl, fees]) => [
        <TwoLines key="action" sub={time}>
          <span>{action}</span>
        </TwoLines>,
        <Market key="market" symbol={symbol} name={market} isLong={isLong} />,
        <Value key="size">{size}</Value>,
        <Value key="price" tip="Execution price">
          {price}
        </Value>,
        <Value key="rpnl" tone={rpnl === "-" ? undefined : rpnl.startsWith("-") ? "negative" : "positive"}>
          {rpnl}
        </Value>,
        <Value key="fees">{fees}</Value>,
        <IconAction key="link" label="Open transaction" icon={NewLinkIcon} />,
      ])}
    />
  );
}

const CLAIMS_COLUMNS: Column[] = [{ title: "Action" }, { title: "Market" }, { title: "Size" }];

export function ClaimsTable() {
  const rows: [string, string, string, string, string][] = [
    ["Claimed funding fees", "yesterday at 7:40 PM", "SOL", "SOL/USD", "$69,763.59"],
    ["Claimed funding fees", "18 Oct 2026, 09:21", "BTC", "BTC/USD", "$5,753.00"],
    ["Settled funding fees", "12 Oct 2026, 16:30", "ETH", "ETH/USD", "$312.48"],
  ];

  return (
    <DemoTable
      minWidth="min-w-[640px]"
      columns={CLAIMS_COLUMNS}
      rows={rows.map(([action, time, symbol, market, size]) => [
        <TwoLines key="action" sub={time}>
          <span>{action}</span>
        </TwoLines>,
        <Market key="market" symbol={symbol} name={market} />,
        <Value key="size" tip="Claimed amount">
          {size}
        </Value>,
      ])}
    />
  );
}

// Small rising line for the Snapshot column
function Snapshot({ points, negative }: { points: string; negative?: boolean }) {
  return (
    <svg
      width="88"
      height="32"
      viewBox="0 0 120 32"
      preserveAspectRatio="none"
      className={negative ? "text-red-strong" : "text-green-strong"}
      aria-hidden
    >
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

// The labels after a pool name, as in the app (UsdgPoolBadges in newer code)
type PoolBadge = "launchBoost" | "whitelistOnly";

// Symbol, name, pair, TVL, supply, fee APY, performance, snapshot points, labels
type PoolRow = [string, string, string, string, string, string, string, string, PoolBadge[]?];

// Same look as the app's, with a 16px line (rows keep their height) and a 4px gap instead of 3
function LaunchBoostBadge() {
  return (
    <TooltipWithPortal
      as="span"
      variant="none"
      className="text-body-small inline-flex items-center gap-4 rounded-4 bg-blue-backgroundOpacity px-6 py-2 font-medium text-blue-strong"
      content="Extra yield for liquidity providers during the launch, paid into the vault price, so there's nothing to claim."
    >
      <img className="h-10" src={sparkleIcon} alt="" />
      Launch boost
    </TooltipWithPortal>
  );
}

// nowrap: in the app the label breaks into two lines
function WhitelistOnlyBadge({ isVault }: { isVault: boolean }) {
  return (
    <TooltipWithPortal
      as="div"
      variant="none"
      className="flex"
      content={
        isVault
          ? "Only whitelisted addresses can deposit into this vault"
          : "Direct deposits into this pool are open to whitelisted addresses"
      }
    >
      <Badge className="whitespace-nowrap">Whitelist only</Badge>
    </TooltipWithPortal>
  );
}

const POOL_ROWS: PoolRow[] = [
  [
    "BTC",
    "BTC/USD",
    "[BTC-USDC]",
    "$57.04m",
    "(23.06m GM)",
    "4.01%",
    "10.51%",
    "0,26 20,24 40,25 60,18 80,16 100,10 120,8",
  ],
  [
    "ETH",
    "ETH/USD",
    "[WETH-USDC]",
    "$46.73m",
    "(25.73m GM)",
    "6.74%",
    "16.12%",
    "0,28 20,22 40,23 60,15 80,14 100,9 120,4",
  ],
  [
    "GLV",
    "GLV",
    "[BTC-USDC]",
    "$12.05m",
    "(7.91m GLV)",
    "8.44%",
    "14.38%",
    "0,24 20,25 40,20 60,21 80,13 100,12 120,6",
  ],
];

export function PoolsTable({
  rows = POOL_ROWS,
  nameColumn = "Pool",
  ...rowStyle
}: {
  rows?: PoolRow[];
  // "Vault" for the GLV vaults table
  nameColumn?: string;
} & RowStyle) {
  const columns = useMemo<Column[]>(
    () => [
      { title: nameColumn, className: "min-w-[160px]" },
      { title: "TVL (supply)", sort: "unspecified" },
      { title: "Balance", sort: "unspecified" },
      { title: "Fee APY", info: true, sort: "unspecified" },
      { title: "Annualized performance", info: true, sort: "unspecified" },
      { title: "Snapshot", tooltip: true },
      { title: "" },
    ],
    [nameColumn]
  );

  return (
    <DemoTable
      {...rowStyle}
      minWidth="min-w-[860px]"
      columns={columns}
      rows={rows.map(([symbol, name, pair, tvl, supply, feeApy, performance, points, badges = []]) => [
        <div key="pool" className="flex items-center gap-8">
          <TokenIcon symbol={symbol} displaySize={32} className={TOKEN_ICON_CLASSNAME} />
          <TwoLines sub={pair}>
            <span className="flex items-center gap-8">
              {name}
              {badges.includes("launchBoost") && <LaunchBoostBadge />}
              {badges.includes("whitelistOnly") && <WhitelistOnlyBadge isVault={symbol === "GLV"} />}
            </span>
          </TwoLines>
        </div>,
        <TwoLines key="tvl" sub={supply}>
          <Value>{tvl}</Value>
        </TwoLines>,
        <Value key="balance" tone="secondary">
          -
        </Value>,
        <Value key="feeApy">{feeApy}</Value>,
        <Value key="performance">{performance}</Value>,
        <Snapshot key="snapshot" points={points} negative={performance.startsWith("-")} />,
        <Button key="details" variant="secondary" size="small">
          Details
        </Button>,
      ])}
    />
  );
}

const MARKETS_COLUMNS: Column[] = [
  { title: "Markets" },
  { title: "Price", sort: "unspecified" },
  { title: "TVL", sort: "unspecified" },
  { title: "Liquidity", sort: "unspecified" },
  { title: "Net rate / 1h", tooltip: true },
  { title: "Utilization", sort: "unspecified" },
];

export function MarketsTable() {
  const rows: [string, string, string, string, string, string, string, string][] = [
    ["BTC", "BTC/USD", "$76,903.58", "$72.74m", "$215.74m", "-0.0009%", "+0.4538%", "10.89%"],
    ["ETH", "ETH/USD", "$2,230.10", "$64.20m", "$149.57m", "-0.0009%", "+0.0030%", "11.82%"],
    ["SOL", "SOL/USD", "$94.7369", "$5.81m", "$20.53m", "+0.0063%", "+0.0035%", "9.19%"],
  ];

  return (
    <DemoTable
      minWidth="min-w-[860px]"
      columns={MARKETS_COLUMNS}
      rows={rows.map(([symbol, market, price, tvl, liquidity, longRate, shortRate, utilization]) => [
        <Market key="market" symbol={symbol} name={market} />,
        <Value key="price">{price}</Value>,
        <Value key="tvl">{tvl}</Value>,
        <Value key="liquidity">{liquidity}</Value>,
        <span key="netRate" className="numbers">
          <span className={longRate.startsWith("-") ? "negative" : "positive"}>{longRate}</span>
          <span className="text-textIcon-secondary"> / </span>
          <span className={shortRate.startsWith("-") ? "negative" : "positive"}>{shortRate}</span>
        </span>,
        <Value key="utilization">{utilization}</Value>,
      ])}
    />
  );
}

const REFERRAL_CODES_COLUMNS: Column[] = [
  { title: "Referral code" },
  { title: "Total volume" },
  { title: "Traders referred", tooltip: true },
  { title: "Total rebates" },
  { title: "" },
];

export function ReferralCodesTable() {
  const rows: [string, string, string, string][] = [
    ["alpha", "$842,310.55", "24", "$1,684.62"],
    ["satoshi-fan", "$312,904.12", "9", "$625.81"],
    ["gmx-weekly", "$96,480.30", "4", "$192.96"],
  ];

  return (
    <DemoTable
      minWidth="min-w-[720px]"
      columns={REFERRAL_CODES_COLUMNS}
      rows={rows.map(([code, volume, traders, rebates]) => [
        <span key="code">{code}</span>,
        <Value key="volume">{volume}</Value>,
        <Value key="traders">{traders}</Value>,
        <Value key="rebates">{rebates}</Value>,
        <div key="actions" className="flex justify-end gap-16">
          <button type="button" className="flex items-center gap-4 text-textIcon-secondary hover:text-textIcon-primary">
            Copy <CopyIcon className="size-16" />
          </button>
          <button type="button" className="flex items-center gap-4 text-textIcon-secondary hover:text-textIcon-primary">
            Share <ShareIcon className="size-16" />
          </button>
        </div>,
      ])}
    />
  );
}

// The full leaderboard card (Experiment tab): 20 made-up rows per page, PnL going down
const LEADERBOARD_PAGE_SIZE = 20;
const LEADERBOARD_PAGE_COUNT = 3;

const hex4 = (value: number) => (value % 0x10000).toString(16).padStart(4, "0");
const usd = (value: number) =>
  `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function makeAddressRows(count: number): AddressRow[] {
  return Array.from({ length: count }, (_, index) => {
    const wins = 12 + ((index * 53) % 480);
    return [
      fakeAddress(hex4(0x3fa1 + index * 0x2b7), hex4(0x7b2e + index * 0x1d3)),
      `+${usd(8_263_048.3 * 0.84 ** index)}`,
      `+${(48.17 + ((index * 37) % 320)).toFixed(2)}%`,
      usd(186_000 + ((index * 734_117) % 15_000_000)),
      (2 + ((index * 3.71) % 22)).toFixed(2),
      wins,
      Math.floor(wins * 0.72),
    ];
  });
}

const POSITION_MARKETS: [string, string, number][] = [
  ["SOL", "SOL/USD", 237.0092],
  ["ETH", "ETH/USD", 3425.43],
  ["LINK", "LINK/USD", 19.2036],
  ["BTC", "BTC/USD", 84123.22],
];

function makePositionRows(count: number): PositionRow[] {
  return Array.from({ length: count }, (_, index) => {
    const [symbol, market, price] = POSITION_MARKETS[index % POSITION_MARKETS.length];
    const isLong = index % 3 === 1;
    const entry = price * (1 + (((index * 7) % 10) - 5) / 100);
    return [
      fakeAddress(hex4(0x9b2c + index * 0x31d), hex4(0x4e1d + index * 0x2a9)),
      `+${usd(1_070_474.66 * 0.8 ** index)}`,
      symbol,
      market,
      isLong,
      usd(entry),
      usd(46_000 + ((index * 412_377) % 2_800_000)),
      (0.6 + ((index * 1.37) % 17)).toFixed(2),
      usd(entry * (isLong ? 0.8 : 1.2)),
    ];
  });
}

const FULL_ADDRESS_ROWS = makeAddressRows(LEADERBOARD_PAGE_SIZE);
const FULL_POSITION_ROWS = makePositionRows(LEADERBOARD_PAGE_SIZE);

type LeaderboardView = "addresses" | "positions";

const LEADERBOARD_VIEWS: { label: string; value: LeaderboardView }[] = [
  { label: "Top addresses", value: "addresses" },
  { label: "Top positions", value: "positions" },
];

/**
 * The whole leaderboard card as in the app: tabs and search, 20 rows, pagination. Search filters by address.
 */
export function LeaderboardCard(rowStyle: RowStyle) {
  const [view, setView] = useState<LeaderboardView>("addresses");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const query = search.trim().toLowerCase();
  const matches = ([address]: AddressRow | PositionRow) => address.toLowerCase().includes(query);

  return (
    <div className="rounded-8 bg-fill-surfaceBase">
      <div className="flex items-center justify-between gap-16 border-b-1/2 border-stroke-primary p-20 max-md:flex-col">
        <Tabs
          type="inline"
          options={LEADERBOARD_VIEWS}
          selectedValue={view}
          onChange={setView}
          className="max-md:w-full"
          regularOptionClassname="grow"
        />
        <SearchInput
          placeholder="Search address"
          className="w-full max-w-[260px]"
          value={search}
          setValue={setSearch}
        />
      </div>
      {view === "addresses" ? (
        <TopAddressesTable rows={FULL_ADDRESS_ROWS.filter(matches)} {...rowStyle} />
      ) : (
        <TopPositionsTable rows={FULL_POSITION_ROWS.filter(matches)} {...rowStyle} />
      )}
      <BottomTablePagination page={page} pageCount={LEADERBOARD_PAGE_COUNT} onPageChange={setPage} />
    </div>
  );
}

// The Pools page (Experiment 2): TVL header, GLV vaults and GM pools cards with made-up numbers

// A made-up 7-point line for the Snapshot column, rising or falling
const sparkline = (seed: number, rising: boolean) =>
  Array.from({ length: 7 }, (_, index) => {
    const trend = rising ? 26 - index * 3 : 8 + index * 3;
    const wobble = ((seed * 7 + index * 13) % 7) - 3;
    return `${index * 20},${Math.max(2, Math.min(30, trend + wobble))}`;
  }).join(" ");

const GLV_ROWS: PoolRow[] = [
  ["GLV", "GLV", "[USDG-USDG]", "$13.04m", "(12.96m GLV)", "12.50%", "7.18%", sparkline(13, true), ["launchBoost"]],
  ["GLV", "GLV", "[WETH-USDC]", "$14.36m", "(10.81m GLV)", "11.96%", "22.79%", sparkline(1, true)],
  ["GLV", "GLV", "[BTC-USDC]", "$12.51m", "(8.17m GLV)", "8.31%", "14.10%", sparkline(2, true)],
];

const GM_ROWS: PoolRow[] = [
  ["BTC", "BTC/USD", "[BTC-USDC]", "$57.50m", "(23.11m GM)", "3.92%", "10.63%", sparkline(3, true)],
  ["ETH", "ETH/USD", "[WETH-USDC]", "$47.93m", "(26.16m GM)", "6.58%", "14.92%", sparkline(4, true)],
  ["ETH", "ETH/USD", "[WETH-WETH]", "$14.85m", "(19.11m GM)", "7.71%", "-4.31%", sparkline(5, false)],
  ["BTC", "BTC/USD", "[USDG-USDG]", "$5.81m", "(5.74m GM)", "5.22%", "2.73%", sparkline(14, true), ["whitelistOnly"]],
  ["ETH", "ETH/USD", "[USDG-USDG]", "$2.69m", "(2.68m GM)", "5.32%", "3.41%", sparkline(15, true), ["whitelistOnly"]],
  ["SOL", "SOL/USD", "[SOL-USDC]", "$8.86m", "(4.37m GM)", "7.87%", "25.87%", sparkline(7, true)],
  ["LTC", "LTC/USD", "[WETH-USDC]", "$6.12m", "(3.95m GM)", "18.51%", "57.29%", sparkline(8, true)],
  ["UNI", "UNI/USD", "[UNI-USDC]", "$4.48m", "(2.88m GM)", "9.46%", "68.75%", sparkline(9, true)],
  ["LINK", "LINK/USD", "[LINK-USDC]", "$3.97m", "(2.31m GM)", "8.10%", "34.75%", sparkline(10, true)],
];

const TIME_RANGES = [
  { label: "Last 30d", value: "30d" },
  { label: "Last 90d", value: "90d" },
  { label: "Last 180d", value: "180d" },
  { label: "Total", value: "total" },
];

const POOL_FILTERS = [
  { label: "All", value: "all" },
  { label: "Favourites", value: "favourites" },
  { label: "Crypto", value: "crypto" },
  { label: "TradFi", value: "tradfi" },
];

/**
 * The Pools page as in the app, built from the shared table parts. Search filters GM pools by name.
 */
export function PoolsPage(rowStyle: RowStyle) {
  const [timeRange, setTimeRange] = useState("90d");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const query = search.trim().toLowerCase();

  return (
    <div className="flex flex-col gap-16">
      <div className="flex items-end justify-between gap-16 max-md:flex-col max-md:items-start">
        <div className="flex flex-col gap-4">
          <span className="text-h1 numbers">$155,880,309</span>
          <span className="text-body-medium text-textIcon-secondary">TVL in vaults and pools</span>
        </div>
        <Tabs type="inline" options={TIME_RANGES} selectedValue={timeRange} onChange={setTimeRange} />
      </div>

      <PoolsCard
        title="GLV vaults"
        description="Yield-optimized vaults supplying liquidity across multiple GMX markets"
      >
        <PoolsTable rows={GLV_ROWS} nameColumn="Vault" {...rowStyle} />
      </PoolsCard>

      <PoolsCard
        title="GM pools"
        description={
          <div className="flex flex-col gap-16">
            Liquidity pools for specific GMX markets with single-asset and native asset options
            <div className="flex flex-wrap items-center justify-between gap-12">
              <Tabs type="inline" options={POOL_FILTERS} selectedValue={filter} onChange={setFilter} />
              <SearchInput
                className="w-full md:max-w-[260px]"
                value={search}
                setValue={setSearch}
                placeholder="Search pools"
              />
            </div>
          </div>
        }
        bottom={<BottomTablePagination page={page} pageCount={4} onPageChange={setPage} className="!p-0" />}
      >
        <PoolsTable rows={GM_ROWS.filter(([, name]) => name.toLowerCase().includes(query))} {...rowStyle} />
      </PoolsCard>
    </div>
  );
}
