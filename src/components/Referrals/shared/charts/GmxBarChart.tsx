import { Trans } from "@lingui/macro";
import {
  Bar,
  BarChart,
  BarProps,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

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

const HALF_STACK_GAP = 1;

const getPath = (x: number, y: number, width: number, height: number, dataHeight: number, dataHeightIndex: number) => {
  if (height === 0) return "";

  let isFirst = dataHeightIndex === 0;
  let isLast = dataHeightIndex === dataHeight - 1;

  // From bottom to top
  const x1 = x + width / 2;
  const y1 = y + height - width / 2 + (isFirst ? 0 : -HALF_STACK_GAP);
  const x2 = x + width / 2;
  const y2 = y + width / 2 + (isLast ? 0 : HALF_STACK_GAP);

  return `M${x1},${y1}
  L${x2},${y2}`;
};

type TriangleBarProps = {
  orderedDataKeys: string[];
};

function BarWithGap(props: TriangleBarProps) {
  const { x, y, width, height, stroke, dataKey, orderedDataKeys } = props as BarProps & TriangleBarProps;
  const payload = (props as any).payload;

  let realDataHeight = 0;
  let realDataHeightIndex = 0;

  for (const key of orderedDataKeys) {
    if (payload[key] !== 0) {
      realDataHeight++;
      if (dataKey === key) {
        realDataHeightIndex = realDataHeight - 1;
      }
    }
  }

  return (
    <path
      d={getPath(x as number, y as number, width as number, height as number, realDataHeight, realDataHeightIndex)}
      stroke={stroke}
      strokeWidth={width}
      strokeLinecap="round"
    />
  );
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
    <div className="h-[256px] w-full">
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

function TradersVolumeChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload as { dateTooltip: string; volumeUsd: bigint };

  return (
    <div className="rounded-8 border border-stroke-primary bg-slate-900 p-10">
      <div className="text-body-small mb-4 text-typography-secondary">{item.dateTooltip}</div>
      <div className="text-body-small text-typography-primary numbers">{formatUsd(item.volumeUsd)}</div>
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
      <RechartsTooltip cursor={false} content={<TradersVolumeChartTooltip />} />
    </GmxBarChart>
  );
}

function TradesCountChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload as { dateTooltip: string; tradesCount: number };

  return (
    <div className="rounded-8 border border-stroke-primary bg-slate-900 p-10">
      <div className="text-body-small mb-4 text-typography-secondary">{item.dateTooltip}</div>
      <div className="text-body-small text-typography-primary numbers">{item.tradesCount}</div>
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
    tradesCountFloat: number;
  }[];
}) {
  return (
    <GmxBarChart chartData={chartData} yAxisTickFormatter={integerYAxisTickFormatter} allowDecimals={false}>
      <Bar dataKey="tradesCountFloat" fill="var(--color-blue-300)" radius={1} />
      <RechartsTooltip cursor={false} content={<TradesCountChartTooltip />} />
    </GmxBarChart>
  );
}

function RebatesChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload as { dateTooltip: string; rebatesUsd: bigint };

  return (
    <div className="rounded-8 border border-stroke-primary bg-slate-900 p-10">
      <div className="text-body-small mb-4 text-typography-secondary">{item.dateTooltip}</div>
      <div className="text-body-small text-typography-primary numbers">{formatUsd(item.rebatesUsd)}</div>
    </div>
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
      <RechartsTooltip cursor={false} content={<RebatesChartTooltip />} />
    </GmxBarChart>
  );
}

const orderedDataKeys = ["tradersLostFloat", "tradersGainedFloat"];

function TradersReferredChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload as {
    dateTooltip: string;
    tradersGained: number;
    tradersLost: number;
  };
  const tradersNet = item.tradersGained - item.tradersLost;

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
        <span className="numbers">{tradersNet}</span>
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
    tradersGainedFloat: number;
    tradersLostFloat: number;
  }[];
}) {
  return (
    <GmxBarChart chartData={chartData} yAxisTickFormatter={integerYAxisTickFormatter} allowDecimals={false}>
      <Bar
        dataKey="tradersLostFloat"
        stackId="stack"
        stroke="var(--color-red-500)"
        shape={<BarWithGap orderedDataKeys={orderedDataKeys} />}
      />
      <Bar
        dataKey="tradersGainedFloat"
        stackId="stack"
        stroke="var(--color-green-500)"
        shape={<BarWithGap orderedDataKeys={orderedDataKeys} />}
      />
      <RechartsTooltip cursor={false} content={<TradersReferredChartTooltip />} />
    </GmxBarChart>
  );
}
