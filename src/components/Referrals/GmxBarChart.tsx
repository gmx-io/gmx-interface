import { lightFormat } from "date-fns";
import { useMemo } from "react";
import { Bar, BarChart, BarProps, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts";

import { formatNumberHuman } from "lib/numbers";

import { STUB_DATA } from "./DEV";

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

  return formatNumberHuman(value, false, 2);
}

function integerYAxisTickFormatter(value: number) {
  if (!isFinite(value) || value === 0) return "0";

  return formatNumberHuman(value, false, 0);
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

function BagWithGap(props: TriangleBarProps) {
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
        <BarChart data={chartData} margin={CHART_MARGIN} barSize={2}>
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
    volumeFloat: number;
  }[];
}) {
  return (
    <GmxBarChart chartData={chartData} yAxisTickFormatter={usdYAxisTickFormatter}>
      <Bar dataKey="volumeFloat" fill="var(--color-blue-300)" radius={1} />
    </GmxBarChart>
  );
}

const orderedDataKeys = ["lossFloat", "profitFloat"];
export function TradersPnLChart() {
  const chartData = useMemo(
    () =>
      STUB_DATA.map(({ timestamp, profit, loss }) => ({
        timestamp,
        dateCompact: lightFormat(timestamp * 1000, "dd/MM"),
        profitFloat: profit,
        lossFloat: loss,
      })),
    []
  );

  return (
    <GmxBarChart chartData={chartData} yAxisTickFormatter={integerYAxisTickFormatter} allowDecimals={false}>
      <Bar
        dataKey="lossFloat"
        stackId="stack"
        stroke="var(--color-red-500)"
        shape={<BagWithGap orderedDataKeys={orderedDataKeys} />}
      />
      <Bar
        dataKey="profitFloat"
        stackId="stack"
        stroke="var(--color-green-500)"
        shape={<BagWithGap orderedDataKeys={orderedDataKeys} />}
      />
    </GmxBarChart>
  );
}
