import cx from "classnames";
import { format } from "date-fns";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { getExplorerUrl } from "config/chains";
import type { SortDirection } from "context/SorterContext/types";

import AppPageLayout from "components/AppPageLayout/AppPageLayout";
import Card from "components/Card/Card";
import { DropdownSelector } from "components/DropdownSelector/DropdownSelector";
import NumberInput from "components/NumberInput/NumberInput";
import { BottomTablePagination } from "components/Pagination/BottomTablePagination";
import usePagination from "components/Pagination/usePagination";
import { Sorter, useSorterHandlers } from "components/Sorter/Sorter";
import { Table, TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";
import { TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";
import Tabs from "components/Tabs/Tabs";

import rawDatasets from "./gmxExecutionCostsData.json";
import type { GmxExecutionCostDataset, GmxExecutionCostRow } from "./types";

const DATASETS = rawDatasets as GmxExecutionCostDataset[];

type PhaseFilter = "all" | "increase" | "decrease";
type SideFilter = "all" | "long" | "short";
type TablePreset = "all" | "rebates" | "absolute";
type TableSortField =
  | "timestamp"
  | "marketName"
  | "phase"
  | "side"
  | "sizeUsd"
  | "protocolCostBps"
  | "positionFeeBps"
  | "netImpactCostBps"
  | "swapCostBps"
  | "delaySeconds";
type TableOrderBy = TableSortField | "unspecified";

type HistogramBin = {
  midpoint: number;
  from: number;
  to: number;
  count: number;
};

type ComponentGroup = {
  label: string;
  fee: number;
  impact: number;
  swap: number;
  spread: number;
  holding: number;
};

type RangeGroup = {
  label: string;
  count: number;
  p10: number;
  p25: number;
  median: number;
  p75: number;
  p90: number;
};

type TooltipPayload<TPayload> = {
  payload: TPayload;
  name?: string;
  value?: number;
  dataKey?: string;
};

type SelectOption<TValue extends string> = {
  label: string;
  value: TValue;
};

const PHASE_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Increases", value: "increase" },
  { label: "Decreases", value: "decrease" },
] satisfies { label: string; value: PhaseFilter }[];

const SIDE_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Long", value: "long" },
  { label: "Short", value: "short" },
] satisfies { label: string; value: SideFilter }[];

const TABLE_PRESET_OPTIONS = [
  { label: "All Fills", value: "all" },
  { label: "Rebates Only", value: "rebates" },
  { label: "Absolute Moves", value: "absolute" },
] satisfies { label: string; value: TablePreset }[];

const TABLE_PAGE_SIZE = 25;

const TABLE_COLUMNS = [
  { field: "timestamp", label: "Time", style: { width: "11%" } },
  { field: "marketName", label: "Market", style: { width: "17%" } },
  { field: "phase", label: "Phase", style: { width: "8%" } },
  { field: "side", label: "Side", style: { width: "7%" } },
  { field: "sizeUsd", label: "Size", style: { width: "12%" }, align: "right" },
  { field: "protocolCostBps", label: "Protocol", style: { width: "10%" }, align: "right" },
  { field: "positionFeeBps", label: "Fee", style: { width: "8%" }, align: "right" },
  { field: "netImpactCostBps", label: "Impact", style: { width: "9%" }, align: "right" },
  { field: "swapCostBps", label: "Swap", style: { width: "7%" }, align: "right" },
  { field: "delaySeconds", label: "Delay", style: { width: "6%" }, align: "right" },
] satisfies { field: TableSortField; label: string; style: React.CSSProperties; align?: "right" }[];

const TX_COLUMN_STYLE = { width: "5%" };

const CHART_MARGIN = { top: 16, right: 12, bottom: 8, left: 4 };

const TICK_PROPS: React.SVGProps<SVGTextElement> = {
  fill: "var(--color-slate-500)",
  fontSize: 12,
  fontWeight: 500,
};

const GRID_PROPS = {
  vertical: false,
  strokeDasharray: "1.5 8",
  strokeWidth: 0.5,
  stroke: "var(--color-stroke-primary)",
};

const CURSOR_PROPS = {
  stroke: "var(--color-slate-500)",
  strokeWidth: 1,
  strokeDasharray: "2 2",
};

function pickDefaultDatasetId() {
  const largeLongWindow = DATASETS.find((dataset) => {
    const days = (dataset.summary.to - dataset.summary.from) / 86_400;
    return dataset.summary.minSizeUsd >= 1_000_000 && days >= 29;
  });

  if (largeLongWindow) {
    return largeLongWindow.id;
  }

  return [...DATASETS].sort((a, b) => {
    const durationDiff = b.summary.to - b.summary.from - (a.summary.to - a.summary.from);
    if (durationDiff !== 0) {
      return durationDiff;
    }

    return (b.summary.minSizeUsd || 0) - (a.summary.minSizeUsd || 0);
  })[0]?.id;
}

function quantile(values: number[], q: number) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) {
    return null;
  }

  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const next = sorted[base + 1];

  if (next === undefined) {
    return sorted[base];
  }

  return sorted[base] + rest * (next - sorted[base]);
}

function median(values: number[]) {
  return quantile(values, 0.5);
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + (Number.isFinite(value) ? value : 0), 0);
}

function niceDomain(values: number[], includeZero = true): [number, number] {
  const finiteValues = values.filter(Number.isFinite);

  if (!finiteValues.length) {
    return [0, 1];
  }

  let min = Math.min(...finiteValues);
  let max = Math.max(...finiteValues);

  if (includeZero) {
    min = Math.min(min, 0);
    max = Math.max(max, 0);
  }

  if (min === max) {
    return [min - 1, max + 1];
  }

  const pad = (max - min) * 0.08;
  return [min - pad, max + pad];
}

function formatNumber(value: number | null | undefined, maximumFractionDigits = 2) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "-";
  }

  return value.toLocaleString(undefined, { maximumFractionDigits });
}

function formatSeconds(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "-";
  }

  return `${formatNumber(value, 1)}s`;
}

function formatBps(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "-";
  }

  return `${formatNumber(value, 2)} bps`;
}

function formatUsd(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "-";
  }

  const abs = Math.abs(value);
  const prefix = value < 0 ? "-$" : "$";

  if (abs >= 1_000_000) {
    return `${prefix}${formatNumber(abs / 1_000_000, 2)}m`;
  }

  if (abs >= 1_000) {
    return `${prefix}${formatNumber(abs / 1_000, 1)}k`;
  }

  return `${prefix}${formatNumber(abs, 0)}`;
}

function formatDateTime(timestamp: number) {
  return format(new Date(timestamp * 1000), "MMM d, HH:mm");
}

function formatChartDate(timestamp: number) {
  return format(new Date(timestamp * 1000), "MMM d");
}

function formatChartDateTime(timestamp: number) {
  return format(new Date(timestamp * 1000), "MMM d HH:mm");
}

function formatLogSize(value: number) {
  return formatUsd(10 ** value);
}

function getMarkets(dataset: GmxExecutionCostDataset) {
  return Array.from(new Set(dataset.rows.map((row) => row.marketName))).sort();
}

function getProtocolCostValues(rows: GmxExecutionCostRow[]) {
  return rows.map((row) => row.protocolCostBps).filter((value): value is number => value !== null && isFinite(value));
}

function getFilteredRows({
  dataset,
  phase,
  side,
  market,
  minSizeUsd,
}: {
  dataset: GmxExecutionCostDataset;
  phase: PhaseFilter;
  side: SideFilter;
  market: string;
  minSizeUsd: number;
}) {
  return dataset.rows.filter((row) => {
    if (phase !== "all" && row.phase !== phase) {
      return false;
    }

    if (side !== "all" && row.side !== side) {
      return false;
    }

    if (market !== "all" && row.marketName !== market) {
      return false;
    }

    if (row.sizeUsd < minSizeUsd) {
      return false;
    }

    return row.protocolCostBps !== null && Number.isFinite(row.protocolCostBps);
  });
}

function makeHistogram(rows: GmxExecutionCostRow[]) {
  const values = getProtocolCostValues(rows);

  if (values.length < 2) {
    return { bins: [] as HistogramBin[], domain: [0, 1] as [number, number] };
  }

  const domain = niceDomain(values, true);
  const [min, max] = domain;
  const binCount = Math.min(32, Math.max(8, Math.round(Math.sqrt(values.length) * 2)));
  const bins = Array.from({ length: binCount }, (_, index) => {
    const from = min + ((max - min) * index) / binCount;
    const to = min + ((max - min) * (index + 1)) / binCount;

    return {
      from,
      to,
      midpoint: (from + to) / 2,
      count: 0,
    };
  });

  for (const value of values) {
    const index = Math.max(0, Math.min(binCount - 1, Math.floor(((value - min) / (max - min)) * binCount)));
    bins[index].count++;
  }

  return { bins, domain };
}

function makeRangeGroups(rows: GmxExecutionCostRow[]): RangeGroup[] {
  const groups = [
    { label: "Increase Long", test: (row: GmxExecutionCostRow) => row.phase === "increase" && row.side === "long" },
    { label: "Increase Short", test: (row: GmxExecutionCostRow) => row.phase === "increase" && row.side === "short" },
    { label: "Decrease Long", test: (row: GmxExecutionCostRow) => row.phase === "decrease" && row.side === "long" },
    { label: "Decrease Short", test: (row: GmxExecutionCostRow) => row.phase === "decrease" && row.side === "short" },
  ];

  return groups
    .map((group) => {
      const values = getProtocolCostValues(rows.filter(group.test));

      if (!values.length) {
        return undefined;
      }

      return {
        label: group.label,
        count: values.length,
        p10: quantile(values, 0.1) ?? 0,
        p25: quantile(values, 0.25) ?? 0,
        median: quantile(values, 0.5) ?? 0,
        p75: quantile(values, 0.75) ?? 0,
        p90: quantile(values, 0.9) ?? 0,
      };
    })
    .filter(Boolean) as RangeGroup[];
}

function makeComponentGroups(rows: GmxExecutionCostRow[]): ComponentGroup[] {
  const groups = [
    { label: "All", test: () => true },
    { label: "Increase", test: (row: GmxExecutionCostRow) => row.phase === "increase" },
    { label: "Decrease", test: (row: GmxExecutionCostRow) => row.phase === "decrease" },
    { label: "Long", test: (row: GmxExecutionCostRow) => row.side === "long" },
    { label: "Short", test: (row: GmxExecutionCostRow) => row.side === "short" },
  ];

  return groups
    .map((group) => {
      const groupRows = rows.filter(group.test);

      if (!groupRows.length) {
        return undefined;
      }

      return {
        label: group.label,
        fee: median(groupRows.map((row) => row.positionFeeBps).filter(Number.isFinite)) ?? 0,
        impact: median(groupRows.map((row) => row.netImpactCostBps).filter(Number.isFinite)) ?? 0,
        swap: median(groupRows.map((row) => row.swapCostBps).filter(Number.isFinite)) ?? 0,
        spread: median(groupRows.map((row) => row.oracleSpreadBps ?? 0).filter(Number.isFinite)) ?? 0,
        holding: median(groupRows.map((row) => row.holdingFeeBps).filter(Number.isFinite)) ?? 0,
      };
    })
    .filter(Boolean) as ComponentGroup[];
}

function getRangePosition(value: number, domain: [number, number]) {
  const [min, max] = domain;

  if (max === min) {
    return 50;
  }

  return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayload<GmxExecutionCostRow | HistogramBin | ComponentGroup>[];
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const item = payload[0].payload;

  if ("orderKey" in item) {
    return (
      <div className="text-body-small rounded-8 border border-stroke-primary bg-slate-900 p-12 shadow-lg">
        <div className="mb-6 text-typography-secondary">{formatDateTime(item.timestamp)}</div>
        <div className="numbers">{formatUsd(item.sizeUsd)}</div>
        <div>
          {item.phase} {item.side}
        </div>
        <div className="mt-6 text-typography-secondary">
          Protocol: <span className="text-typography-primary numbers">{formatBps(item.protocolCostBps)}</span>
        </div>
        <div className="text-typography-secondary">
          Fee: <span className="text-typography-primary numbers">{formatBps(item.positionFeeBps)}</span>
        </div>
        <div className="text-typography-secondary">
          Impact: <span className="text-typography-primary numbers">{formatBps(item.netImpactCostBps)}</span>
        </div>
        <div className="text-typography-secondary">
          Swap: <span className="text-typography-primary numbers">{formatBps(item.swapCostBps)}</span>
        </div>
      </div>
    );
  }

  if ("count" in item) {
    return (
      <div className="text-body-small rounded-8 border border-stroke-primary bg-slate-900 p-12 shadow-lg">
        <div className="text-typography-secondary">
          {formatBps(item.from)} to {formatBps(item.to)}
        </div>
        <div className="numbers">{item.count} fills</div>
      </div>
    );
  }

  return (
    <div className="text-body-small rounded-8 border border-stroke-primary bg-slate-900 p-12 shadow-lg">
      <div className="mb-6 text-typography-secondary">{item.label}</div>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex justify-between gap-20">
          <span className="capitalize text-typography-secondary">{entry.name ?? entry.dataKey}</span>
          <span className="numbers">{formatBps(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

function KpiCard({ label, value, subtext }: { label: string; value: string; subtext: string }) {
  return (
    <div className="rounded-8 bg-slate-900 p-16">
      <div className="text-body-small font-medium text-typography-secondary">{label}</div>
      <div className="mt-4 text-24 font-medium text-typography-primary numbers">{value}</div>
      <div className="text-body-small mt-4 text-typography-secondary">{subtext}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <span className="text-body-small font-medium text-typography-secondary">{label}</span>
      {children}
    </div>
  );
}

function ResearchDropdown<TValue extends string>({
  value,
  onChange,
  options,
}: {
  value: TValue;
  onChange: (value: TValue) => void;
  options: SelectOption<TValue>[];
}) {
  const selected = options.find((option) => option.value === value);
  const renderOption = ({ option }: { option: SelectOption<TValue> }) => (
    <span className="block truncate text-typography-primary">{option.label}</span>
  );

  return (
    <DropdownSelector<string, SelectOption<TValue>>
      value={value}
      onChange={(nextValue) => onChange(nextValue as TValue)}
      options={options}
      itemKey={(option) => option.value}
      item={renderOption}
      button={<span className="block min-w-0 truncate text-typography-primary">{selected?.label ?? value}</span>}
    />
  );
}

function EmptyChart() {
  return <div className="text-body-medium grid h-[280px] place-items-center text-typography-secondary">No fills</div>;
}

function HistogramChart({ rows }: { rows: GmxExecutionCostRow[] }) {
  const { bins, domain } = useMemo(() => makeHistogram(rows), [rows]);

  if (!bins.length) {
    return <EmptyChart />;
  }

  return (
    <div className="h-[280px]">
      <ResponsiveContainer width="100%" height="100%" debounce={500}>
        <BarChart data={bins} margin={CHART_MARGIN}>
          <CartesianGrid {...GRID_PROPS} />
          <ReferenceArea x1={12} x2={17} fill="var(--color-yellow-500)" fillOpacity={0.12} />
          <XAxis
            type="number"
            dataKey="midpoint"
            domain={domain}
            tickFormatter={(value: number) => formatNumber(value, 1)}
            tick={TICK_PROPS}
            tickLine={false}
            axisLine={false}
          />
          <YAxis tick={TICK_PROPS} tickLine={false} axisLine={false} allowDecimals={false} width={42} />
          <Tooltip cursor={CURSOR_PROPS} content={<ChartTooltip />} />
          <Bar dataKey="count" fill="var(--color-blue-300)" radius={1} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function RangeRows({ rows }: { rows: GmxExecutionCostRow[] }) {
  const groups = useMemo(() => makeRangeGroups(rows), [rows]);
  const domain = useMemo(
    () =>
      niceDomain(
        groups.flatMap((group) => [group.p10, group.p90]),
        true
      ),
    [groups]
  );

  if (!groups.length) {
    return <EmptyChart />;
  }

  return (
    <div className="flex h-[280px] flex-col justify-center gap-18 px-8">
      {groups.map((group) => (
        <RangeDistributionRow key={group.label} group={group} domain={domain} />
      ))}
      <div className="grid grid-cols-[130px_1fr_42px] items-center gap-12">
        <div />
        <div className="text-body-small flex justify-between text-typography-secondary">
          <span>{formatBps(domain[0])}</span>
          <span>{formatBps(domain[1])}</span>
        </div>
      </div>
    </div>
  );
}

function RangeDistributionRow({ group, domain }: { group: RangeGroup; domain: [number, number] }) {
  const p10 = getRangePosition(group.p10, domain);
  const p25 = getRangePosition(group.p25, domain);
  const p50 = getRangePosition(group.median, domain);
  const p75 = getRangePosition(group.p75, domain);
  const p90 = getRangePosition(group.p90, domain);
  const whiskerStyle = useMemo<React.CSSProperties>(
    () => ({ left: `${p10}%`, width: `${Math.max(1, p90 - p10)}%` }),
    [p10, p90]
  );
  const boxStyle = useMemo<React.CSSProperties>(
    () => ({ left: `${p25}%`, width: `${Math.max(1, p75 - p25)}%` }),
    [p25, p75]
  );
  const medianStyle = useMemo<React.CSSProperties>(() => ({ left: `${p50}%`, transform: "translateX(-1px)" }), [p50]);

  return (
    <div className="grid grid-cols-[130px_1fr_42px] items-center gap-12">
      <div className="text-body-small text-typography-secondary">{group.label}</div>
      <div className="relative h-28 rounded-4 bg-slate-800">
        <div className="absolute top-1/2 h-1 -translate-y-1/2 bg-slate-400" style={whiskerStyle} />
        <div className="absolute top-4 h-20 rounded-4 border border-blue-300 bg-blue-300/20" style={boxStyle} />
        <div className="absolute top-2 h-24 w-2 rounded-2 bg-red-500" style={medianStyle} />
      </div>
      <div className="text-body-small text-right text-typography-secondary">n={group.count}</div>
    </div>
  );
}

function SizeScatterChart({ rows }: { rows: GmxExecutionCostRow[] }) {
  const data = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        logSizeUsd: Math.log10(Math.max(1, row.sizeUsd)),
      })),
    [rows]
  );

  const domainX = useMemo(
    () =>
      niceDomain(
        data.map((row) => row.logSizeUsd),
        false
      ),
    [data]
  );
  const domainY = useMemo(() => niceDomain(getProtocolCostValues(data), true), [data]);

  if (!rows.length) {
    return <EmptyChart />;
  }

  return (
    <div className="h-[320px]">
      <ResponsiveContainer width="100%" height="100%" debounce={500}>
        <ScatterChart margin={CHART_MARGIN}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis
            type="number"
            dataKey="logSizeUsd"
            domain={domainX}
            tickFormatter={formatLogSize}
            tick={TICK_PROPS}
            tickLine={false}
            axisLine={false}
            name="Size"
          />
          <YAxis
            type="number"
            dataKey="protocolCostBps"
            domain={domainY}
            tickFormatter={(value: number) => formatNumber(value, 1)}
            tick={TICK_PROPS}
            tickLine={false}
            axisLine={false}
            width={42}
            name="Protocol cost"
          />
          <Tooltip cursor={CURSOR_PROPS} content={<ChartTooltip />} />
          <Scatter data={data.filter((row) => row.phase === "increase")} fill="var(--color-blue-300)" />
          <Scatter data={data.filter((row) => row.phase === "decrease")} fill="var(--color-red-500)" />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

function ComponentsChart({ rows }: { rows: GmxExecutionCostRow[] }) {
  const data = useMemo(() => makeComponentGroups(rows), [rows]);

  if (!data.length) {
    return <EmptyChart />;
  }

  return (
    <div className="h-[320px]">
      <ResponsiveContainer width="100%" height="100%" debounce={500}>
        <BarChart data={data} margin={CHART_MARGIN} stackOffset="sign">
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey="label" tick={TICK_PROPS} tickLine={false} axisLine={false} />
          <YAxis
            tick={TICK_PROPS}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value: number) => formatNumber(value, 1)}
            width={42}
          />
          <ReferenceLine y={0} stroke="var(--color-slate-500)" strokeWidth={0.5} />
          <Tooltip cursor={CURSOR_PROPS} content={<ChartTooltip />} />
          <Bar dataKey="fee" name="fee" fill="var(--color-blue-300)" radius={1} />
          <Bar dataKey="impact" name="impact" fill="var(--color-red-500)" radius={1} />
          <Bar dataKey="swap" name="swap" fill="var(--color-green-300)" radius={1} />
          <Bar dataKey="spread" name="spread" fill="var(--color-yellow-500)" radius={1} />
          <Bar dataKey="holding" name="holding" fill="var(--color-slate-400)" radius={1} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function TimelineChart({ rows }: { rows: GmxExecutionCostRow[] }) {
  const domainX = useMemo(
    () =>
      niceDomain(
        rows.map((row) => row.timestamp),
        false
      ),
    [rows]
  );
  const domainY = useMemo(() => niceDomain(getProtocolCostValues(rows), true), [rows]);

  if (!rows.length) {
    return <EmptyChart />;
  }

  return (
    <div className="h-[280px]">
      <ResponsiveContainer width="100%" height="100%" debounce={500}>
        <ScatterChart margin={CHART_MARGIN}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis
            type="number"
            dataKey="timestamp"
            domain={domainX}
            tickFormatter={formatChartDate}
            tick={TICK_PROPS}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="number"
            dataKey="protocolCostBps"
            domain={domainY}
            tickFormatter={(value: number) => formatNumber(value, 1)}
            tick={TICK_PROPS}
            tickLine={false}
            axisLine={false}
            width={42}
          />
          <Tooltip cursor={CURSOR_PROPS} content={<ChartTooltip />} />
          <Scatter data={rows.filter((row) => row.phase === "increase")} fill="var(--color-blue-300)" />
          <Scatter data={rows.filter((row) => row.phase === "decrease")} fill="var(--color-red-500)" />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

function getTableSortValue(row: GmxExecutionCostRow, field: TableSortField) {
  switch (field) {
    case "timestamp":
      return row.timestamp;
    case "marketName":
      return row.marketName;
    case "phase":
      return row.phase;
    case "side":
      return row.side;
    case "sizeUsd":
      return row.sizeUsd;
    case "protocolCostBps":
      return row.protocolCostBps;
    case "positionFeeBps":
      return row.positionFeeBps;
    case "netImpactCostBps":
      return row.netImpactCostBps;
    case "swapCostBps":
      return row.swapCostBps;
    case "delaySeconds":
      return row.delaySeconds;
    default:
      return null;
  }
}

function compareTableRows(
  a: GmxExecutionCostRow,
  b: GmxExecutionCostRow,
  orderBy: TableOrderBy,
  direction: SortDirection,
  useAbsoluteValue: boolean
) {
  if (orderBy === "unspecified" || direction === "unspecified") {
    return b.timestamp - a.timestamp;
  }

  const rawA = getTableSortValue(a, orderBy);
  const rawB = getTableSortValue(b, orderBy);
  const valueA = useAbsoluteValue && typeof rawA === "number" ? Math.abs(rawA) : rawA;
  const valueB = useAbsoluteValue && typeof rawB === "number" ? Math.abs(rawB) : rawB;

  if (valueA === null || valueA === undefined) {
    return valueB === null || valueB === undefined ? b.timestamp - a.timestamp : 1;
  }

  if (valueB === null || valueB === undefined) {
    return -1;
  }

  const comparison =
    typeof valueA === "string" && typeof valueB === "string"
      ? valueA.localeCompare(valueB)
      : Number(valueA) - Number(valueB);

  if (comparison === 0) {
    return b.timestamp - a.timestamp;
  }

  return direction === "asc" ? comparison : -comparison;
}

function getTableRows(
  rows: GmxExecutionCostRow[],
  preset: TablePreset,
  orderBy: TableOrderBy,
  direction: SortDirection
) {
  const scopedRows =
    preset === "rebates" ? rows.filter((row) => row.protocolCostBps !== null && row.protocolCostBps < 0) : rows;
  const useAbsoluteValue = preset === "absolute" && orderBy === "protocolCostBps";

  return [...scopedRows].sort((a, b) => compareTableRows(a, b, orderBy, direction, useAbsoluteValue));
}

function ResearchTableHeaderCell({
  field,
  label,
  style,
  align,
  getSorterProps,
}: {
  field: TableSortField;
  label: string;
  style: React.CSSProperties;
  align?: "right";
  getSorterProps: (field: TableSortField) => { direction: SortDirection; onChange: (direction: SortDirection) => void };
}) {
  return (
    <TableTh padding="compact" style={style} className={cx({ "text-right": align === "right" })}>
      <Sorter {...getSorterProps(field)}>
        <span className="whitespace-nowrap">{label}</span>
      </Sorter>
    </TableTh>
  );
}

function ResearchFillsTable({
  rows,
  chainId,
  getSorterProps,
}: {
  rows: GmxExecutionCostRow[];
  chainId: number;
  getSorterProps: (field: TableSortField) => { direction: SortDirection; onChange: (direction: SortDirection) => void };
}) {
  const explorerUrl = getExplorerUrl(chainId);

  return (
    <TableScrollFadeContainer>
      <Table className="w-[max(100%,1180px)] table-fixed">
        <colgroup>
          {TABLE_COLUMNS.map((column) => (
            <col key={column.field} style={column.style} />
          ))}
          <col style={TX_COLUMN_STYLE} />
        </colgroup>
        <thead>
          <TableTheadTr>
            {TABLE_COLUMNS.map((column) => (
              <ResearchTableHeaderCell
                key={column.field}
                field={column.field}
                label={column.label}
                style={column.style}
                align={column.align}
                getSorterProps={getSorterProps}
              />
            ))}
            <TableTh padding="compact" style={TX_COLUMN_STYLE} className="text-right">
              Tx
            </TableTh>
          </TableTheadTr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <TableTr>
              <TableTd padding="compact" colSpan={11} className="text-center text-typography-secondary">
                No matching fills
              </TableTd>
            </TableTr>
          )}
          {rows.map((row) => (
            <TableTr key={row.orderKey + row.transactionHash} hoverable>
              <TableTd padding="compact" className="whitespace-nowrap numbers">
                {formatDateTime(row.timestamp)}
              </TableTd>
              <TableTd padding="compact" title={row.marketName} className="truncate whitespace-nowrap">
                {row.marketName}
              </TableTd>
              <TableTd padding="compact">
                <span
                  className={cx("text-body-small rounded-full px-8 py-4 capitalize", {
                    "bg-blue-300/10 text-blue-300": row.phase === "increase",
                    "bg-red-500/10 text-red-500": row.phase === "decrease",
                  })}
                >
                  {row.phase}
                </span>
              </TableTd>
              <TableTd padding="compact" className="capitalize">
                {row.side}
              </TableTd>
              <TableTd padding="compact" className="text-right numbers">
                {formatUsd(row.sizeUsd)}
              </TableTd>
              <TableTd
                padding="compact"
                className={cx("text-right numbers", {
                  "text-green-500": (row.protocolCostBps ?? 0) < 0,
                  "text-red-500": (row.protocolCostBps ?? 0) >= 12,
                })}
              >
                {formatBps(row.protocolCostBps)}
              </TableTd>
              <TableTd padding="compact" className="text-right numbers">
                {formatBps(row.positionFeeBps)}
              </TableTd>
              <TableTd
                padding="compact"
                className={cx("text-right numbers", {
                  "text-green-500": row.netImpactCostBps < 0,
                  "text-red-500": row.netImpactCostBps > 0,
                })}
              >
                {formatBps(row.netImpactCostBps)}
              </TableTd>
              <TableTd
                padding="compact"
                className={cx("text-right numbers", {
                  "text-green-500": row.swapCostBps < 0,
                  "text-red-500": row.swapCostBps > 0,
                })}
              >
                {formatBps(row.swapCostBps)}
              </TableTd>
              <TableTd padding="compact" className="text-right numbers">
                {formatSeconds(row.delaySeconds)}
              </TableTd>
              <TableTd padding="compact">
                <a
                  href={`${explorerUrl}tx/${row.transactionHash}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Open ${row.marketName} ${row.phase} transaction ${row.transactionHash}`}
                  className="hover:text-blue-200 text-blue-300"
                >
                  open
                </a>
              </TableTd>
            </TableTr>
          ))}
        </tbody>
      </Table>
    </TableScrollFadeContainer>
  );
}

export function GmxExecutionCostsPage() {
  const [datasetId, setDatasetId] = useState(() => pickDefaultDatasetId());
  const [phase, setPhase] = useState<PhaseFilter>("all");
  const [side, setSide] = useState<SideFilter>("all");
  const [market, setMarket] = useState("all");
  const [minSizeUsd, setMinSizeUsd] = useState(0);
  const [tablePreset, setTablePreset] = useState<TablePreset>("all");
  const { orderBy, direction, setOrderBy, setDirection } = useSorterHandlers<TableOrderBy>("gmx-execution-costs", {
    orderBy: "protocolCostBps",
    direction: "desc",
  });

  const dataset = useMemo(
    () => DATASETS.find((item) => item.id === datasetId) ?? DATASETS[0],
    [datasetId]
  ) as GmxExecutionCostDataset;

  const markets = useMemo(() => getMarkets(dataset), [dataset]);

  const rows = useMemo(
    () =>
      getFilteredRows({
        dataset,
        phase,
        side,
        market: markets.includes(market) ? market : "all",
        minSizeUsd,
      }),
    [dataset, market, markets, minSizeUsd, phase, side]
  );

  const protocolCosts = useMemo(() => getProtocolCostValues(rows), [rows]);
  const tableRows = useMemo(
    () => getTableRows(rows, tablePreset, orderBy, direction),
    [direction, orderBy, rows, tablePreset]
  );
  const paginationKey = `${dataset.id}:${phase}:${side}:${market}:${minSizeUsd}:${tablePreset}:${orderBy}:${direction}`;
  const {
    currentPage,
    currentData: visibleTableRows,
    pageCount,
    setCurrentPage,
  } = usePagination(paginationKey, tableRows, TABLE_PAGE_SIZE);
  const delays = useMemo(
    () =>
      rows.map((row) => row.delaySeconds).filter((value): value is number => value !== null && Number.isFinite(value)),
    [rows]
  );

  const datasetOptions = useMemo(() => DATASETS.map((item) => ({ label: item.label, value: item.id })), []);

  const marketOptions = useMemo(
    () => [
      { label: "All markets", value: "all" },
      ...markets.map((marketName) => ({ label: marketName, value: marketName })),
    ],
    [markets]
  );

  const dateLabel = `${formatChartDateTime(dataset.summary.from)} - ${formatChartDateTime(dataset.summary.to)}`;

  const handleTablePresetChange = (preset: TablePreset) => {
    setTablePreset(preset);

    if (preset === "rebates") {
      setOrderBy("protocolCostBps");
      setDirection("asc");
    } else {
      setOrderBy("protocolCostBps");
      setDirection("desc");
    }
  };

  const getResearchSorterProps = (field: TableSortField) => ({
    direction: orderBy === field ? direction : ("unspecified" as SortDirection),
    onChange: (nextDirection: SortDirection) => {
      setTablePreset((current) => (current === "rebates" ? "rebates" : "all"));
      setOrderBy(nextDirection === "unspecified" ? "unspecified" : field);
      setDirection(nextDirection);
    },
  });

  const pageFrom = tableRows.length ? (currentPage - 1) * TABLE_PAGE_SIZE + 1 : 0;
  const pageTo = Math.min(tableRows.length, currentPage * TABLE_PAGE_SIZE);

  return (
    <AppPageLayout title="GMX Execution Costs">
      <div className="flex flex-col gap-16">
        <div className="rounded-8 bg-slate-900 p-20">
          <div className="flex flex-wrap items-start justify-between gap-16">
            <div>
              <h1 className="text-24 font-medium text-typography-primary">GMX BTC Execution Costs</h1>
              <p className="text-body-medium mt-6 max-w-[860px] text-typography-secondary">
                Observed GMX v2 BTC fills from Subsquid. Protocol cost is oracle spread + position fee + net position
                impact + swap cost. Holding fees and exact delay drift are excluded from protocol cost.
              </p>
            </div>
            <div className="text-body-small text-right text-typography-secondary numbers">
              <div>{dateLabel}</div>
              <div>Generated {formatChartDateTime(Date.parse(dataset.summary.generatedAt) / 1000)}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-12 rounded-8 bg-slate-900 p-16 md:grid-cols-[minmax(260px,1.6fr)_repeat(3,minmax(120px,1fr))_minmax(150px,0.8fr)]">
          <Field label="Dataset">
            <ResearchDropdown
              value={dataset.id}
              onChange={(value) => {
                setDatasetId(value);
                setMarket("all");
              }}
              options={datasetOptions}
            />
          </Field>
          <Field label="Phase">
            <ResearchDropdown<PhaseFilter> value={phase} onChange={setPhase} options={PHASE_OPTIONS} />
          </Field>
          <Field label="Side">
            <ResearchDropdown<SideFilter> value={side} onChange={setSide} options={SIDE_OPTIONS} />
          </Field>
          <Field label="Market">
            <ResearchDropdown
              value={markets.includes(market) ? market : "all"}
              onChange={setMarket}
              options={marketOptions}
            />
          </Field>
          <Field label="Min Size USD">
            <NumberInput
              className="text-body-medium h-42 rounded-4 border border-slate-600 bg-slate-800 px-12 text-typography-primary outline-none focus:border-blue-300"
              value={minSizeUsd}
              placeholder="0"
              onValueChange={(event) => setMinSizeUsd(Number(event.target.value) || 0)}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 md:grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
          <KpiCard label="Fills" value={formatNumber(rows.length, 0)} subtext="after filters" />
          <KpiCard label="Volume" value={formatUsd(sum(rows.map((row) => row.sizeUsd)))} subtext="matched notional" />
          <KpiCard label="Median Cost" value={formatBps(median(protocolCosts))} subtext="protocol only" />
          <KpiCard label="P90 Cost" value={formatBps(quantile(protocolCosts, 0.9))} subtext="right tail" />
          <KpiCard
            label="Median Fee"
            value={formatBps(median(rows.map((row) => row.positionFeeBps).filter(Number.isFinite)))}
            subtext="position fee"
          />
          <KpiCard
            label="Median Impact"
            value={formatBps(median(rows.map((row) => row.netImpactCostBps).filter(Number.isFinite)))}
            subtext="negative is rebate"
          />
          <KpiCard
            label="Median Swap"
            value={formatBps(median(rows.map((row) => row.swapCostBps).filter(Number.isFinite)))}
            subtext="fee minus impact"
          />
          <KpiCard label="P75 Delay" value={formatSeconds(quantile(delays, 0.75))} subtext="created to executed" />
          <KpiCard label="Median Size" value={formatUsd(median(rows.map((row) => row.sizeUsd)))} subtext="per fill" />
        </div>

        <div className="grid grid-cols-1 gap-16 xl:grid-cols-2">
          <Card title="Protocol Cost Distribution" bodyPadding>
            <div className="text-body-small mb-8 text-typography-secondary">Shaded band: 12-17 bps</div>
            <HistogramChart rows={rows} />
          </Card>

          <Card title="Cost by Phase and Side" bodyPadding>
            <div className="text-body-small mb-8 text-typography-secondary">
              Whisker p10-p90, box p25-p75, red median
            </div>
            <RangeRows rows={rows} />
          </Card>

          <Card title="Size vs Net Protocol Cost" bodyPadding>
            <Tabs<PhaseFilter>
              type="inline"
              selectedValue={phase}
              onChange={setPhase}
              options={PHASE_OPTIONS}
              className="mb-10"
              tabsWrapperClassName="w-auto"
            />
            <SizeScatterChart rows={rows} />
          </Card>

          <Card title="Median Cost Components" bodyPadding>
            <div className="text-body-small mb-8 text-typography-secondary">
              Position and swap impact can be negative when execution receives a rebate
            </div>
            <ComponentsChart rows={rows} />
          </Card>

          <div className="xl:col-span-2">
            <Card title="Timeline" bodyPadding>
              <TimelineChart rows={rows} />
            </Card>
          </div>

          <div className="xl:col-span-2">
            <Card
              title={
                <div className="flex w-full flex-wrap items-center justify-between gap-12">
                  <div>
                    <span>Execution Fills</span>
                    <span className="text-body-small ml-12 text-typography-secondary">
                      {tableRows.length} matching rows
                    </span>
                  </div>
                  <Tabs<TablePreset>
                    type="inline"
                    selectedValue={tablePreset}
                    onChange={handleTablePresetChange}
                    options={TABLE_PRESET_OPTIONS}
                    tabsWrapperClassName="w-auto"
                  />
                </div>
              }
              bodyPadding={false}
            >
              <ResearchFillsTable
                rows={visibleTableRows}
                chainId={dataset.summary.chainId}
                getSorterProps={getResearchSorterProps}
              />
              <div className="flex flex-wrap items-center justify-between gap-12 border-t border-stroke-primary px-12 py-8">
                <span className="text-body-small text-typography-secondary numbers">
                  {pageFrom}-{pageTo} of {tableRows.length}
                </span>
                <BottomTablePagination
                  className="!p-0"
                  page={currentPage}
                  pageCount={pageCount}
                  onPageChange={setCurrentPage}
                />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppPageLayout>
  );
}

export default GmxExecutionCostsPage;
