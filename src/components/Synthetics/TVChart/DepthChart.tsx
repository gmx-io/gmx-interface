import { PRECISION, bigintToNumber, expandDecimals, formatUsd, numberWithCommas } from "lib/numbers";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  LabelProps,
  Tooltip as RechartsTooltip,
  ReferenceLine,
  ResponsiveContainer,
  Text,
  TooltipProps,
  XAxis,
  YAxis,
} from "recharts";
import { useOffset } from "recharts/es6/context/chartLayoutContext";

import { t } from "@lingui/macro";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import React from "react";
import type { ImplicitLabelType, LabelPosition } from "recharts/types/component/Label";
import { executionPrice, priceImpact } from "../../../pages/UiPage/depthChartMath";
import { USD_DECIMALS } from "config/factors";
import { getPriceImpactForPosition } from "domain/synthetics/fees/utils/priceImpact";
import { MarketInfo } from "domain/synthetics/markets/types";
import { getNextPositionExecutionPrice } from "domain/synthetics/trade/utils/common";
import { getMarkPrice } from "domain/synthetics/trade";
import { getMidPrice } from "domain/tokens";

const GREEN = "#0ECC83";
const RED = "#FF506A";

const Y_AXIS_LABEL = {
  value: "Scale, k",
  position: "top" satisfies LabelPosition,
  offset: 10,
  fill: "#ffffff",
  opacity: 0.7,
  // startOffset: 100,
  dx: 1,
  fontSize: 12,
} satisfies LabelProps;
const Y_AXIS_DOMAIN = ["auto", "auto"];
const X_AXIS_DOMAIN = ["dataMin", "dataMax"];

const ORACLE_PRICE_LABEL: ImplicitLabelType = {
  position: "bottom",
  offset: 28,
  value: "ORACLE PRICE",
  fill: "#ffffff",
  opacity: 0.7,
  fontSize: 10,
};

// console.log(
//   executionPrice(
//     // long open interest
//     10_000_000_000_000_000_000n,
//     // short open interest
//     10_000_000_000_000_000_000n,
//     // size
//     -1_000_000_000_000_000n,
//     // impact exponent
//     2n * 10n ** 30n,
//     // positive impact factor
//     30n * 10n ** 30n,
//     // negative impact factor
//     90n * 10n ** 30n,
//     // min price
//     200100000n,
//     // max price
//     200400000n,
//     // precision
//     10n ** 30n
//   )
// );

export const DepthChart = React.memo(function DepthChart({ marketInfo }: { marketInfo: MarketInfo }) {
  let data: {
    size: number;
    longIncreaseAndShortDecreaseSize: number | null;
    longDecreaseAndShortIncreaseSize: number | null;
    executionPrice: number;
    priceImpact: number;
  }[] = [];

  const inc = marketInfo.longInterestUsd / 30n;

  console.log(
    bigintToNumber(marketInfo.indexToken.prices.minPrice, USD_DECIMALS),
    bigintToNumber(marketInfo.indexToken.prices.maxPrice, USD_DECIMALS)
  );

  for (let i = expandDecimals(1n, USD_DECIMALS); i < marketInfo.longInterestUsd; i += inc) {
    data.push({
      executionPrice: bigintToNumber(
        getNextPositionExecutionPrice({
          isIncrease: true,
          isLong: true,
          priceImpactUsd: getPriceImpactForPosition(marketInfo, i, true),
          sizeDeltaUsd: i,
          triggerPrice: marketInfo.indexToken.prices.maxPrice,
        })!,
        USD_DECIMALS
      ),
      longIncreaseAndShortDecreaseSize: Math.abs(bigintToNumber(i, USD_DECIMALS)),
      size: Math.abs(bigintToNumber(i, USD_DECIMALS)),
      priceImpact: bigintToNumber(getPriceImpactForPosition(marketInfo, i, true), USD_DECIMALS),
      longDecreaseAndShortIncreaseSize: null,
    });
  }

  for (let i = expandDecimals(1n, USD_DECIMALS); i <= marketInfo.shortInterestUsd; i += inc) {
    data.unshift({
      longDecreaseAndShortIncreaseSize: Math.abs(bigintToNumber(i, USD_DECIMALS)),
      executionPrice: bigintToNumber(
        getNextPositionExecutionPrice({
          isIncrease: false,
          isLong: true,
          priceImpactUsd: getPriceImpactForPosition(marketInfo, i, true),
          sizeDeltaUsd: -i,
          triggerPrice: marketInfo.indexToken.prices.minPrice,
        })!,
        USD_DECIMALS
      ),
      size: Math.abs(bigintToNumber(i, USD_DECIMALS)),
      priceImpact: bigintToNumber(getPriceImpactForPosition(marketInfo, i, true), USD_DECIMALS),
      longIncreaseAndShortDecreaseSize: null,
    });
  }

  let lowPrice = Math.ceil(data[0].executionPrice);
  let highPrice = Math.floor(data[data.length - 1].executionPrice);
  let marketPriceIndex;

  let ticks: number[] = [];

  const step = Math.round((highPrice - lowPrice) / 5);
  const midPrice = bigintToNumber(getMidPrice(marketInfo.indexToken.prices), USD_DECIMALS);
  const leftStart = Math.floor(midPrice / 10) * 10;
  const rightStart = Math.ceil(midPrice / 10) * 10;

  for (let i = leftStart; i > lowPrice; i -= step) {
    ticks.push(i);
  }

  ticks.push(midPrice);
  marketPriceIndex = ticks.length - 1;

  for (let i = rightStart; i < highPrice; i += step) {
    ticks.push(i);
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ bottom: 10, top: 20 }}>
        <defs>
          <linearGradient id="colorGreen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="50%" stopColor={GREEN} stopOpacity={0.5} />
            <stop offset="100%" stopColor={GREEN} stopOpacity={0} />
          </linearGradient>
        </defs>
        <defs>
          <linearGradient id="colorRed" x1="0" y1="0" x2="0" y2="1">
            <stop offset="50%" stopColor={RED} stopOpacity={0.5} />
            <stop offset="100%" stopColor={RED} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="2 2" stroke="#ffffff" opacity={0.07} />
        <RechartsTooltip content={ChartTooltip} cursor={false} />

        <Area
          dataKey="longDecreaseAndShortIncreaseSize"
          stroke={GREEN}
          strokeWidth={2}
          dot={false}
          fill="url(#colorGreen)"
          isAnimationActive={false}
          activeDot={renderCustomizedActiveDot}
        />
        <Area
          dataKey="longIncreaseAndShortDecreaseSize"
          stroke={RED}
          strokeWidth={2}
          dot={false}
          fill="url(#colorRed)"
          isAnimationActive={false}
          activeDot={renderCustomizedActiveDot}
        />

        <YAxis
          orientation="right"
          dataKey="size"
          axisLine={false}
          tickLine={false}
          tickMargin={2}
          tick={{ fill: "#ffffff", opacity: 0.7, fontSize: 12 }}
          label={Y_AXIS_LABEL}
          domain={Y_AXIS_DOMAIN}
          tickFormatter={(value) => numberWithCommas(value / 1000)}
        />
        <XAxis
          dataKey="executionPrice"
          type="number"
          axisLine={false}
          tickLine={false}
          domain={X_AXIS_DOMAIN}
          allowDecimals={true}
          ticks={ticks}
          interval={0}
          // tickFormatter={(value) => }
          // padding={{}}
          tickMargin={7}
          // fontFamily="Relative"
          tick={<Tick marketPriceIndex={marketPriceIndex} />}
          // tickFormatter={}
          // tickCount={5}
          // minTickGap={70}
        />
        <ReferenceLine
          x={bigintToNumber(getMidPrice(marketInfo.indexToken.prices), USD_DECIMALS)}
          label={ORACLE_PRICE_LABEL}
          stroke="#ffffff"
          opacity={0.6}
          strokeDasharray="2 2"
          alwaysShow
          ifOverflow="extendDomain"
        />
        {/* <ReferenceLine label="Flip size" stroke="blue" alwaysShow ifOverflow="extendDomain" /> */}
      </ComposedChart>
    </ResponsiveContainer>
  );
});

function ChartTooltip({
  active,
  payload,
}: TooltipProps<
  number | string,
  "size" | "longIncreaseAndShortDecreaseSize" | "executionPrice" | "priceImpact" | "longDecreaseAndShortIncreaseSize"
>) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const stats = payload[0].payload as Record<string, number>;

  return (
    <div className="z-50 rounded-4 border border-gray-950 bg-slate-800 p-8 text-14">
      <p className="mb-8">
        Execution prices for increasing longs and
        <br />
        decreasing shorts.
      </p>
      <StatsTooltipRow label={t`Execution Price`} value={stats.executionPrice} showDollar={false} />
      <StatsTooltipRow label={t`Total size`} value={stats.size} showDollar={false} />
      <StatsTooltipRow label={t`Price Impact`} value={stats.priceImpact} showDollar={false} />
    </div>
  );
}

const renderCustomizedActiveDot = (props: any) => {
  return <CustomizedActiveDot {...props} />;
};

function CustomizedActiveDot(props: any) {
  const { cx, cy, dataKey, fill } = props;

  const { top, height } = useOffset();

  if (cy === null) {
    return null;
  }

  return (
    <>
      <path d={`M${cx},${cy}L${cx},${top + height}`} stroke={fill} strokeDasharray="2 2" key={`dot-${dataKey}`} />;
      <circle cx={cx} cy={cy} r={4} fill={fill} />
      <circle cx={cx} cy={cy} r={6} stroke={fill} strokeWidth={1} fill="none" />
    </>
  );
}

function Tick(props: any) {
  const { x, y, height, textAnchor, payload, verticalAnchor, index, marketPriceIndex } = props;

  return (
    <Text
      x={x}
      y={y}
      height={height}
      textAnchor={textAnchor}
      fill="#ffffff"
      opacity={index === marketPriceIndex ? 1 : 0.7}
      fontWeight={index === marketPriceIndex ? "bold" : "normal"}
      verticalAnchor={verticalAnchor}
      fontSize={12}
    >
      {payload.value}
    </Text>
  );
}
