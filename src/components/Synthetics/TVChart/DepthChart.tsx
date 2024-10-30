import { t } from "@lingui/macro";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { USD_DECIMALS } from "config/factors";
import { getPriceImpactForPosition } from "domain/synthetics/fees/utils/priceImpact";
import type { MarketInfo } from "domain/synthetics/markets/types";
import { getAvailableUsdLiquidityForPosition } from "domain/synthetics/markets/utils";
import { getNextPositionExecutionPrice } from "domain/synthetics/trade/utils/common";
import { getMidPrice } from "domain/tokens/utils";
import { bigMath } from "lib/bigmath";
import {
  bigintToNumber,
  calculatePriceDecimals,
  expandDecimals,
  formatAmount,
  numberToBigint,
  numberWithCommas,
} from "lib/numbers";
import { useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  LabelProps,
  Line,
  Tooltip as RechartsTooltip,
  ReferenceDot,
  ReferenceDotProps,
  ReferenceLine,
  ResponsiveContainer,
  Text,
  TooltipProps,
  XAxis,
  YAxis,
} from "recharts";
import { useOffset } from "recharts/es6/context/chartLayoutContext";
import type { ImplicitLabelType, LabelPosition } from "recharts/types/component/Label";
import type { AxisDomainItem } from "recharts/types/util/types";

const GREEN = "#0ECC83";
const RED = "#FF506A";

const Y_AXIS_LABEL = {
  value: "Scale, k",
  position: "top" satisfies LabelPosition,
  offset: 10,
  fill: "#ffffff",
  opacity: 0.7,
  dx: 1,
  fontSize: 12,
} satisfies LabelProps;
const Y_AXIS_DOMAIN: [AxisDomainItem, AxisDomainItem] = [0, "auto"] as const;

const ORACLE_PRICE_LABEL: ImplicitLabelType = {
  position: "bottom",
  offset: 28,
  value: "ORACLE PRICE",
  fill: "#ffffff",
  opacity: 0.7,
  fontSize: 10,
};

const DOLLAR = expandDecimals(1n, USD_DECIMALS);

const CHART_MARGIN = { bottom: 10, top: 20 };
const Y_AXIS_TICK = { fill: "#ffffff", opacity: 0.7, fontSize: 12 };

export function DepthChart({ marketInfo }: { marketInfo: MarketInfo }) {
  let data: {
    size: number;
    longIncreaseAndShortDecreaseSize: number | null;
    longDecreaseAndShortIncreaseSize: number | null;
    longIncreaseXorShortDecreaseSize: number | null;
    longDecreaseXorShortIncreaseSize: number | null;
    executionPrice: number;
    priceImpact: number;
    // eslint-disable-next-line react-perf/jsx-no-new-array-as-prop
  }[] = [];

  const longLiquidity = getAvailableUsdLiquidityForPosition(marketInfo, true);
  const shortLiquidity = getAvailableUsdLiquidityForPosition(marketInfo, false);
  const rightMax = bigMath.max(marketInfo.shortInterestUsd, longLiquidity);
  const rightMin = bigMath.min(marketInfo.shortInterestUsd, longLiquidity);
  const leftMax = bigMath.max(marketInfo.longInterestUsd, shortLiquidity);
  const leftMin = bigMath.min(marketInfo.longInterestUsd, shortLiquidity);

  const rightInc = (rightMax - DOLLAR) / 60n;
  const leftInc = (leftMax - DOLLAR) / 60n;

  let leftMinExecutionPrice = 0;
  let rightMinExecutionPrice = 0;

  let leftMaxExecutionPriceBigInt = 0n;
  let rightMaxExecutionPriceBigInt = 0n;

  // open long
  for (let i = DOLLAR; i < rightMax; i += rightInc) {
    const priceImpactUsd = getPriceImpactForPosition(marketInfo, i, true, { fallbackToZero: false });

    const executionPrice = getNextPositionExecutionPrice({
      isIncrease: true,
      isLong: true,
      priceImpactUsd,
      sizeDeltaUsd: i,
      triggerPrice: marketInfo.indexToken.prices.maxPrice,
    })!;

    if (priceImpactUsd == 0n) {
      data.push({
        executionPrice: bigintToNumber(executionPrice, USD_DECIMALS),
        longIncreaseAndShortDecreaseSize: Math.abs(bigintToNumber(rightMin, USD_DECIMALS)),
        size: Math.abs(bigintToNumber(rightMax, USD_DECIMALS)),
        priceImpact: bigintToNumber(priceImpactUsd, USD_DECIMALS),
        longDecreaseAndShortIncreaseSize: null,
        longIncreaseXorShortDecreaseSize: Math.abs(bigintToNumber(rightMax, USD_DECIMALS)),
        longDecreaseXorShortIncreaseSize: null,
      });

      rightMaxExecutionPriceBigInt = executionPrice;

      break;
    }

    data.push({
      executionPrice: bigintToNumber(executionPrice, USD_DECIMALS),
      longIncreaseAndShortDecreaseSize: i < rightMin ? Math.abs(bigintToNumber(i, USD_DECIMALS)) : null,
      size: Math.abs(bigintToNumber(i, USD_DECIMALS)),
      priceImpact: bigintToNumber(priceImpactUsd, USD_DECIMALS),
      longDecreaseAndShortIncreaseSize: null,
      longIncreaseXorShortDecreaseSize: i > rightMin ? Math.abs(bigintToNumber(i, USD_DECIMALS)) : null,
      longDecreaseXorShortIncreaseSize: null,
    });

    if (i + rightInc > rightMin && i < rightMin) {
      const priceImpactUsd = getPriceImpactForPosition(marketInfo, rightMin, true, { fallbackToZero: true });

      const executionPrice = getNextPositionExecutionPrice({
        isIncrease: true,
        isLong: true,
        priceImpactUsd,
        sizeDeltaUsd: rightMin,
        triggerPrice: marketInfo.indexToken.prices.maxPrice,
      })!;

      rightMinExecutionPrice = bigintToNumber(executionPrice, USD_DECIMALS);

      data.push({
        executionPrice: bigintToNumber(executionPrice, USD_DECIMALS),
        longIncreaseAndShortDecreaseSize: Math.abs(bigintToNumber(rightMin, USD_DECIMALS)),
        size: Math.abs(bigintToNumber(rightMin, USD_DECIMALS)),
        priceImpact: bigintToNumber(priceImpactUsd, USD_DECIMALS),
        longDecreaseAndShortIncreaseSize: null,
        longIncreaseXorShortDecreaseSize: Math.abs(bigintToNumber(rightMin, USD_DECIMALS)),
        longDecreaseXorShortIncreaseSize: null,
      });
    }

    if (i + rightInc > rightMax) {
      const priceImpactUsd = getPriceImpactForPosition(marketInfo, rightMax, true, { fallbackToZero: true });

      const executionPrice = getNextPositionExecutionPrice({
        isIncrease: true,
        isLong: true,
        priceImpactUsd,
        sizeDeltaUsd: rightMax,
        triggerPrice: marketInfo.indexToken.prices.maxPrice,
      })!;

      rightMaxExecutionPriceBigInt = executionPrice;

      data.push({
        executionPrice: bigintToNumber(executionPrice, USD_DECIMALS),
        longIncreaseAndShortDecreaseSize: rightMax > rightMin ? null : Math.abs(bigintToNumber(rightMax, USD_DECIMALS)),
        size: Math.abs(bigintToNumber(rightMax, USD_DECIMALS)),
        priceImpact: bigintToNumber(priceImpactUsd, USD_DECIMALS),
        longDecreaseAndShortIncreaseSize: null,
        longIncreaseXorShortDecreaseSize: rightMax > rightMin ? Math.abs(bigintToNumber(rightMax, USD_DECIMALS)) : null,
        longDecreaseXorShortIncreaseSize: null,
      });
    }
  }

  // open short
  for (let i = DOLLAR; i <= leftMax; i += leftInc) {
    const priceImpactUsd = getPriceImpactForPosition(marketInfo, i, false, { fallbackToZero: true });

    const executionPrice = getNextPositionExecutionPrice({
      isIncrease: true,
      isLong: false,
      priceImpactUsd,
      sizeDeltaUsd: i,
      triggerPrice: marketInfo.indexToken.prices.minPrice,
    })!;

    if (priceImpactUsd == 0n) {
      data.unshift({
        executionPrice: bigintToNumber(executionPrice, USD_DECIMALS),
        longDecreaseAndShortIncreaseSize: Math.abs(bigintToNumber(leftMin, USD_DECIMALS)),
        size: Math.abs(bigintToNumber(leftMax, USD_DECIMALS)),
        priceImpact: bigintToNumber(priceImpactUsd, USD_DECIMALS),
        longIncreaseAndShortDecreaseSize: null,
        longIncreaseXorShortDecreaseSize: null,
        longDecreaseXorShortIncreaseSize: Math.abs(bigintToNumber(leftMax, USD_DECIMALS)),
      });

      leftMaxExecutionPriceBigInt = executionPrice;

      break;
    }

    data.unshift({
      longDecreaseAndShortIncreaseSize: i < leftMin ? Math.abs(bigintToNumber(i, USD_DECIMALS)) : null,
      executionPrice: bigintToNumber(executionPrice, USD_DECIMALS),
      size: Math.abs(bigintToNumber(i, USD_DECIMALS)),
      priceImpact: bigintToNumber(priceImpactUsd, USD_DECIMALS),
      longIncreaseAndShortDecreaseSize: null,
      longIncreaseXorShortDecreaseSize: null,
      longDecreaseXorShortIncreaseSize: i > leftMin ? Math.abs(bigintToNumber(i, USD_DECIMALS)) : null,
    });

    if (i + leftInc > leftMin && i < leftMin) {
      const priceImpactUsd = getPriceImpactForPosition(marketInfo, leftMin, false, { fallbackToZero: true });
      const executionPrice = getNextPositionExecutionPrice({
        isIncrease: true,
        isLong: false,
        priceImpactUsd,
        sizeDeltaUsd: leftMin,
        triggerPrice: marketInfo.indexToken.prices.minPrice,
      })!;
      leftMinExecutionPrice = bigintToNumber(executionPrice, USD_DECIMALS);
      data.unshift({
        executionPrice: leftMinExecutionPrice,
        longDecreaseAndShortIncreaseSize: Math.abs(bigintToNumber(leftMin, USD_DECIMALS)),
        size: Math.abs(bigintToNumber(leftMin, USD_DECIMALS)),
        priceImpact: bigintToNumber(priceImpactUsd, USD_DECIMALS),
        longIncreaseAndShortDecreaseSize: null,
        longIncreaseXorShortDecreaseSize: null,
        longDecreaseXorShortIncreaseSize: Math.abs(bigintToNumber(leftMin, USD_DECIMALS)),
      });
    }

    if (i + leftInc > leftMax) {
      const priceImpactUsd = getPriceImpactForPosition(marketInfo, leftMax, false, { fallbackToZero: true });

      const executionPrice = getNextPositionExecutionPrice({
        isIncrease: true,
        isLong: false,
        priceImpactUsd,
        sizeDeltaUsd: leftMax,
        triggerPrice: marketInfo.indexToken.prices.minPrice,
      })!;

      leftMaxExecutionPriceBigInt = executionPrice;

      data.unshift({
        executionPrice: bigintToNumber(executionPrice, USD_DECIMALS),
        longDecreaseAndShortIncreaseSize: leftMax > leftMin ? null : Math.abs(bigintToNumber(leftMax, USD_DECIMALS)),
        size: Math.abs(bigintToNumber(leftMax, USD_DECIMALS)),
        priceImpact: bigintToNumber(priceImpactUsd, USD_DECIMALS),
        longIncreaseAndShortDecreaseSize: null,
        longIncreaseXorShortDecreaseSize: null,
        longDecreaseXorShortIncreaseSize: leftMax > leftMin ? Math.abs(bigintToNumber(leftMax, USD_DECIMALS)) : null,
      });
    }
  }

  const isZeroPriceImpact = data.length === 2;

  const minPriceBigInt = marketInfo.indexToken.prices.minPrice;
  const midPriceBigInt = getMidPrice(marketInfo.indexToken.prices);
  const maxPriceBigInt = marketInfo.indexToken.prices.maxPrice;

  const minPrice = bigintToNumber(minPriceBigInt, USD_DECIMALS);
  const midPrice = bigintToNumber(midPriceBigInt, USD_DECIMALS);
  const maxPrice = bigintToNumber(maxPriceBigInt, USD_DECIMALS);

  const xAxisDomain: [AxisDomainItem, AxisDomainItem] = isZeroPriceImpact
    ? [minPrice * 0.999, maxPrice * 1.001]
    : ["dataMin", "dataMax"];

  let lowPrice = isZeroPriceImpact
    ? bigMath.mulDiv(leftMaxExecutionPriceBigInt, 999n, 1000n)
    : leftMaxExecutionPriceBigInt;
  let highPrice = isZeroPriceImpact
    ? bigMath.mulDiv(rightMaxExecutionPriceBigInt, 1001n, 1000n)
    : rightMaxExecutionPriceBigInt;
  let marketPriceIndex;

  // eslint-disable-next-line react-perf/jsx-no-new-array-as-prop
  let ticks: number[] = [];

  const decimals = USD_DECIMALS;
  const span = highPrice - lowPrice;
  // span 0.6 -> scale 1/10
  // span 6 -> scale 1
  // span 60 -> scale 10
  const spanScale = numberToBigint(Math.pow(10, Math.floor(Math.log10(bigintToNumber(span, decimals)))), decimals);

  const [tickCount, setTickCount] = useState(9n);

  const stepRaw = bigMath.divRound(span, tickCount);
  const stepScale = numberToBigint(Math.pow(10, Math.floor(Math.log10(bigintToNumber(stepRaw, decimals)))), decimals);
  const step = bigMath.divRound(stepRaw, stepScale) * stepScale;
  // console.log(step);
  // return null;

  const leftStart = bigMath.divRound(midPriceBigInt, spanScale) * spanScale - step;
  const rightStart = bigMath.divRound(midPriceBigInt, spanScale) * spanScale + step;

  for (let i = leftStart; i > lowPrice; i -= step) {
    ticks.push(bigintToNumber(i, decimals));
  }

  ticks.push(midPrice);
  marketPriceIndex = ticks.length - 1;

  for (let i = rightStart; i < highPrice; i += step) {
    ticks.push(bigintToNumber(i, decimals));
  }

  return (
    <ResponsiveContainer
      onResize={(width) => {
        setTickCount(BigInt(Math.round(width / 120)));
      }}
      width="100%"
      height="100%"
    >
      <ComposedChart data={data} margin={CHART_MARGIN}>
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
        <Line
          dataKey="longDecreaseXorShortIncreaseSize"
          stroke={GREEN}
          opacity={0.3}
          strokeWidth={2}
          dot={isZeroPriceImpact ? renderLeftLineDot : false}
          isAnimationActive={false}
          activeDot={renderActiveDotSemiTransparent}
        />
        <ReferenceDot
          x={leftMinExecutionPrice}
          y={bigintToNumber(leftMin, USD_DECIMALS)}
          fill={GREEN}
          shape={<EdgeTick />}
        />
        <Area
          dataKey="longDecreaseAndShortIncreaseSize"
          stroke={GREEN}
          strokeWidth={isZeroPriceImpact ? 0 : 2}
          dot={isZeroPriceImpact ? renderLeftAreaDot : false}
          fill="url(#colorGreen)"
          isAnimationActive={false}
          activeDot={renderActiveDot}
        />
        <Area
          dataKey="longIncreaseAndShortDecreaseSize"
          stroke={RED}
          strokeWidth={isZeroPriceImpact ? 0 : 2}
          dot={isZeroPriceImpact ? renderRightAreaDot : false}
          fill="url(#colorRed)"
          isAnimationActive={false}
          activeDot={renderActiveDot}
        />
        <ReferenceDot
          x={rightMinExecutionPrice}
          y={bigintToNumber(rightMin, USD_DECIMALS)}
          fill={RED}
          shape={<EdgeTick />}
        />
        <Line
          dataKey="longIncreaseXorShortDecreaseSize"
          stroke={RED}
          opacity={0.3}
          strokeWidth={2}
          dot={isZeroPriceImpact ? renderRightLineDot : false}
          isAnimationActive={false}
          activeDot={renderActiveDotSemiTransparent}
        />

        <RechartsTooltip cursor={false} content={ChartTooltip} />
        <YAxis
          orientation="right"
          dataKey="size"
          axisLine={false}
          tickLine={false}
          tickMargin={2}
          tick={Y_AXIS_TICK}
          label={Y_AXIS_LABEL}
          domain={Y_AXIS_DOMAIN}
          tickFormatter={(value) => numberWithCommas(value / 1000)}
        />
        <XAxis
          dataKey="executionPrice"
          type="number"
          axisLine={false}
          tickLine={false}
          domain={xAxisDomain}
          allowDataOverflow
          allowDecimals={true}
          ticks={ticks}
          interval={0}
          tickMargin={7}
          tick={<Tick marketPriceIndex={marketPriceIndex} />}
        />
        <ReferenceLine
          x={bigintToNumber(getMidPrice(marketInfo.indexToken.prices), USD_DECIMALS)}
          label={ORACLE_PRICE_LABEL}
          stroke="#ffffff"
          opacity={0.6}
          strokeDasharray="2 2"
          ifOverflow="extendDomain"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

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

const renderActiveDot = (props: any) => {
  return <ActiveDot {...props} />;
};

const renderActiveDotSemiTransparent = (props: any) => {
  return <ActiveDot {...props} opacity={0.5} />;
};

const renderLeftAreaDot = (props: any) => {
  return <AreaDot {...props} side="left" />;
};

const renderRightAreaDot = (props: any) => {
  return <AreaDot {...props} side="right" />;
};

const renderLeftLineDot = (props: any) => {
  return <LineDot {...props} side="left" />;
};

const renderRightLineDot = (props: any) => {
  return <LineDot {...props} side="right" />;
};

function AreaDot(props: {
  cx: number;
  cy: number;
  stroke: string;
  fill: string;
  opacity: number;
  side: "left" | "right";
}) {
  const { side, cx, cy, stroke, fill, opacity } = props;

  const { top, height, width } = useOffset();

  if (cy === null) {
    return null;
  }

  return (
    <>
      <rect
        x={side === "left" ? 0 : cx}
        y={cy}
        width={side === "left" ? cx : width - cx}
        height={top + height - cy}
        fill={fill}
      />

      <path d={`M${cx},${cy}L${cx},${top + height}`} stroke={stroke} strokeWidth={2} opacity={opacity} />

      <path
        d={`M${side === "left" ? 0 : cx},${cy}L${side === "left" ? cx : width},${cy}`}
        stroke={stroke}
        strokeWidth={2}
        opacity={opacity}
      />
    </>
  );
}

function LineDot(props: { cx: number; cy: number; stroke: string; opacity: number; side: "left" | "right" }) {
  const { side, cx, cy, stroke, opacity } = props;

  const { top, height, width } = useOffset();

  if (cy === null) {
    return null;
  }

  const path = side === "left" ? `M${0},${cy}L${cx},${cy}` : `M${cx},${cy}L${width},${cy}`;

  return (
    <>
      <path d={`M${cx},${cy}L${cx},${top + height}`} stroke={stroke} strokeWidth={2} opacity={opacity} />

      <path d={path} stroke={stroke} strokeWidth={2} opacity={opacity} />
    </>
  );
}

function ActiveDot(props: any) {
  const { cx, cy, dataKey, fill, opacity } = props;

  const { top, height } = useOffset();

  if (cy === null) {
    return null;
  }

  return (
    <>
      <path
        d={`M${cx},${cy}L${cx},${top + height}`}
        stroke={fill}
        strokeDasharray="2 2"
        key={`dot-${dataKey}`}
        opacity={opacity}
      />
      <circle cx={cx} cy={cy} r={4} fill={fill} opacity={opacity} />
      <circle cx={cx} cy={cy} r={6} stroke={fill} strokeWidth={1} fill="none" opacity={opacity} />
    </>
  );
}

function Tick(props: any) {
  const { x, y, height, textAnchor, payload, verticalAnchor, index, marketPriceIndex } = props;

  const value = numberToBigint(payload.value as number, USD_DECIMALS);
  const visual = formatAmount(value, USD_DECIMALS, calculatePriceDecimals(value), false);

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
      {visual}
    </Text>
  );
}

function EdgeTick(props: ReferenceDotProps) {
  const { cx, cy, fill } = props;

  if (cy === undefined || cy === undefined) {
    return null;
  }

  return (
    <g>
      <line x1={cx} y1={cy - 8} x2={cx} y2={cy + 8} stroke={fill} strokeWidth={2} strokeLinecap="round" />
    </g>
  );
}
