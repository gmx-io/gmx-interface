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
const Y_AXIS_DOMAIN: [AxisDomainItem, AxisDomainItem] = [0, "auto"];
const DEFAULT_X_AXIS_DOMAIN: [AxisDomainItem, AxisDomainItem] = ["dataMin", "dataMax"];

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
const TICKS_SPACING = 120;
const DEFAULT_TICK_COUNT_BIGINT = 9n;
const LINE_PATH_ELLIPSIS = "3px 3px 3px 3px 3px 3px 100%";

const ZERO_PRICE_IMPACT_LEFT_MULTIPLIER = 0.999;
const ZERO_PRICE_IMPACT_LEFT_MULTIPLIER_BIGINT = 9990n;
const ZERO_PRICE_IMPACT_RIGHT_MULTIPLIER = 1.001;
const ZERO_PRICE_IMPACT_RIGHT_MULTIPLIER_BIGINT = 10010n;
const FLOAT_PRECISION = 10000n;
const FLOAT_DECIMALS = 4;
const SIDE_POINTS_COUNT = 60n;

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

      const wheelHandler = (event: WheelEvent) => {
        event.preventDefault();
        if (isZeroPriceImpact) {
          return;
        }
        setZoom((pZoom) => clamp(pZoom * Math.exp(-event.deltaY * 0.001), 1, 20));
      };

      container.addEventListener("wheel", wheelHandler, { passive: false });

      let isPressed = false;
      let prevTouchY = 0;

      const touchDownHandler = (event: TouchEvent) => {
        if (isZeroPriceImpact) {
          return;
        }

        event.preventDefault();
        isPressed = true;
        prevTouchY = event.touches[0].clientY;
      };

      const touchUpHandler = (event: TouchEvent) => {
        if (isZeroPriceImpact) {
          return;
        }

        event.preventDefault();
        isPressed = false;
        prevTouchY = 0;
      };

      const touchMoveHandler = (event: TouchEvent) => {
        if (isZeroPriceImpact) {
          return;
        }

        if (isPressed) {
          event.preventDefault();
          const deltaY = event.touches[0].clientY - prevTouchY;
          prevTouchY = event.touches[0].clientY;
          setZoom((pZoom) => clamp(pZoom * Math.exp(-deltaY * 0.004), 1, 20));
        }
      };

      container.addEventListener("touchstart", touchDownHandler, { passive: false });
      container.addEventListener("touchend", touchUpHandler, { passive: false });
      container.addEventListener("touchmove", touchMoveHandler, { passive: false });
      return () => {
        container.removeEventListener("wheel", wheelHandler);
        container.removeEventListener("touchstart", touchDownHandler);
        container.removeEventListener("touchend", touchUpHandler);
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
      setTickCount(BigInt(Math.round(width / TICKS_SPACING)));
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
              dataKey="leftTransparentSize"
              stroke={GREEN}
              opacity={0.3}
              strokeWidth={2}
              dot={isZeroPriceImpact ? renderLeftLineDot : false}
              isAnimationActive={false}
              activeDot={renderActiveDotSemiTransparent}
              strokeDasharray={drawLeftTransparentEllipsis ? LINE_PATH_ELLIPSIS : undefined}
            />
            <ReferenceDot
              x={leftMinExecutionPrice}
              y={bigintToNumber(leftMin, USD_DECIMALS)}
              fill={GREEN}
              shape={<TransparentOpaqueSeparatorDot />}
            />
          </>
        )}
        <Area
          dataKey="leftOpaqueSize"
          stroke={GREEN}
          strokeWidth={isZeroPriceImpact ? 0 : 2}
          dot={isZeroPriceImpact ? renderLeftAreaDot : false}
          fill="url(#colorGreen)"
          isAnimationActive={false}
          activeDot={renderActiveDot}
          strokeDasharray={drawLeftOpaqueEllipsis ? LINE_PATH_ELLIPSIS : undefined}
        />
        <Area
          dataKey="rightOpaqueSize"
          stroke={RED}
          strokeWidth={isZeroPriceImpact ? 0 : 2}
          dot={isZeroPriceImpact ? renderRightAreaDot : false}
          fill="url(#colorRed)"
          isAnimationActive={false}
          activeDot={renderActiveDot}
          strokeDasharray={drawRightOpaqueEllipsis ? LINE_PATH_ELLIPSIS : undefined}
        />
        {drawRightTransparent && (
          <>
            <ReferenceDot
              x={rightMinExecutionPrice}
              y={bigintToNumber(rightMin, USD_DECIMALS)}
              fill={RED}
              shape={<TransparentOpaqueSeparatorDot />}
            />
            <Line
              dataKey="rightTransparentSize"
              stroke={RED}
              strokeWidth={2}
              opacity={0.3}
              dot={isZeroPriceImpact ? renderRightLineDot : false}
              isAnimationActive={false}
              activeDot={renderActiveDotSemiTransparent}
              strokeDasharray={drawRightTransparentEllipsis ? LINE_PATH_ELLIPSIS : undefined}
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
          tickFormatter={yAxisTickFormatter}
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

function TransparentOpaqueSeparatorDot(props: ReferenceDotProps) {
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
  rightOpaqueSize: number | null;
  rightOpaqueSizeBigInt: bigint | null;
  leftOpaqueSize: number | null;
  leftOpaqueSizeBigInt: bigint | null;
  rightTransparentSize: number | null;
  rightTransparentSizeBigInt: bigint | null;
  leftTransparentSize: number | null;
  leftTransparentSizeBigInt: bigint | null;
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

  const rightInc = (rightMax - DOLLAR) / SIDE_POINTS_COUNT;
  const leftInc = (leftMax - DOLLAR) / SIDE_POINTS_COUNT;

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
        rightOpaqueSize: bigintToNumber(rightMin, USD_DECIMALS),
        rightOpaqueSizeBigInt: rightMin,
        size: bigintToNumber(rightMax, USD_DECIMALS),
        priceImpact: bigintToNumber(priceImpactUsd, USD_DECIMALS),
        leftOpaqueSize: null,
        leftOpaqueSizeBigInt: null,
        rightTransparentSize: rightMax > rightMin ? bigintToNumber(rightMax, USD_DECIMALS) : null,
        rightTransparentSizeBigInt: rightMax > rightMin ? rightMax : null,
        leftTransparentSize: null,
        leftTransparentSizeBigInt: null,
        sizeBigInt: rightMax,
        executionPriceBigInt: executionPrice,
        priceImpactBigInt: priceImpactUsd,
      });

      break;
    }

    data.unshift({
      executionPrice: bigintToNumber(executionPrice, USD_DECIMALS),
      rightOpaqueSize: i < rightMin ? bigintToNumber(i, USD_DECIMALS) : null,
      rightOpaqueSizeBigInt: i < rightMin ? i : null,
      size: bigintToNumber(i, USD_DECIMALS),
      priceImpact: bigintToNumber(priceImpactUsd, USD_DECIMALS),
      leftOpaqueSize: null,
      leftOpaqueSizeBigInt: null,
      rightTransparentSize: i > rightMin ? bigintToNumber(i, USD_DECIMALS) : null,
      rightTransparentSizeBigInt: i > rightMin ? i : null,
      leftTransparentSize: null,
      leftTransparentSizeBigInt: null,
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
        rightOpaqueSize: bigintToNumber(rightMin, USD_DECIMALS),
        rightOpaqueSizeBigInt: rightMin,
        size: bigintToNumber(rightMin, USD_DECIMALS),
        priceImpact: bigintToNumber(priceImpactUsd, USD_DECIMALS),
        leftOpaqueSize: null,
        leftOpaqueSizeBigInt: null,
        rightTransparentSize: bigintToNumber(rightMin, USD_DECIMALS),
        rightTransparentSizeBigInt: rightMin,
        leftTransparentSize: null,
        leftTransparentSizeBigInt: null,

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
        rightOpaqueSize: rightMax > rightMin ? null : bigintToNumber(rightMax, USD_DECIMALS),
        rightOpaqueSizeBigInt: rightMax > rightMin ? null : rightMax,
        size: bigintToNumber(rightMax, USD_DECIMALS),
        priceImpact: bigintToNumber(priceImpactUsd, USD_DECIMALS),
        leftOpaqueSize: null,
        leftOpaqueSizeBigInt: null,
        rightTransparentSize: rightMax > rightMin ? bigintToNumber(rightMax, USD_DECIMALS) : null,
        rightTransparentSizeBigInt: rightMax > rightMin ? rightMax : null,
        leftTransparentSize: null,
        leftTransparentSizeBigInt: null,

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
        leftOpaqueSize: bigintToNumber(leftMin, USD_DECIMALS),
        leftOpaqueSizeBigInt: leftMin,
        size: bigintToNumber(leftMax, USD_DECIMALS),
        priceImpact: bigintToNumber(priceImpactUsd, USD_DECIMALS),
        rightOpaqueSize: null,
        rightOpaqueSizeBigInt: null,
        rightTransparentSize: null,
        rightTransparentSizeBigInt: null,
        leftTransparentSize: leftMax > leftMin ? bigintToNumber(leftMax, USD_DECIMALS) : null,
        leftTransparentSizeBigInt: leftMax > leftMin ? leftMax : null,
        sizeBigInt: leftMax,
        executionPriceBigInt: executionPrice,
        priceImpactBigInt: priceImpactUsd,
      });

      break;
    }

    data.unshift({
      leftOpaqueSize: i < leftMin ? bigintToNumber(i, USD_DECIMALS) : null,
      leftOpaqueSizeBigInt: i < leftMin ? i : null,
      executionPrice: bigintToNumber(executionPrice, USD_DECIMALS),
      size: bigintToNumber(i, USD_DECIMALS),
      priceImpact: bigintToNumber(priceImpactUsd, USD_DECIMALS),
      rightOpaqueSize: null,
      rightOpaqueSizeBigInt: null,
      rightTransparentSize: null,
      rightTransparentSizeBigInt: null,
      leftTransparentSize: i > leftMin ? bigintToNumber(i, USD_DECIMALS) : null,
      leftTransparentSizeBigInt: i > leftMin ? i : null,
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
        leftOpaqueSize: bigintToNumber(leftMin, USD_DECIMALS),
        leftOpaqueSizeBigInt: leftMin,
        size: bigintToNumber(leftMin, USD_DECIMALS),
        priceImpact: bigintToNumber(priceImpactUsd, USD_DECIMALS),
        rightOpaqueSize: null,
        rightOpaqueSizeBigInt: null,
        rightTransparentSize: null,
        rightTransparentSizeBigInt: null,
        leftTransparentSize: bigintToNumber(leftMin, USD_DECIMALS),
        leftTransparentSizeBigInt: leftMin,

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
        leftOpaqueSize: leftMax > leftMin ? null : bigintToNumber(leftMax, USD_DECIMALS),
        leftOpaqueSizeBigInt: leftMax > leftMin ? null : leftMax,
        size: bigintToNumber(leftMax, USD_DECIMALS),
        priceImpact: bigintToNumber(priceImpactUsd, USD_DECIMALS),
        rightOpaqueSize: null,
        rightOpaqueSizeBigInt: null,
        rightTransparentSize: null,
        rightTransparentSizeBigInt: null,
        leftTransparentSize: leftMax > leftMin ? bigintToNumber(leftMax, USD_DECIMALS) : null,
        leftTransparentSizeBigInt: leftMax > leftMin ? leftMax : null,
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
    ? [minPriceFloat * ZERO_PRICE_IMPACT_LEFT_MULTIPLIER, maxPriceFloat * ZERO_PRICE_IMPACT_RIGHT_MULTIPLIER]
    : DEFAULT_X_AXIS_DOMAIN;

  let lowPrice = isZeroPriceImpact
    ? bigMath.mulDiv(leftExecutionPrice, ZERO_PRICE_IMPACT_LEFT_MULTIPLIER_BIGINT, FLOAT_PRECISION)
    : leftExecutionPrice;
  let highPrice = isZeroPriceImpact
    ? bigMath.mulDiv(rightExecutionPrice, ZERO_PRICE_IMPACT_RIGHT_MULTIPLIER_BIGINT, FLOAT_PRECISION)
    : rightExecutionPrice;
  let marketPriceIndex: number | undefined;

  // eslint-disable-next-line react-perf/jsx-no-new-array-as-prop
  let ticks: number[] = [];

  const decimals = USD_DECIMALS;
  const span = highPrice - lowPrice;

  const [tickCount, setTickCount] = useState(DEFAULT_TICK_COUNT_BIGINT);

  const stepRaw = bigMath.divRound(span, tickCount);
  const stepScale = numberToBigint(Math.pow(10, Math.floor(Math.log10(bigintToNumber(stepRaw, decimals)))), decimals);
  const step = bigMath.divRound(stepRaw, stepScale) * stepScale;

  if (midPrice >= lowPrice && midPriceFloat <= highPrice) {
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
  } else {
    // divide and ceil
    const leftStart = (lowPrice / stepScale + 1n) * stepScale;

    for (let i = leftStart; i < highPrice; i += step) {
      ticks.push(bigintToNumber(i, decimals));
    }
  }

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
  const leftMin = shortLiquidity;
  const rightMin = longLiquidity;
  const realRightMax = bigMath.max(marketInfo.shortInterestUsd, longLiquidity);

  const zoomBigInt = numberToBigint(zoom, FLOAT_DECIMALS);

  const rightMax = bigMath.min(realRightMax, bigMath.mulDiv(realRightMax, FLOAT_PRECISION, zoomBigInt));
  const leftMax = bigMath.min(realLeftMax, bigMath.mulDiv(realLeftMax, FLOAT_PRECISION, zoomBigInt));

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

function yAxisTickFormatter(value: number) {
  return numberWithCommas(value / 1000);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}
