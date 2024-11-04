import { memo, useCallback, useEffect, useRef, useState } from "react";
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
  XAxis,
  YAxis,
  YAxisProps,
} from "recharts";
import { useOffset } from "recharts/es6/context/chartLayoutContext";
import type { ImplicitLabelType } from "recharts/types/component/Label";
import type { AxisDomain, AxisDomainItem, Margin } from "recharts/types/util/types";

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

import { ChartTooltip } from "./DepthChartTooltip";

const GREEN = "#0ECC83";
const RED = "#FF506A";

const Y_AXIS_LABEL: LabelProps = {
  value: "Scale, k",
  position: "top",
  offset: 10,
  fill: "#ffffff",
  opacity: 0.7,
  dx: 1,
  fontSize: 12,
};
const Y_AXIS_DOMAIN: [AxisDomainItem, AxisDomainItem] = [0, "auto"] as const;

const ORACLE_PRICE_LABEL: ImplicitLabelType = {
  position: "bottom",
  offset: 28,
  value: "ORACLE PRICE",
  fill: "#ffffff",
  opacity: 0.7,
  fontSize: 10,
};

const DOLLAR: bigint = expandDecimals(1n, USD_DECIMALS);

const CHART_MARGIN: Margin = { bottom: 10, top: 20 };
const Y_AXIS_TICK: YAxisProps["tick"] = { fill: "#ffffff", opacity: 0.7, fontSize: 12 };

export const DepthChart = memo(({ marketInfo }: { marketInfo: MarketInfo }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isZeroPriceImpact =
    marketInfo.positionImpactFactorPositive === 0n && marketInfo.positionImpactFactorNegative === 0n;

  const [zoom, setZoom] = useState(1);

  useEffect(
    function listenWheel() {
      const container = containerRef.current;
      if (!container) {
        return;
      }

      const handler = (event: WheelEvent) => {
        event.preventDefault();
        if (isZeroPriceImpact) {
          return;
        }
        setZoom((pZoom) => Math.min(Math.max(1, pZoom * Math.exp(-event.deltaY * 0.001)), 20));
      };

      container.addEventListener("wheel", handler, { passive: false });

      return () => {
        container.removeEventListener("wheel", handler);
      };
    },
    [isZeroPriceImpact]
  );

  const {
    leftMaxExecutionPrice,
    rightMaxExecutionPrice,
    leftMax,
    rightMax,
    leftMin,
    rightMin,
    realLeftMax,
    realRightMax,
  } = useEdgePoints(marketInfo, zoom);

  const { ticks, marketPriceIndex, xAxisDomain, setTickCount } = useTicks(marketInfo, {
    leftExecutionPrice: leftMaxExecutionPrice,
    rightExecutionPrice: rightMaxExecutionPrice,
    isZeroPriceImpact,
  });

  const { data, leftMinExecutionPrice, rightMinExecutionPrice } = useDepthChart(marketInfo, {
    leftMax,
    rightMax,
    leftMin,
    rightMin,
  });

  const drawLeftTransparent = leftMax > leftMin;
  const drawRightTransparent = rightMax > rightMin;

  const drawLeftTransparentEllipsis = leftMax < realLeftMax;
  const drawRightTransparentEllipsis = rightMax < realRightMax;

  const drawLeftOpaqueEllipsis = leftMax < leftMin;
  const drawRightOpaqueEllipsis = rightMax < rightMin;

  const handleResize = useCallback(
    (width: number) => {
      setTickCount(BigInt(Math.round(width / 120)));
    },
    [setTickCount]
  );

  useEffect(() => {
    setZoom(1);
  }, [marketInfo.marketTokenAddress]);

  return (
    <ResponsiveContainer onResize={handleResize} width="100%" height="100%" ref={containerRef}>
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

        {drawLeftTransparent && (
          <>
            <Line
              dataKey="longDecreaseXorShortIncreaseSize"
              stroke={GREEN}
              opacity={0.3}
              strokeWidth={2}
              dot={isZeroPriceImpact ? renderLeftLineDot : false}
              isAnimationActive={false}
              activeDot={renderActiveDotSemiTransparent}
              strokeDasharray={drawLeftTransparentEllipsis ? "3px 3px 3px 3px 3px 3px 100%" : undefined}
            />
            <ReferenceDot
              x={leftMinExecutionPrice}
              y={bigintToNumber(leftMin, USD_DECIMALS)}
              fill={GREEN}
              shape={<EdgeTick />}
            />
          </>
        )}
        <Area
          dataKey="longDecreaseAndShortIncreaseSize"
          stroke={GREEN}
          strokeWidth={isZeroPriceImpact ? 0 : 2}
          dot={isZeroPriceImpact ? renderLeftAreaDot : false}
          fill="url(#colorGreen)"
          isAnimationActive={false}
          activeDot={renderActiveDot}
          strokeDasharray={drawLeftOpaqueEllipsis ? "3px 3px 3px 3px 3px 3px 100%" : undefined}
        />
        <Area
          dataKey="longIncreaseAndShortDecreaseSize"
          stroke={RED}
          strokeWidth={isZeroPriceImpact ? 0 : 2}
          dot={isZeroPriceImpact ? renderRightAreaDot : false}
          fill="url(#colorRed)"
          isAnimationActive={false}
          activeDot={renderActiveDot}
          strokeDasharray={drawRightOpaqueEllipsis ? "3px 3px 3px 3px 3px 3px 100%" : undefined}
        />
        {drawRightTransparent && (
          <>
            <ReferenceDot
              x={rightMinExecutionPrice}
              y={bigintToNumber(rightMin, USD_DECIMALS)}
              fill={RED}
              shape={<EdgeTick />}
            />
            <Line
              dataKey="longIncreaseXorShortDecreaseSize"
              stroke={RED}
              strokeWidth={2}
              opacity={0.3}
              dot={isZeroPriceImpact ? renderRightLineDot : false}
              isAnimationActive={false}
              activeDot={renderActiveDotSemiTransparent}
              strokeDasharray={drawRightTransparentEllipsis ? "3px 3px 3px 3px 3px 3px 100%" : undefined}
            />
          </>
        )}

        <RechartsTooltip
          cursor={false}
          content={<ChartTooltip leftMin={leftMin} rightMin={rightMin} isZeroPriceImpact={isZeroPriceImpact} />}
        />
        <YAxis
          orientation="right"
          dataKey="size"
          axisLine={false}
          tickLine={false}
          tickMargin={2}
          tick={Y_AXIS_TICK}
          label={Y_AXIS_LABEL}
          domain={Y_AXIS_DOMAIN}
          allowDataOverflow
          includeHidden={false}
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
});

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

export type DataPoint = {
  size: number;
  sizeBigInt: bigint;
  longIncreaseAndShortDecreaseSize: number | null;
  longDecreaseAndShortIncreaseSize: number | null;
  longIncreaseXorShortDecreaseSize: number | null;
  longDecreaseXorShortIncreaseSize: number | null;
  executionPrice: number;
  executionPriceBigInt: bigint;
  priceImpact: number;
  priceImpactBigInt: bigint;
};

function useDepthChart(
  marketInfo: MarketInfo,
  { leftMax, rightMax, leftMin, rightMin }: { leftMax: bigint; rightMax: bigint; leftMin: bigint; rightMin: bigint }
) {
  let data: DataPoint[] = [];

  let leftMinExecutionPrice = 0;
  let rightMinExecutionPrice = 0;

  const rightInc = (rightMax - DOLLAR) / 60n;
  const leftInc = (leftMax - DOLLAR) / 60n;

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
        size: bigintToNumber(rightMax, USD_DECIMALS),
        priceImpact: bigintToNumber(priceImpactUsd, USD_DECIMALS),
        longDecreaseAndShortIncreaseSize: null,
        longIncreaseXorShortDecreaseSize: Math.abs(bigintToNumber(rightMax, USD_DECIMALS)),
        longDecreaseXorShortIncreaseSize: null,

        sizeBigInt: rightMax,
        executionPriceBigInt: executionPrice,
        priceImpactBigInt: priceImpactUsd,
      });

      break;
    }

    data.unshift({
      executionPrice: bigintToNumber(executionPrice, USD_DECIMALS),
      longIncreaseAndShortDecreaseSize: i < rightMin ? Math.abs(bigintToNumber(i, USD_DECIMALS)) : null,
      size: Math.abs(bigintToNumber(i, USD_DECIMALS)),
      priceImpact: bigintToNumber(priceImpactUsd, USD_DECIMALS),
      longDecreaseAndShortIncreaseSize: null,
      longIncreaseXorShortDecreaseSize: i > rightMin ? Math.abs(bigintToNumber(i, USD_DECIMALS)) : null,
      longDecreaseXorShortIncreaseSize: null,

      sizeBigInt: i,
      executionPriceBigInt: executionPrice,
      priceImpactBigInt: priceImpactUsd,
    });

    if (i + rightInc > rightMin && i < rightMin) {
      const priceImpactUsd = getPriceImpactForPosition(marketInfo, rightMin, true, {
        fallbackToZero: true,
      });

      const executionPrice = getNextPositionExecutionPrice({
        isIncrease: true,
        isLong: true,
        priceImpactUsd,
        sizeDeltaUsd: rightMin,
        triggerPrice: marketInfo.indexToken.prices.maxPrice,
      })!;

      rightMinExecutionPrice = bigintToNumber(executionPrice, USD_DECIMALS);

      data.unshift({
        executionPrice: bigintToNumber(executionPrice, USD_DECIMALS),
        longIncreaseAndShortDecreaseSize: Math.abs(bigintToNumber(rightMin, USD_DECIMALS)),
        size: Math.abs(bigintToNumber(rightMin, USD_DECIMALS)),
        priceImpact: bigintToNumber(priceImpactUsd, USD_DECIMALS),
        longDecreaseAndShortIncreaseSize: null,
        longIncreaseXorShortDecreaseSize: Math.abs(bigintToNumber(rightMin, USD_DECIMALS)),
        longDecreaseXorShortIncreaseSize: null,

        sizeBigInt: rightMin,
        executionPriceBigInt: executionPrice,
        priceImpactBigInt: priceImpactUsd,
      });
    }

    if (i + rightInc >= rightMax) {
      const priceImpactUsd = getPriceImpactForPosition(marketInfo, rightMax, true, { fallbackToZero: true });

      const executionPrice = getNextPositionExecutionPrice({
        isIncrease: true,
        isLong: true,
        priceImpactUsd,
        sizeDeltaUsd: rightMax,
        triggerPrice: marketInfo.indexToken.prices.maxPrice,
      })!;

      data.unshift({
        executionPrice: bigintToNumber(executionPrice, USD_DECIMALS),
        longIncreaseAndShortDecreaseSize: rightMax > rightMin ? null : Math.abs(bigintToNumber(rightMax, USD_DECIMALS)),
        size: Math.abs(bigintToNumber(rightMax, USD_DECIMALS)),
        priceImpact: bigintToNumber(priceImpactUsd, USD_DECIMALS),
        longDecreaseAndShortIncreaseSize: null,
        longIncreaseXorShortDecreaseSize: rightMax > rightMin ? Math.abs(bigintToNumber(rightMax, USD_DECIMALS)) : null,
        longDecreaseXorShortIncreaseSize: null,

        sizeBigInt: rightMax,
        executionPriceBigInt: executionPrice,
        priceImpactBigInt: priceImpactUsd,
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

        sizeBigInt: leftMax,
        executionPriceBigInt: executionPrice,
        priceImpactBigInt: priceImpactUsd,
      });

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

      sizeBigInt: i,
      executionPriceBigInt: executionPrice,
      priceImpactBigInt: priceImpactUsd,
    });

    if (i + leftInc > leftMin && i < leftMin) {
      const priceImpactUsd = getPriceImpactForPosition(marketInfo, leftMin, false, {
        fallbackToZero: true,
      });
      const executionPrice = getNextPositionExecutionPrice({
        isIncrease: true,
        isLong: false,
        priceImpactUsd,
        sizeDeltaUsd: leftMin,
        triggerPrice: marketInfo.indexToken.prices.minPrice,
      })!;

      leftMinExecutionPrice = bigintToNumber(executionPrice, USD_DECIMALS);

      data.unshift({
        executionPrice: bigintToNumber(executionPrice, USD_DECIMALS),
        longDecreaseAndShortIncreaseSize: Math.abs(bigintToNumber(leftMin, USD_DECIMALS)),
        size: Math.abs(bigintToNumber(leftMin, USD_DECIMALS)),
        priceImpact: bigintToNumber(priceImpactUsd, USD_DECIMALS),
        longIncreaseAndShortDecreaseSize: null,
        longIncreaseXorShortDecreaseSize: null,
        longDecreaseXorShortIncreaseSize: Math.abs(bigintToNumber(leftMin, USD_DECIMALS)),

        sizeBigInt: leftMin,
        executionPriceBigInt: executionPrice,
        priceImpactBigInt: priceImpactUsd,
      });
    }

    if (i + leftInc >= leftMax) {
      const priceImpactUsd = getPriceImpactForPosition(marketInfo, leftMax, false, { fallbackToZero: true });

      const executionPrice = getNextPositionExecutionPrice({
        isIncrease: true,
        isLong: false,
        priceImpactUsd,
        sizeDeltaUsd: leftMax,
        triggerPrice: marketInfo.indexToken.prices.minPrice,
      })!;

      data.unshift({
        executionPrice: bigintToNumber(executionPrice, USD_DECIMALS),
        longDecreaseAndShortIncreaseSize: leftMax > leftMin ? null : Math.abs(bigintToNumber(leftMax, USD_DECIMALS)),
        size: Math.abs(bigintToNumber(leftMax, USD_DECIMALS)),
        priceImpact: bigintToNumber(priceImpactUsd, USD_DECIMALS),
        longIncreaseAndShortDecreaseSize: null,
        longIncreaseXorShortDecreaseSize: null,
        longDecreaseXorShortIncreaseSize: leftMax > leftMin ? Math.abs(bigintToNumber(leftMax, USD_DECIMALS)) : null,

        sizeBigInt: leftMax,
        executionPriceBigInt: executionPrice,
        priceImpactBigInt: priceImpactUsd,
      });
    }
  }

  return {
    data,
    leftMinExecutionPrice,
    rightMinExecutionPrice,
    leftMin,
    rightMin,
  };
}

function useTicks(
  marketInfo: MarketInfo,
  {
    leftExecutionPrice,
    rightExecutionPrice,
    isZeroPriceImpact,
  }: { leftExecutionPrice: bigint; rightExecutionPrice: bigint; isZeroPriceImpact: boolean }
) {
  const minPrice = marketInfo.indexToken.prices.minPrice;
  const midPrice = getMidPrice(marketInfo.indexToken.prices);
  const maxPrice = marketInfo.indexToken.prices.maxPrice;

  const minPriceFloat = bigintToNumber(minPrice, USD_DECIMALS);
  const midPriceFloat = bigintToNumber(midPrice, USD_DECIMALS);
  const maxPriceFloat = bigintToNumber(maxPrice, USD_DECIMALS);

  const xAxisDomain: AxisDomain = isZeroPriceImpact
    ? [minPriceFloat * 0.999, maxPriceFloat * 1.001]
    : ["dataMin", "dataMax"];

  let lowPrice = isZeroPriceImpact ? bigMath.mulDiv(leftExecutionPrice, 999n, 1000n) : leftExecutionPrice;
  let highPrice = isZeroPriceImpact ? bigMath.mulDiv(rightExecutionPrice, 1001n, 1000n) : rightExecutionPrice;
  let marketPriceIndex;

  // eslint-disable-next-line react-perf/jsx-no-new-array-as-prop
  let ticks: number[] = [];

  const decimals = USD_DECIMALS;
  const span = highPrice - lowPrice;

  const [tickCount, setTickCount] = useState(9n);

  const stepRaw = bigMath.divRound(span, tickCount);
  const stepScale = numberToBigint(Math.pow(10, Math.floor(Math.log10(bigintToNumber(stepRaw, decimals)))), decimals);
  const step = bigMath.divRound(stepRaw, stepScale) * stepScale;

  const leftStart = bigMath.divRound(midPrice, stepScale) * stepScale - step;
  const rightStart = bigMath.divRound(midPrice, stepScale) * stepScale + step;

  for (let i = leftStart; i > lowPrice; i -= step) {
    ticks.unshift(bigintToNumber(i, decimals));
  }

  ticks.push(midPriceFloat);
  marketPriceIndex = ticks.length - 1;

  for (let i = rightStart; i < highPrice; i += step) {
    ticks.push(bigintToNumber(i, decimals));
  }

  // console.log({ ticks });

  return { ticks, marketPriceIndex, xAxisDomain, setTickCount };
}

function useEdgePoints(
  marketInfo: MarketInfo,
  zoom: number
): {
  leftMaxExecutionPrice: bigint;
  rightMaxExecutionPrice: bigint;
  leftMax: bigint;
  rightMax: bigint;
  leftMin: bigint;
  rightMin: bigint;
  realLeftMax: bigint;
  realRightMax: bigint;
} {
  const longLiquidity = getAvailableUsdLiquidityForPosition(marketInfo, true);
  const shortLiquidity = getAvailableUsdLiquidityForPosition(marketInfo, false);

  const realLeftMax = bigMath.max(marketInfo.longInterestUsd, shortLiquidity);
  const leftMin = longLiquidity;
  const rightMin = shortLiquidity;
  const realRightMax = bigMath.max(marketInfo.shortInterestUsd, longLiquidity);

  const zoomBigInt = numberToBigint(zoom, 4);

  const rightMax = bigMath.min(realRightMax, bigMath.mulDiv(realRightMax, 10000n, zoomBigInt));
  const leftMax = bigMath.min(realLeftMax, bigMath.mulDiv(realLeftMax, 10000n, zoomBigInt));

  let leftMaxExecutionPrice = 0n;
  let rightMaxExecutionPrice = 0n;

  {
    const priceImpactUsd = getPriceImpactForPosition(marketInfo, rightMax, true, { fallbackToZero: true });

    const executionPrice = getNextPositionExecutionPrice({
      isIncrease: true,
      isLong: true,
      priceImpactUsd,
      sizeDeltaUsd: rightMax,
      triggerPrice: marketInfo.indexToken.prices.maxPrice,
    })!;

    rightMaxExecutionPrice = executionPrice;
  }

  {
    const priceImpactUsd = getPriceImpactForPosition(marketInfo, leftMax, false, { fallbackToZero: true });

    const executionPrice = getNextPositionExecutionPrice({
      isIncrease: true,
      isLong: false,
      priceImpactUsd,
      sizeDeltaUsd: leftMax,
      triggerPrice: marketInfo.indexToken.prices.minPrice,
    })!;

    leftMaxExecutionPrice = executionPrice;
  }

  return {
    leftMaxExecutionPrice,
    rightMaxExecutionPrice,
    leftMax,
    rightMax,
    leftMin,
    rightMin,
    realLeftMax,
    realRightMax,
  };
}
