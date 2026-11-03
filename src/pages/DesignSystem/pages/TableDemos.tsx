import cx from "classnames";
import { ReactNode, useMemo, useState } from "react";

import type { SortDirection } from "context/SorterContext/types";

import AddressView from "components/AddressView/AddressView";
import Badge from "components/Badge/Badge";
import Button from "components/Button/Button";
import Checkbox from "components/Checkbox/Checkbox";
import { Sorter } from "components/Sorter/Sorter";
import { Table, TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";
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

function DemoTable({ columns, rows, minWidth }: { columns: Column[]; rows: ReactNode[][]; minWidth: string }) {
  return (
    <div className="overflow-x-auto">
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
            <TableTr key={rowIndex} hoverable>
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

export function TopAddressesTable({ rows = TOP_ADDRESS_ROWS }: { rows?: AddressRow[] }) {
  return (
    <DemoTable
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

export function TopPositionsTable({ rows = TOP_POSITION_ROWS }: { rows?: PositionRow[] }) {
  return (
    <DemoTable
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

export function PoolsTable() {
  const columns = useMemo<Column[]>(
    () => [
      { title: "Pool", className: "min-w-[160px]" },
      { title: "TVL (supply)", sort: "unspecified" },
      { title: "Balance", sort: "unspecified" },
      { title: "Fee APY", info: true, sort: "unspecified" },
      { title: "Annualized performance", info: true, sort: "unspecified" },
      { title: "Snapshot", tooltip: true },
      { title: "" },
    ],
    []
  );

  return (
    <DemoTable
      minWidth="min-w-[860px]"
      columns={columns}
      rows={POOL_ROWS.map(([symbol, name, pair, tvl, supply, feeApy, performance, points, badges = []]) => [
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
