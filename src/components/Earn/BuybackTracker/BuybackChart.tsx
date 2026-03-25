import { Trans, t } from "@lingui/macro";
import { format } from "date-fns";
import { useMemo } from "react";
import {
  Bar,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  TooltipProps,
  XAxis,
  YAxis,
} from "recharts";

import type { BuybackChartPoint } from "domain/buyback/useBuybackChartData";
import { numberWithCommas } from "lib/numbers";
import { useBreakpoints } from "lib/useBreakpoints";

import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";

const CHART_TICK_PROPS: React.SVGProps<SVGTextElement> = {
  fill: "var(--color-slate-100)",
  fontSize: 11,
  fontWeight: 500,
};

const X_AXIS_LINE_PROPS: React.SVGProps<SVGLineElement> = {
  stroke: "var(--color-slate-600)",
  strokeWidth: 0.5,
};

const CHART_CURSOR_PROPS = {
  stroke: "var(--color-slate-500)",
  strokeWidth: 1,
  strokeDasharray: "2 2",
};

const CHART_MARGIN = { top: 16, right: 16, bottom: 16, left: 0 };
const CHART_TOOLTIP_WRAPPER_STYLE: React.CSSProperties = { zIndex: 10000 };
const CHART_ACTIVE_DOT = { r: 4, strokeWidth: 2, stroke: "var(--color-slate-100)", fill: "var(--color-slate-900)" };

function formatCompactNumber(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `${Math.round(value / 1_000)}k`;
  }
  return String(Math.round(value));
}

function ChartTooltip({
  active,
  payload,
  gmxPrice,
}: TooltipProps<number, string> & { gmxPrice: number | undefined }) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const point = payload[0]!.payload as BuybackChartPoint;
  const weekRange = `${format(point.weekStart * 1000, "MMM d")} - ${format(point.weekEnd * 1000, "MMM d")}`;
  const weeklyUsd =
    gmxPrice !== undefined
      ? numberWithCommas(Math.round(point.weeklyAccrued * gmxPrice), { showDollar: true })
      : "—";
  const cumulativeUsd =
    gmxPrice !== undefined
      ? numberWithCommas(Math.round(point.cumulativeAccrued * gmxPrice), { showDollar: true })
      : "—";

  return (
    <div className="z-50 flex flex-col rounded-4 bg-slate-800 px-12 pt-8 text-body-small shadow-lg backdrop-blur-sm">
      <StatsTooltipRow label={t`Week`} value={weekRange} showDollar={false} />
      <StatsTooltipRow
        label={t`Weekly Bought`}
        value={`${numberWithCommas(Math.round(point.weeklyAccrued))} GMX (${weeklyUsd})`}
        showDollar={false}
      />
      <StatsTooltipRow
        label={t`Cumulative`}
        value={`${numberWithCommas(Math.round(point.cumulativeAccrued))} GMX (${cumulativeUsd})`}
        showDollar={false}
      />
    </div>
  );
}

export function BuybackChart({
  chartData,
  gmxPrice,
}: {
  chartData: BuybackChartPoint[];
  gmxPrice: number | undefined;
}) {
  const { isMobile } = useBreakpoints();

  const tooltipContent = useMemo(
    () =>
      function BuybackChartTooltipWrapper(props: TooltipProps<number, string>) {
        return <ChartTooltip {...props} gmxPrice={gmxPrice} />;
      },
    [gmxPrice]
  );

  if (chartData.length === 0) {
    return (
      <div className="flex min-h-[250px] items-center justify-center text-typography-secondary">
        <Trans>No data available</Trans>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap gap-24 pl-20 text-typography-secondary">
        <div className="flex items-center gap-8 text-13 font-medium">
          <div className="inline-block size-6 rounded-full bg-blue-300" /> <Trans>Weekly Bought</Trans>
        </div>
        <div className="flex items-center gap-8 text-13 font-medium">
          <div className="inline-block size-6 rounded-full bg-slate-100" /> <Trans>Cumulative</Trans>
        </div>
      </div>

      <div className="relative min-h-[250px] grow">
        <div className="absolute size-full">
          <ResponsiveContainer debounce={500}>
            <ComposedChart
              width={500}
              height={250}
              data={chartData}
              barCategoryGap="25%"
              margin={CHART_MARGIN}
            >
              <RechartsTooltip
                cursor={CHART_CURSOR_PROPS}
                content={tooltipContent}
                wrapperStyle={CHART_TOOLTIP_WRAPPER_STYLE}
              />
              <Bar
                yAxisId="left"
                dataKey="weeklyAccrued"
                fill="var(--color-blue-300)"
                radius={2}
                minPointSize={1}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cumulativeAccrued"
                stroke="var(--color-slate-100)"
                strokeWidth={2}
                dot={false}
                activeDot={CHART_ACTIVE_DOT}
              />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={X_AXIS_LINE_PROPS}
                minTickGap={isMobile ? 20 : 32}
                tick={CHART_TICK_PROPS}
                tickMargin={10}
              />
              <YAxis
                yAxisId="left"
                type="number"
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                tickMargin={10}
                tickFormatter={formatCompactNumber}
                tick={CHART_TICK_PROPS}
              />
              <YAxis
                yAxisId="right"
                type="number"
                orientation="right"
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                tickMargin={10}
                tickFormatter={formatCompactNumber}
                tick={CHART_TICK_PROPS}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
