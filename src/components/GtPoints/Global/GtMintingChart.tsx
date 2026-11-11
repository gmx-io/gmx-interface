import { t, Trans } from "@lingui/macro";
import { useMemo, useState } from "react";
import {
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
import {
  filterChartPeriod,
  formatChartAmount,
  formatChartPrice,
  formatUtcDay,
  getAxisWidth,
  getPairedChartAxes,
} from "../gtPointsFormat";
import type { GtMintingPoint } from "../gtPointsTypes";

function ChartTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const point = payload[0]!.payload as GtMintingPoint;

  return (
    <div className="text-body-small z-50 flex flex-col rounded-4 bg-slate-800 px-12 pt-8 shadow-lg backdrop-blur-sm">
      <StatsTooltipRow label={t`Date`} value={formatUtcDay(point.timestamp, "dd MMM yyyy")} showDollar={false} />
      <StatsTooltipRow
        label={t`Total minted`}
        value={`${Math.round(point.totalMinted).toLocaleString("en-US")} GT`}
        showDollar={false}
      />
      <StatsTooltipRow label={t`Minting price`} value={`$${point.mintingPrice.toFixed(4)}/GT`} showDollar={false} />
    </div>
  );
}

export function GtMintingChart({ points }: { points: GtMintingPoint[] | undefined }) {
  const { isMobile } = useBreakpoints();
  const [period, setPeriod] = useState<ChartPeriod>("all");

  const data = useMemo(() => filterChartPeriod(points ?? [], CHART_PERIOD_DAYS[period]), [points, period]);

  // Each axis fits the selected period on round steps; both use the same number of steps,
  // so their labels share rows and the grid lines.
  const axes = useMemo(
    () =>
      getPairedChartAxes(
        data.map((point) => point.totalMinted),
        data.map((point) => point.mintingPrice)
      ),
    [data]
  );
  const mintedAxis = axes.left;
  const priceAxis = axes.right;
  const mintedStep = mintedAxis?.step ?? 1;
  const priceStep = priceAxis?.step ?? 1;
  const mintedWidth = getAxisWidth(
    mintedAxis?.ticks.map((tick) => formatChartAmount(tick, mintedStep)),
    44
  );
  const priceWidth = getAxisWidth(
    priceAxis?.ticks.map((tick) => formatChartPrice(tick, priceStep)),
    48
  );

  const periodTabs = useChartPeriodTabs();

  return (
    <div className="flex flex-col rounded-8 bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-12 px-20 pt-16">
        <h3 className="text-body-large font-medium text-typography-primary">
          <Trans>GT minting</Trans>
        </h3>
        <PoolsTabs<ChartPeriod> tabs={periodTabs} selected={period} setSelected={setPeriod} />
      </div>

      <div className="flex flex-wrap items-center gap-24 px-20 pt-8 text-typography-secondary">
        <div className="flex items-center gap-8 text-13 font-medium">
          <div className="inline-block size-6 rounded-full bg-blue-300" /> <Trans>Total minted</Trans>
        </div>
        <div className="flex items-center gap-8 text-13 font-medium">
          <div className="inline-block size-6 rounded-full bg-slate-100" /> <Trans>Minting price</Trans>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="flex min-h-[280px] items-center justify-center text-typography-secondary">
          <Trans>No data available</Trans>
        </div>
      ) : (
        <div className="relative min-h-[280px] grow">
          <div className="absolute size-full">
            <ResponsiveContainer debounce={300}>
              <ComposedChart data={data} margin={CHART_MARGIN}>
                <CartesianGrid vertical={false} syncWithTicks {...CHART_GRID_PROPS} />
                <RechartsTooltip
                  cursor={CHART_CURSOR_PROPS}
                  content={<ChartTooltip />}
                  wrapperStyle={CHART_TOOLTIP_WRAPPER_STYLE}
                />
                <Line
                  yAxisId="minted"
                  type="stepAfter"
                  dataKey="totalMinted"
                  stroke="var(--color-blue-300)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={CHART_ACTIVE_DOT}
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
                  yAxisId="minted"
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tickMargin={Y_TICK_MARGIN}
                  width={mintedWidth}
                  domain={mintedAxis?.domain}
                  ticks={mintedAxis?.ticks}
                  tickFormatter={(value: number) => formatChartAmount(value, mintedStep)}
                  tick={getEdgeTickProps("left", mintedWidth)}
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
