import { t, Trans } from "@lingui/macro";
import { format } from "date-fns";
import { useMemo, useState } from "react";
import {
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

import type { GtMintingPoint } from "../gtPointsTypes";

type Period = "30d" | "90d" | "180d" | "all";

const PERIOD_DAYS: Record<Period, number | undefined> = { "30d": 30, "90d": 90, "180d": 180, all: undefined };

const CHART_TICK_PROPS: React.SVGProps<SVGTextElement> = {
  fill: "var(--color-slate-100)",
  fontSize: 11,
  fontWeight: 500,
};
const X_AXIS_LINE_PROPS: React.SVGProps<SVGLineElement> = { stroke: "var(--color-slate-600)", strokeWidth: 0.5 };
const CHART_CURSOR_PROPS = { stroke: "var(--color-slate-500)", strokeWidth: 1, strokeDasharray: "2 2" };
const CHART_MARGIN = { top: 16, right: 8, bottom: 8, left: 0 };
const CHART_TOOLTIP_WRAPPER_STYLE: React.CSSProperties = { zIndex: 10000 };
const CHART_ACTIVE_DOT = { r: 4, strokeWidth: 2, stroke: "var(--color-slate-100)", fill: "var(--color-slate-900)" };

function formatMillions(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`;
  return String(Math.round(value));
}

function ChartTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const point = payload[0]!.payload as GtMintingPoint;

  return (
    <div className="text-body-small z-50 flex flex-col rounded-4 bg-slate-800 px-12 pt-8 shadow-lg backdrop-blur-sm">
      <StatsTooltipRow label={t`Date`} value={format(point.timestamp * 1000, "dd MMM yyyy")} showDollar={false} />
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
  const [period, setPeriod] = useState<Period>("all");

  const data = useMemo(() => {
    if (!points?.length) return [];
    const days = PERIOD_DAYS[period];
    if (!days) return points;
    const from = points[points.length - 1].timestamp - days * 86_400;
    return points.filter((point) => point.timestamp >= from);
  }, [points, period]);

  const periodTabs = useMemo(
    () => [
      { value: "30d" as const, label: t`30d` },
      { value: "90d" as const, label: t`90d` },
      { value: "180d" as const, label: t`180d` },
      { value: "all" as const, label: t`All` },
    ],
    []
  );

  return (
    <div className="flex flex-col rounded-8 bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-12 px-20 pt-16">
        <h3 className="text-body-large font-medium text-typography-primary">
          <Trans>GT minting</Trans>
        </h3>
        <PoolsTabs<Period> tabs={periodTabs} selected={period} setSelected={setPeriod} />
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
                  tickFormatter={(value: number) => format(value * 1000, "d MMM")}
                />
                <YAxis
                  yAxisId="minted"
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tickMargin={8}
                  width={44}
                  tickFormatter={formatMillions}
                  tick={CHART_TICK_PROPS}
                />
                <YAxis
                  yAxisId="price"
                  type="number"
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                  tickMargin={8}
                  width={48}
                  tickFormatter={(value: number) => `$${value.toFixed(2)}`}
                  tick={CHART_TICK_PROPS}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
