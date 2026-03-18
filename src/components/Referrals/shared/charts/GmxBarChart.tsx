import { Trans } from "@lingui/macro";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";

import { formatUsd } from "lib/numbers";

const CHART_MARGIN = { top: 8, right: 0, bottom: 0, left: 0 };

const TICK_PROPS: React.SVGProps<SVGTextElement> = {
  fill: "var(--color-slate-500)",
  fontSize: 12,
  fontWeight: 500,
};

const Y_AXIS_TICK_PROPS: React.SVGProps<SVGTextElement> = {
  ...TICK_PROPS,
  textAnchor: "start",
};

const X_AXIS_LINE_PROPS: React.SVGProps<SVGLineElement> = {
  stroke: "var(--color-slate-600)",
  strokeWidth: 0.5,
};

function usdYAxisTickFormatter(value: number) {
  if (!isFinite(value) || value === 0) return "0";

  return formatCompactNumber(value, 2);
}

function integerYAxisTickFormatter(value: number) {
  if (!isFinite(value) || value === 0) return "0";

  return formatCompactNumber(value, 0);
}

function formatCompactNumber(value: number, maximumFractionDigits: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits,
  }).format(value);
}

const MIN_POINT_SIZE_PX = 3;

function minPointSizeForNonZero(value: number): number {
  return value === 0 ? 0 : MIN_POINT_SIZE_PX;
}

export function GmxBarChart({
  yAxisTickFormatter,
  allowDecimals,
  children,
  chartData,
}: {
  yAxisTickFormatter: (value: number) => string;
  allowDecimals?: boolean;
  children: React.ReactNode;
  chartData: any[];
}) {
  return (
    <div className="h-[250px] w-full grow">
      <ResponsiveContainer width="100%" height="100%" debounce={500}>
        <BarChart data={chartData} margin={CHART_MARGIN} barSize={2} stackOffset="sign">
          <CartesianGrid
            vertical={false}
            strokeDasharray="1.5 8"
            strokeWidth={0.5}
            stroke="var(--color-stroke-primary)"
          />
          <XAxis
            dataKey="dateCompact"
            tickLine={false}
            axisLine={X_AXIS_LINE_PROPS}
            minTickGap={32}
            tick={TICK_PROPS}
            tickMargin={10}
          />
          <YAxis
            type="number"
            width={52}
            axisLine={false}
            tickLine={false}
            tickMargin={45}
            tickFormatter={yAxisTickFormatter}
            tick={Y_AXIS_TICK_PROPS}
            allowDecimals={allowDecimals}
          />
          {children}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TradersVolumeChart({
  chartData,
}: {
  chartData: {
    timestamp: number;
    dateCompact: string;
    volumeUsd: bigint;
    volumeFloat: number;
  }[];
}) {
  return (
    <GmxBarChart chartData={chartData} yAxisTickFormatter={usdYAxisTickFormatter}>
      <Bar dataKey="volumeFloat" fill="var(--color-blue-300)" radius={1} />
      <RechartsTooltip cursor={false} content={<SimpleChartTooltip fieldName="volumeUsd" isUsd />} />
    </GmxBarChart>
  );
}

function SimpleChartTooltip({
  active,
  payload,
  fieldName,
  isUsd,
}: {
  active?: boolean;
  payload?: Array<{ payload: Record<string, any> }>;
  fieldName: "volumeUsd" | "rebatesUsd" | "tradesCount";
  isUsd?: boolean;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  const value = isUsd ? formatUsd(item[fieldName]) : item[fieldName];

  return (
    <div className="rounded-8 border border-stroke-primary bg-slate-900 p-10">
      <div className="text-body-small mb-4 text-typography-secondary">{item.dateTooltip}</div>
      <div className="text-body-small text-typography-primary numbers">{value}</div>
    </div>
  );
}

export function TradesCountChart({
  chartData,
}: {
  chartData: {
    timestamp: number;
    dateCompact: string;
    tradesCount: number;
  }[];
}) {
  return (
    <GmxBarChart chartData={chartData} yAxisTickFormatter={integerYAxisTickFormatter} allowDecimals={false}>
      <Bar dataKey="tradesCount" fill="var(--color-blue-300)" radius={1} />
      <RechartsTooltip cursor={false} content={<SimpleChartTooltip fieldName="tradesCount" />} />
    </GmxBarChart>
  );
}

export function RebatesChart({
  chartData,
}: {
  chartData: {
    timestamp: number;
    dateCompact: string;
    rebatesUsd: bigint;
    rebatesUsdFloat: number;
  }[];
}) {
  return (
    <GmxBarChart chartData={chartData} yAxisTickFormatter={usdYAxisTickFormatter}>
      <Bar dataKey="rebatesUsdFloat" fill="var(--color-blue-300)" radius={1} />
      <RechartsTooltip cursor={false} content={<SimpleChartTooltip fieldName="rebatesUsd" isUsd />} />
    </GmxBarChart>
  );
}

function TradersReferredChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    payload: { dateTooltip: string; tradersGained: number; tradersLost: number; tradersNet: number };
  }>;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload as {
    dateTooltip: string;
    tradersGained: number;
    tradersLost: number;
    tradersNet: number;
  };

  return (
    <div className="rounded-8 border border-stroke-primary bg-slate-900 p-10">
      <div className="text-body-small mb-6 text-typography-secondary">{item.dateTooltip}</div>
      <div className="text-body-small flex items-center justify-between gap-12 text-typography-primary">
        <span>
          <Trans>Gained</Trans>
        </span>
        <span className="text-green-500 numbers">{item.tradersGained}</span>
      </div>
      <div className="text-body-small mt-2 flex items-center justify-between gap-12 text-typography-primary">
        <span>
          <Trans>Lost</Trans>
        </span>
        <span className="text-red-500 numbers">{item.tradersLost}</span>
      </div>
      <div className="text-body-small mt-6 flex items-center justify-between gap-12 text-typography-primary">
        <span>
          <Trans>Net</Trans>
        </span>
        <span className="numbers">{item.tradersNet}</span>
      </div>
    </div>
  );
}

export function TradersReferredChart({
  chartData,
}: {
  chartData: {
    timestamp: number;
    dateCompact: string;
    tradersGained: number;
    tradersLost: number;
    tradersNet: number;
  }[];
}) {
  return (
    <GmxBarChart chartData={chartData} yAxisTickFormatter={integerYAxisTickFormatter} allowDecimals={false}>
      <Bar
        dataKey="tradersLost"
        stackId="stack"
        fill="var(--color-red-500)"
        radius={2}
        minPointSize={minPointSizeForNonZero}
      />
      <Bar
        dataKey="tradersGained"
        stackId="stack"
        fill="var(--color-green-500)"
        radius={2}
        minPointSize={minPointSizeForNonZero}
      />
      <RechartsTooltip cursor={false} content={<TradersReferredChartTooltip />} />
    </GmxBarChart>
  );
}
