import { autoUpdate, flip, offset, shift, useFloating } from "@floating-ui/react";
import { Popover } from "@headlessui/react";
import type { MessageDescriptor } from "@lingui/core";
import { Trans, msg, t } from "@lingui/macro";
import cx from "classnames";
import { format } from "date-fns/format";
import { useCallback, useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  type TooltipProps,
  XAxis,
  YAxis,
} from "recharts";

import { selectTradeboxMarketInfo } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { RateTimeframe, useRateSnapshots } from "domain/synthetics/markets/useRateSnapshots";
import { useLocalizedMap } from "lib/i18n";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { bigintToNumber, PRECISION_DECIMALS } from "lib/numbers";
import { RatesSnapshot } from "sdk/utils/rates/types";

import Loader from "components/Loader/Loader";
import { PoolsTabs } from "components/PoolsTabs/PoolsTabs";

import ChevronDownIcon from "img/ic_chevron_down.svg?react";
import MinusCircleIcon from "img/ic_minus_circle.svg?react";

type RateType = "netRate" | "borrowingRate" | "fundingRate";
type RateProjection = "1h" | "8h" | "24h" | "1y";

const RATE_TYPES: RateType[] = ["netRate", "borrowingRate", "fundingRate"];
const RATE_TYPE_LABELS: Record<RateType, MessageDescriptor> = {
  netRate: msg`Net Rate`,
  borrowingRate: msg`Borrowing Rate`,
  fundingRate: msg`Funding Rate`,
};

const TIMEFRAMES: RateTimeframe[] = ["1d", "7d", "30d"];
const TIMEFRAME_LABELS: Record<RateTimeframe, MessageDescriptor> = {
  "1d": msg`24h`,
  "7d": msg`7d`,
  "30d": msg`30d`,
};

const PROJECTIONS: RateProjection[] = ["1h", "8h", "24h", "1y"];
const PROJECTION_LABELS: Record<RateProjection, MessageDescriptor> = {
  "1h": msg`1h`,
  "8h": msg`8h`,
  "24h": msg`24h`,
  "1y": msg`1Y`,
};

const PROJECTION_MULTIPLIERS: Record<RateProjection, number> = {
  "1h": 3600,
  "8h": 28800,
  "24h": 86400,
  "1y": 31536000,
};

const LONG_COLOR = "var(--color-green-500)";
const SHORT_COLOR = "var(--color-red-500)";

const AXIS_TICK_PROPS = { fill: "var(--color-slate-100)", fontSize: 12, fontWeight: 500 };

const CHART_CURSOR_PROPS = {
  stroke: "var(--color-slate-500)",
  strokeWidth: 1,
  strokeDasharray: "2 2",
};

const CHART_MARGIN = { top: 5, right: 16, bottom: 0, left: 0 };

const LONG_ACTIVE_DOT = { r: 4, strokeWidth: 2, stroke: LONG_COLOR, fill: "var(--color-slate-900)" };
const SHORT_ACTIVE_DOT = { r: 4, strokeWidth: 2, stroke: SHORT_COLOR, fill: "var(--color-slate-900)" };

function getRateFields(rateType: RateType): { longKey: keyof RatesSnapshot; shortKey: keyof RatesSnapshot } {
  switch (rateType) {
    case "netRate":
      return { longKey: "netRateLong", shortKey: "netRateShort" };
    case "borrowingRate":
      return { longKey: "borrowingRateLong", shortKey: "borrowingRateShort" };
    case "fundingRate":
      return { longKey: "fundingRateLong", shortKey: "fundingRateShort" };
  }
}

function rateToProjectedPercent(rateString: string, projection: RateProjection): number {
  const rate = BigInt(rateString);
  const multiplier = BigInt(PROJECTION_MULTIPLIERS[projection]);
  return bigintToNumber(rate * multiplier * 100n, PRECISION_DECIMALS);
}

/**
 * API stores borrowing rate as a positive cost magnitude. To match the convention used in the
 * rest of the UI (header, MarketNetFee tooltip — where borrowing is shown as a negative number
 * representing the cost the trader pays), we negate it for display.
 */
function borrowingRateToProjectedPercent(rateString: string, projection: RateProjection): number {
  return -rateToProjectedPercent(rateString, projection);
}

function getPercentageDisplayDecimals(values: number[]): number {
  const maxAbs = Math.max(...values.map(Math.abs));
  if (maxAbs >= 100) return 0;
  if (maxAbs >= 10) return 1;
  if (maxAbs >= 1) return 2;
  if (maxAbs >= 0.1) return 3;
  return 4;
}

function formatRate(value: number, decimals = 4): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
}

function getRateDirectionLabel(rateType: RateType, direction: "long" | "short"): string {
  if (direction === "long") {
    switch (rateType) {
      case "netRate":
        return t`Long Net Rate`;
      case "borrowingRate":
        return t`Long Borrowing Rate`;
      case "fundingRate":
        return t`Long Funding Rate`;
    }
  }
  switch (rateType) {
    case "netRate":
      return t`Short Net Rate`;
    case "borrowingRate":
      return t`Short Borrowing Rate`;
    case "fundingRate":
      return t`Short Funding Rate`;
  }
}

type ChartDataPoint = {
  timestamp: Date;
  longRate: number;
  shortRate: number;
  raw: RatesSnapshot;
};

function isChartDataPoint(value: unknown): value is ChartDataPoint {
  if (value === null || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return v.timestamp instanceof Date && typeof v.longRate === "number" && typeof v.shortRate === "number";
}

function buildChartData(snapshots: RatesSnapshot[], rateType: RateType, projection: RateProjection): ChartDataPoint[] {
  const { longKey, shortKey } = getRateFields(rateType);
  const convert = rateType === "borrowingRate" ? borrowingRateToProjectedPercent : rateToProjectedPercent;

  return snapshots.map((snapshot) => ({
    timestamp: new Date(snapshot.timestamp * 1000),
    longRate: convert(String(snapshot[longKey]), projection),
    shortRate: convert(String(snapshot[shortKey]), projection),
    raw: snapshot,
  }));
}

export function NetRateChart() {
  const rateTypeLabels = useLocalizedMap(RATE_TYPE_LABELS);
  const timeframeLabels = useLocalizedMap(TIMEFRAME_LABELS);

  const marketInfo = useSelector(selectTradeboxMarketInfo);
  const marketAddress = marketInfo?.marketTokenAddress;

  const [rateType, setRateType] = useLocalStorageSerializeKey<RateType>("net-rate-chart-type", "netRate");
  const [timeframe, setTimeframe] = useLocalStorageSerializeKey<RateTimeframe>("net-rate-chart-timeframe", "7d");
  const [projection, setProjection] = useLocalStorageSerializeKey<RateProjection>("net-rate-chart-projection", "1h");

  const activeRateType = rateType || "netRate";
  const activeTimeframe = timeframe || "7d";
  const activeProjection = projection || "1h";

  const { snapshots, isLoading, error } = useRateSnapshots({
    marketAddress,
    timeframe: activeTimeframe,
  });

  const chartData = useMemo(() => {
    if (!snapshots || snapshots.length === 0) return [];
    return buildChartData(snapshots, activeRateType, activeProjection);
  }, [snapshots, activeRateType, activeProjection]);

  const yAxisDecimals = useMemo(() => {
    if (chartData.length === 0) return 4;
    const allValues = chartData.flatMap((d) => [d.longRate, d.shortRate]);
    return getPercentageDisplayDecimals(allValues);
  }, [chartData]);

  const rateTypeTabs = useMemo(
    () => RATE_TYPES.map((type) => ({ label: rateTypeLabels[type], value: type })),
    [rateTypeLabels]
  );

  const timeframeTabs = useMemo(
    () => TIMEFRAMES.map((tf) => ({ label: timeframeLabels[tf], value: tf })),
    [timeframeLabels]
  );

  const xAxisTickFormatter = useCallback(
    (value: Date) => {
      if (activeTimeframe === "1d") {
        return format(value, "HH:mm");
      }
      return format(value, "dd/MM");
    },
    [activeTimeframe]
  );

  const renderTooltip = useCallback(
    ({ active, payload }: TooltipProps<number, string>) => {
      if (!active) return null;
      const point = payload?.[0]?.payload;
      if (!isChartDataPoint(point)) return null;
      return (
        <NetRateTooltip
          point={point}
          rateType={activeRateType}
          projection={activeProjection}
          decimals={yAxisDecimals}
        />
      );
    },
    [activeRateType, activeProjection, yAxisDecimals]
  );

  return (
    <div className="flex h-full w-full flex-col gap-8 p-8">
      <div className="flex flex-wrap items-center justify-between gap-8 pb-8 pt-4">
        <PoolsTabs tabs={rateTypeTabs} selected={activeRateType} setSelected={setRateType} />
        <div className="flex flex-wrap items-center gap-8">
          <PoolsTabs tabs={timeframeTabs} selected={activeTimeframe} setSelected={setTimeframe} />
          <ProjectionDropdown value={activeProjection} onChange={setProjection} />
        </div>
      </div>

      <div className="flex items-center gap-16 px-4 pb-8">
        <span className="text-body-small flex items-center gap-6 text-typography-secondary">
          <span className="inline-block size-8 rounded-full bg-green-500" />
          <Trans>Long Positions</Trans>
          {chartData.length > 0 && (
            <span className="text-typography-primary">
              {formatRate(chartData[chartData.length - 1].longRate, yAxisDecimals)}
            </span>
          )}
        </span>
        <span className="text-body-small flex items-center gap-6 text-typography-secondary">
          <span className="inline-block size-8 rounded-full bg-red-500" />
          <Trans>Short Positions</Trans>
          {chartData.length > 0 && (
            <span className="text-typography-primary">
              {formatRate(chartData[chartData.length - 1].shortRate, yAxisDecimals)}
            </span>
          )}
        </span>
      </div>

      <div className="w-full grow">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader />
          </div>
        ) : error && chartData.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-8 px-16 text-center">
            <MinusCircleIcon className="size-24 text-typography-secondary" />
            <p className="text-body-medium font-bold text-typography-primary">
              <Trans>Unable to load rate history.</Trans>
            </p>
            <p className="text-body-small text-typography-secondary">
              <Trans>Please refer to Net Rate / 1H above the chart.</Trans>
            </p>
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-8 px-16 text-center">
            <MinusCircleIcon className="size-24 text-typography-secondary" />
            <p className="text-body-medium font-bold text-typography-primary">
              <Trans>No net rate history available for this market.</Trans>
            </p>
            <p className="text-body-small text-typography-secondary">
              <Trans>
                For newer markets the history might not yet be indexed, please refer to Net Rate / 1H above the chart.
              </Trans>
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={CHART_MARGIN}>
              <CartesianGrid vertical={false} strokeDasharray="5 3" strokeWidth={0.5} stroke="var(--color-slate-600)" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={xAxisTickFormatter}
                tickLine={false}
                axisLine={false}
                tick={AXIS_TICK_PROPS}
                minTickGap={32}
                interval="equidistantPreserveStart"
                tickMargin={8}
              />
              <YAxis
                tickFormatter={(value: number) => {
                  if (value === 0) return "0%";
                  return formatRate(value, yAxisDecimals);
                }}
                tickLine={false}
                axisLine={false}
                tick={AXIS_TICK_PROPS}
                width={72}
              />
              <Tooltip cursor={CHART_CURSOR_PROPS} content={renderTooltip} />
              <Line
                type="monotone"
                dataKey="longRate"
                stroke={LONG_COLOR}
                strokeWidth={2}
                dot={false}
                activeDot={LONG_ACTIVE_DOT}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="shortRate"
                stroke={SHORT_COLOR}
                strokeWidth={2}
                dot={false}
                activeDot={SHORT_ACTIVE_DOT}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function ProjectionDropdown({ value, onChange }: { value: RateProjection; onChange: (value: RateProjection) => void }) {
  const projectionLabels = useLocalizedMap(PROJECTION_LABELS);
  const { refs, floatingStyles } = useFloating({
    placement: "bottom-end",
    middleware: [offset(4), flip(), shift()],
    whileElementsMounted: autoUpdate,
  });

  return (
    <Popover className="relative">
      <Popover.Button
        ref={refs.setReference}
        className="text-body-small flex items-center gap-4 rounded-4 px-8 py-4 text-typography-secondary hover:text-typography-primary"
      >
        <Trans>Net Rate Projection:</Trans> <span className="text-typography-primary">{projectionLabels[value]}</span>
        <ChevronDownIcon className="size-16" />
      </Popover.Button>
      <Popover.Panel
        ref={refs.setFloating}
        style={floatingStyles}
        className="z-50 rounded-4 border border-slate-600 bg-slate-800 py-4 shadow-lg"
      >
        {({ close }) => (
          <>
            {PROJECTIONS.map((p) => (
              <button
                key={p}
                type="button"
                className={cx(
                  "text-body-small flex w-full px-12 py-6 text-left hover:bg-slate-700",
                  p === value ? "text-typography-primary" : "text-typography-secondary"
                )}
                onClick={() => {
                  onChange(p);
                  close();
                }}
              >
                {projectionLabels[p]}
              </button>
            ))}
          </>
        )}
      </Popover.Panel>
    </Popover>
  );
}

function NetRateTooltip({
  point,
  rateType,
  projection,
  decimals,
}: {
  point: ChartDataPoint;
  rateType: RateType;
  projection: RateProjection;
  decimals: number;
}) {
  const projectionLabels = useLocalizedMap(PROJECTION_LABELS);
  const suffix = `/${projectionLabels[projection]}`;
  const { raw } = point;

  return (
    <div className="text-body-small flex min-w-[240px] flex-col gap-8 rounded-4 bg-slate-800 px-12 py-8 shadow-lg">
      <span className="text-typography-secondary">{format(point.timestamp, "MMM dd, HH:mm")}</span>

      {rateType === "netRate" ? (
        <NetRateBreakdownTooltip raw={raw} projection={projection} suffix={suffix} decimals={decimals} />
      ) : (
        <SimpleRateTooltip point={point} rateType={rateType} suffix={suffix} decimals={decimals} />
      )}
    </div>
  );
}

function NetRateBreakdownTooltip({
  raw,
  projection,
  suffix,
  decimals,
}: {
  raw: RatesSnapshot;
  projection: RateProjection;
  suffix: string;
  decimals: number;
}) {
  const longNet = rateToProjectedPercent(raw.netRateLong, projection);
  const shortNet = rateToProjectedPercent(raw.netRateShort, projection);
  const longFunding = rateToProjectedPercent(raw.fundingRateLong, projection);
  const shortFunding = rateToProjectedPercent(raw.fundingRateShort, projection);
  const longBorrowing = borrowingRateToProjectedPercent(raw.borrowingRateLong, projection);
  const shortBorrowing = borrowingRateToProjectedPercent(raw.borrowingRateShort, projection);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-16">
        <span className="flex items-center gap-4 font-bold">
          <span className="inline-block size-6 rounded-full bg-green-500" />
          <Trans>Long Net Rate</Trans>
        </span>
        <span className={cx("font-bold numbers", { positive: longNet >= 0, negative: longNet < 0 })}>
          {formatRate(longNet, decimals)}
          {suffix}
        </span>
      </div>
      <div className="flex items-center justify-between gap-16 pl-10 text-typography-secondary">
        <Trans>Funding</Trans>
        <span className="numbers">{formatRate(longFunding, decimals)}</span>
      </div>
      <div className="flex items-center justify-between gap-16 pl-10 text-typography-secondary">
        <Trans>Borrowing</Trans>
        <span className="numbers">{formatRate(longBorrowing, decimals)}</span>
      </div>

      <div className="mt-4 flex items-center justify-between gap-16">
        <span className="flex items-center gap-4 font-bold">
          <span className="inline-block size-6 rounded-full bg-red-500" />
          <Trans>Short Net Rate</Trans>
        </span>
        <span className={cx("font-bold numbers", { positive: shortNet >= 0, negative: shortNet < 0 })}>
          {formatRate(shortNet, decimals)}
          {suffix}
        </span>
      </div>
      <div className="flex items-center justify-between gap-16 pl-10 text-typography-secondary">
        <Trans>Funding</Trans>
        <span className="numbers">{formatRate(shortFunding, decimals)}</span>
      </div>
      <div className="flex items-center justify-between gap-16 pl-10 text-typography-secondary">
        <Trans>Borrowing</Trans>
        <span className="numbers">{formatRate(shortBorrowing, decimals)}</span>
      </div>
    </div>
  );
}

function SimpleRateTooltip({
  point,
  rateType,
  suffix,
  decimals,
}: {
  point: ChartDataPoint;
  rateType: RateType;
  suffix: string;
  decimals: number;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-16">
        <span className="flex items-center gap-4 font-bold">
          <span className="inline-block size-6 rounded-full bg-green-500" />
          {getRateDirectionLabel(rateType, "long")}
        </span>
        <span className={cx("numbers", { positive: point.longRate >= 0, negative: point.longRate < 0 })}>
          {formatRate(point.longRate, decimals)}
          {suffix}
        </span>
      </div>
      <div className="flex items-center justify-between gap-16">
        <span className="flex items-center gap-4 font-bold">
          <span className="inline-block size-6 rounded-full bg-red-500" />
          {getRateDirectionLabel(rateType, "short")}
        </span>
        <span className={cx("numbers", { positive: point.shortRate >= 0, negative: point.shortRate < 0 })}>
          {formatRate(point.shortRate, decimals)}
          {suffix}
        </span>
      </div>
    </div>
  );
}
