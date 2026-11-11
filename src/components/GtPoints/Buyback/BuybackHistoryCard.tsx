import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import { ReactNode, useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  TooltipProps,
  XAxis,
  YAxis,
} from "recharts";

import { useBreakpoints } from "lib/useBreakpoints";

import { PoolsTabs } from "components/PoolsTabs/PoolsTabs";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";

import { CHART_PERIOD_DAYS, type ChartPeriod, useChartPeriodTabs } from "../chartPeriods";
import {
  CHART_ACTIVE_DOT,
  CHART_CURSOR_PROPS,
  CHART_GRID_PROPS,
  CHART_MARGIN,
  CHART_TICK_PROPS,
  CHART_TOOLTIP_WRAPPER_STYLE,
  getEdgeTickProps,
  X_AXIS_LINE_PROPS,
  Y_TICK_MARGIN,
} from "../chartStyles";
import { GtMetric } from "../GtMetric";
import {
  filterChartPeriod,
  formatChartAmount,
  formatChartPrice,
  formatUtcDay,
  getAxisWidth,
  getPairedChartAxes,
} from "../gtPointsFormat";
import type { GtBuybackHistoryPoint } from "../gtPointsTypes";

const TWO_DECIMALS = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
const formatAmountGt = (value: number) => `${value.toLocaleString("en-US", TWO_DECIMALS)} GT`;
const formatValueUsdc = (value: number) => `${value.toLocaleString("en-US", TWO_DECIMALS)} USDC`;
const formatPrice = (value: number | null) => (value === null ? "–" : `$${value.toFixed(4)}/GT`);

function ChartTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const point = payload[0]!.payload as GtBuybackHistoryPoint;

  return (
    <div className="text-body-small z-50 flex flex-col rounded-4 bg-slate-800 px-12 pt-8 shadow-lg backdrop-blur-sm">
      <StatsTooltipRow label={t`Date`} value={formatUtcDay(point.timestamp, "dd MMM yyyy")} showDollar={false} />
      <StatsTooltipRow
        label={t`Bought`}
        value={`${formatAmountGt(point.amountGt)} (${formatValueUsdc(point.valueUsdc)})`}
        showDollar={false}
      />
      <StatsTooltipRow label={t`Buyback price`} value={formatPrice(point.buybackPrice)} showDollar={false} />
      <StatsTooltipRow label={t`Minting price`} value={formatPrice(point.mintingPrice)} showDollar={false} />
      <StatsTooltipRow
        label={t`Total bought`}
        value={`${formatAmountGt(point.totalAmountGt)} (${formatValueUsdc(point.totalValueUsdc)})`}
        showDollar={false}
      />
    </div>
  );
}

// Past buybacks, laid out like the GMX buyback dashboard: the last buyback and the total on top,
// then daily buyback value as bars with the buyback and minting price as lines.
export function BuybackHistoryCard({
  history,
  isLoading,
}: {
  history: GtBuybackHistoryPoint[] | undefined;
  isLoading: boolean;
}) {
  const { isMobile } = useBreakpoints();
  const [period, setPeriod] = useState<ChartPeriod>("30d");
  const periodTabs = useChartPeriodTabs();

  const data = useMemo(() => filterChartPeriod(history ?? [], CHART_PERIOD_DAYS[period]), [history, period]);

  // Bars start at 0; the price axis fits the period. Both use the same number of round steps,
  // so their labels share rows and the grid lines.
  const axes = useMemo(
    () =>
      getPairedChartAxes(
        data.map((point) => point.valueUsdc),
        data.flatMap((point) =>
          point.buybackPrice === null ? [point.mintingPrice] : [point.buybackPrice, point.mintingPrice]
        ),
        { leftFromZero: true }
      ),
    [data]
  );
  const valueAxis = axes.left;
  const priceAxis = axes.right;
  const valueStep = valueAxis?.step ?? 1;
  const priceStep = priceAxis?.step ?? 1;
  const valueWidth = getAxisWidth(
    valueAxis?.ticks.map((tick) => formatChartAmount(tick, valueStep, "$")),
    44
  );
  const priceWidth = getAxisWidth(
    priceAxis?.ticks.map((tick) => formatChartPrice(tick, priceStep)),
    48
  );

  const last = history?.length ? history[history.length - 1] : undefined;

  return (
    <div className="flex flex-col rounded-8 bg-slate-900">
      <div className="flex flex-col gap-16 p-20">
        <h3 className="text-body-large font-medium text-typography-primary">
          <Trans>Buyback history</Trans>
        </h3>
        <div className="flex flex-wrap gap-x-28 gap-y-16 max-md:flex-col max-md:gap-12">
          <GtMetric
            label={last ? <Trans>Last buyback · {formatUtcDay(last.timestamp)}</Trans> : <Trans>Last buyback</Trans>}
            tooltip={<Trans>GT bought back in the most recent completed buyback. Buybacks run once a day.</Trans>}
            value={last ? formatAmountGt(last.amountGt) : "–"}
            subtitle={last ? formatValueUsdc(last.valueUsdc) : undefined}
            isLoading={isLoading}
          />
          <GtMetric
            label={<Trans>Last buyback price</Trans>}
            tooltip={<Trans>USDC paid per GT in the most recent buyback. It never goes above the minting price.</Trans>}
            value={last ? formatPrice(last.buybackPrice) : "–"}
            subtitle={last ? <Trans>Minting price {formatPrice(last.mintingPrice)}</Trans> : undefined}
            isLoading={isLoading}
          />
          <GtMetric
            label={<Trans>Total bought</Trans>}
            tooltip={<Trans>All GT bought back since buybacks started.</Trans>}
            value={last ? formatAmountGt(last.totalAmountGt) : "–"}
            subtitle={last ? formatValueUsdc(last.totalValueUsdc) : undefined}
            isLoading={isLoading}
          />
        </div>
      </div>

      <div className="border-t-1/2 border-slate-600" />

      <div className="flex flex-wrap items-center justify-between gap-12 px-20 pt-16">
        <div className="flex flex-wrap items-center gap-x-24 gap-y-8 text-typography-secondary">
          <LegendDot className="bg-blue-300" label={<Trans>Daily value</Trans>} />
          <LegendDot className="bg-green-300" label={<Trans>Buyback price</Trans>} />
          <LegendDot className="bg-slate-100" label={<Trans>Minting price</Trans>} />
        </div>
        <PoolsTabs<ChartPeriod> tabs={periodTabs} selected={period} setSelected={setPeriod} />
      </div>

      {data.length === 0 ? (
        <div className="flex min-h-[280px] items-center justify-center text-typography-secondary">
          {isLoading ? null : history?.length === 0 ? <Trans>No buybacks yet</Trans> : <Trans>No data available</Trans>}
        </div>
      ) : (
        <div className="relative min-h-[280px] grow">
          <div className="absolute size-full">
            <ResponsiveContainer debounce={300}>
              <ComposedChart data={data} barCategoryGap="25%" margin={CHART_MARGIN}>
                <CartesianGrid vertical={false} syncWithTicks {...CHART_GRID_PROPS} />
                <RechartsTooltip
                  cursor={CHART_CURSOR_PROPS}
                  content={<ChartTooltip />}
                  wrapperStyle={CHART_TOOLTIP_WRAPPER_STYLE}
                />
                <Bar
                  yAxisId="value"
                  dataKey="valueUsdc"
                  fill="var(--color-blue-300)"
                  radius={2}
                  minPointSize={1}
                  isAnimationActive={false}
                />
                <Line
                  yAxisId="price"
                  type="stepAfter"
                  dataKey="mintingPrice"
                  stroke="var(--color-slate-100)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={CHART_ACTIVE_DOT}
                  isAnimationActive={false}
                />
                <Line
                  yAxisId="price"
                  type="monotone"
                  dataKey="buybackPrice"
                  stroke="var(--color-green-300)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={CHART_ACTIVE_DOT}
                  isAnimationActive={false}
                />
                <XAxis
                  dataKey="timestamp"
                  tickLine={false}
                  axisLine={X_AXIS_LINE_PROPS}
                  minTickGap={isMobile ? 16 : 40}
                  tick={CHART_TICK_PROPS}
                  tickMargin={10}
                  tickFormatter={(value: number) => formatUtcDay(value)}
                />
                <YAxis
                  yAxisId="value"
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tickMargin={Y_TICK_MARGIN}
                  width={valueWidth}
                  domain={valueAxis?.domain}
                  ticks={valueAxis?.ticks}
                  tickFormatter={(value: number) => formatChartAmount(value, valueStep, "$")}
                  tick={getEdgeTickProps("left", valueWidth)}
                />
                <YAxis
                  yAxisId="price"
                  type="number"
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                  tickMargin={Y_TICK_MARGIN}
                  width={priceWidth}
                  domain={priceAxis?.domain}
                  ticks={priceAxis?.ticks}
                  tickFormatter={(value: number) => formatChartPrice(value, priceStep)}
                  tick={getEdgeTickProps("right", priceWidth)}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: ReactNode }) {
  return (
    <div className="flex items-center gap-8 text-13 font-medium">
      <div className={cx("inline-block size-6 rounded-full", className)} /> {label}
    </div>
  );
}
