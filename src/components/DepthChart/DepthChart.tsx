import { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  DotProps,
  LabelProps,
  Line,
  Tooltip as RechartsTooltip,
  ReferenceDot,
  ReferenceDotProps,
  ReferenceLine,
  ResponsiveContainer,
  Text,
  TextProps,
  XAxis,
  YAxis,
  YAxisProps,
} from "recharts";
import { useOffset, useViewBox, useYAxisWithFiniteDomainOrRandom } from "recharts/es6/context/chartLayoutContext";
import type { CategoricalChartFunc } from "recharts/types/chart/generateCategoricalChart";
import type { ImplicitLabelType } from "recharts/types/component/Label";
import type { AxisDomainItem, Margin } from "recharts/types/util/types";

import { USD_DECIMALS } from "config/factors";

import type { MarketInfo } from "domain/synthetics/markets/types";
import { getAvailableUsdLiquidityForPosition } from "domain/synthetics/markets/utils";
import { getNextPositionExecutionPrice } from "domain/synthetics/trade/utils/common";
import { getMidPrice } from "domain/tokens/utils";

import {
  bigintToNumber,
  calculateDisplayDecimals,
  expandDecimals,
  formatAmount,
  numberToBigint,
  numberWithCommas,
} from "lib/numbers";

import { bigMath } from "sdk/utils/bigmath";
import { getPriceImpactForPosition } from "sdk/utils/fees/priceImpact";
import { ChartTooltip, ChartTooltipHandle } from "./DepthChartTooltip";
import { GREEN } from "components/TVChartContainer/constants";
import { clamp } from "lib/numbers";

const RED = "#FF506A";

const Y_AXIS_LABEL: LabelProps = {
  value: "Size, k",
  position: "top",
  offset: 10,
  fill: "#ffffff",
  opacity: 0.7,
  dx: -3,
  fontSize: 12,
};
const Y_AXIS_DOMAIN: [AxisDomainItem, AxisDomainItem] = [0, "dataMax"];
const Y_AXIS_DOMAIN_ZERO_PRICE_IMPACT: [AxisDomainItem, AxisDomainItem] = [0, "auto"];

const ORACLE_PRICE_LABEL: ImplicitLabelType = {
  position: "bottom",
  offset: 28,
  value: "ORACLE PRICE",
  fill: "#ffffff",
  opacity: 0.7,
  fontSize: 10,
};

const DOLLAR: bigint = expandDecimals(1n, USD_DECIMALS);

const CHART_MARGIN: Margin = { bottom: 10, top: 20, right: 0 };
const TOOLTIP_WRAPPER_POSITION = { x: 0, y: 0 };
const Y_AXIS_TICK: YAxisProps["tick"] = { fill: "#ffffff", opacity: 0.7, fontSize: 12 };
const TICKS_SPACING = 120;
const DEFAULT_TICK_COUNT_BIGINT = 9n;
const LINE_PATH_ELLIPSIS = "3px 3px 3px 3px 3px 3px 1000%";
const DESKTOP_ZOOM_SPEED_COEFFICIENT = 0.001;
const TOUCH_ZOOM_SPEED_COEFFICIENT = 0.004;
const MIN_ZOOM = 1;
const MAX_ZOOM = 20;

const ZERO_PRICE_IMPACT_LEFT_MULTIPLIER_BIGINT = 9990n; // 0.999
const ZERO_PRICE_IMPACT_RIGHT_MULTIPLIER_BIGINT = 10010n; // 1.001
const FLOAT_PRECISION = 10000n;
const FLOAT_DECIMALS = 4;
const SIDE_POINTS_COUNT = 60n;
const MIN_FACTOR_THRESHOLD_BIGINT = 2000000000000000n;

export const DepthChart = memo(({ marketInfo }: { marketInfo: MarketInfo }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isZeroPriceImpact =
    marketInfo.positionImpactFactorPositive <= MIN_FACTOR_THRESHOLD_BIGINT &&
    marketInfo.positionImpactFactorNegative <= MIN_FACTOR_THRESHOLD_BIGINT;

  const [zoom, setZoom] = useState(1);
  const [isZooming, setIsZooming] = useState(false);

  useEffect(
    function listenWheel() {
      const container = containerRef.current;
      if (!container) {
        return;
      }

      const abortController = new AbortController();

      const wheelHandler = (event: WheelEvent) => {
        if (isZeroPriceImpact) {
          return;
        }
        event.preventDefault();
        setZoom((pZoom) => clamp(pZoom * Math.exp(-event.deltaY * DESKTOP_ZOOM_SPEED_COEFFICIENT), MIN_ZOOM, MAX_ZOOM));
      };

      container.addEventListener("wheel", wheelHandler, { passive: false, signal: abortController.signal });

      let isPressed = false;
      let prevTouchY = 0;
      let prevTouchX = 0;
      let gestureRecognizeState: "idle" | "vertical" | "horizontal" = "idle";
      let gestureRecognizeDistanceX = 0;
      let gestureRecognizeDistanceY = 0;

      const touchDownHandler = (event: TouchEvent) => {
        if (isZeroPriceImpact) {
          return;
        }

        event.preventDefault();
        isPressed = true;
        prevTouchY = event.touches[0].clientY;
        prevTouchX = event.touches[0].clientX;
        gestureRecognizeState = "idle";
        gestureRecognizeDistanceX = 0;
        gestureRecognizeDistanceY = 0;
      };

      const touchUpHandler = (event: TouchEvent) => {
        if (isZeroPriceImpact) {
          return;
        }

        event.preventDefault();
        isPressed = false;
        prevTouchY = 0;
        prevTouchX = 0;
        gestureRecognizeState = "idle";
        gestureRecognizeDistanceX = 0;
        gestureRecognizeDistanceY = 0;
        setIsZooming(false);
      };

      const touchMoveHandler = (event: TouchEvent) => {
        if (isZeroPriceImpact) {
          return;
        }

        if (!isPressed) {
          return;
        }

        event.preventDefault();

        const deltaY = event.touches[0].clientY - prevTouchY;

        if (gestureRecognizeState === "idle") {
          const deltaX = event.touches[0].clientX - prevTouchX;

          gestureRecognizeDistanceX += deltaX;
          gestureRecognizeDistanceY += deltaY;

          const gestureRecognizeDistance = Math.sqrt(
            gestureRecognizeDistanceX * gestureRecognizeDistanceX +
              gestureRecognizeDistanceY * gestureRecognizeDistanceY
          );

          if (
            gestureRecognizeDistance > 10 &&
            Math.abs(gestureRecognizeDistanceY) > Math.abs(gestureRecognizeDistanceX)
          ) {
            gestureRecognizeState = "vertical";
            setZoom((pZoom) =>
              clamp(pZoom * Math.exp(-gestureRecognizeDistanceY * TOUCH_ZOOM_SPEED_COEFFICIENT), MIN_ZOOM, MAX_ZOOM)
            );
            setIsZooming(true);
          } else if (gestureRecognizeDistance > 10) {
            gestureRecognizeState = "horizontal";
          }
        } else if (gestureRecognizeState === "vertical") {
          setZoom((pZoom) => clamp(pZoom * Math.exp(-deltaY * TOUCH_ZOOM_SPEED_COEFFICIENT), MIN_ZOOM, MAX_ZOOM));
        }

        prevTouchY = event.touches[0].clientY;
      };

      container.addEventListener("touchstart", touchDownHandler, { passive: false, signal: abortController.signal });
      container.addEventListener("touchend", touchUpHandler, { passive: false, signal: abortController.signal });
      container.addEventListener("touchmove", touchMoveHandler, { passive: false, signal: abortController.signal });

      return () => {
        abortController.abort();
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

  const { ticks, marketPriceIndex, xAxisDomain, setTickCount } = useXAxis(marketInfo, {
    leftExecutionPrice: leftMaxExecutionPrice,
    rightExecutionPrice: rightMaxExecutionPrice,
    isZeroPriceImpact,
  });

  const { data, leftMinExecutionPrice, rightMinExecutionPrice } = useDepthChartPricesData(marketInfo, {
    leftMax,
    rightMax,
    leftMin,
    rightMin,
    isZeroPriceImpact,
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

  const tooltipRef = useRef<ChartTooltipHandle>(null);
  const lastMousePositionRef = useRef<{ x: number; y: number } | undefined>(undefined);

  const handleMouseMove = useCallback<CategoricalChartFunc>((nextState) => {
    if (!tooltipRef.current) {
      return;
    }

    tooltipRef.current.setMouseRelativePosition(nextState.chartX, nextState.chartY);

    if (nextState.chartX !== undefined && nextState.chartY !== undefined) {
      lastMousePositionRef.current = { x: nextState.chartX, y: nextState.chartY };
      document.dispatchEvent(
        new CustomEvent("chartMouseMove", { detail: { x: nextState.chartX, y: nextState.chartY } })
      );
    } else {
      lastMousePositionRef.current = undefined;
      document.dispatchEvent(new CustomEvent("chartMouseMove", { detail: undefined }));
    }
  }, []);

  return (
    <ResponsiveContainer onResize={handleResize} className="DepthChart" width="100%" height="100%" ref={containerRef}>
      <ComposedChart data={data} margin={CHART_MARGIN} onMouseMove={handleMouseMove}>
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
              dot={isZeroPriceImpact ? <LineDot side="left" /> : false}
              isAnimationActive={false}
              activeDot={
                isZeroPriceImpact ? (
                  <ActiveDotForZeroPriceImpact opacity={0.5} initialMousePositionRef={lastMousePositionRef} />
                ) : (
                  <ActiveDot opacity={0.5} />
                )
              }
              strokeDasharray={drawLeftTransparentEllipsis ? LINE_PATH_ELLIPSIS : undefined}
            />
            {!isZeroPriceImpact && (
              <ReferenceDot
                x={leftMinExecutionPrice}
                y={bigintToNumber(leftMin, USD_DECIMALS)}
                fill={GREEN}
                shape={<TransparentOpaqueSeparatorDot />}
              />
            )}
          </>
        )}
        <Area
          dataKey="leftOpaqueSize"
          stroke={GREEN}
          strokeWidth={isZeroPriceImpact ? 0 : 2}
          dot={isZeroPriceImpact ? <AreaDot side="left" /> : false}
          fill="url(#colorGreen)"
          isAnimationActive={false}
          activeDot={
            isZeroPriceImpact ? (
              <ActiveDotForZeroPriceImpact initialMousePositionRef={lastMousePositionRef} />
            ) : (
              <ActiveDot />
            )
          }
          strokeDasharray={drawLeftOpaqueEllipsis ? LINE_PATH_ELLIPSIS : undefined}
        />
        <Area
          dataKey="rightOpaqueSize"
          stroke={RED}
          strokeWidth={isZeroPriceImpact ? 0 : 2}
          dot={isZeroPriceImpact ? <AreaDot side="right" /> : false}
          fill="url(#colorRed)"
          isAnimationActive={false}
          activeDot={
            isZeroPriceImpact ? (
              <ActiveDotForZeroPriceImpact initialMousePositionRef={lastMousePositionRef} />
            ) : (
              <ActiveDot />
            )
          }
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
              dot={isZeroPriceImpact ? <LineDot side="right" /> : false}
              isAnimationActive={false}
              activeDot={
                isZeroPriceImpact ? (
                  <ActiveDotForZeroPriceImpact opacity={0.5} initialMousePositionRef={lastMousePositionRef} />
                ) : (
                  <ActiveDot opacity={0.5} />
                )
              }
              strokeDasharray={drawRightTransparentEllipsis ? LINE_PATH_ELLIPSIS : undefined}
            />
          </>
        )}

        <RechartsTooltip
          cursor={false}
          isAnimationActive={false}
          position={TOOLTIP_WRAPPER_POSITION}
          active={isZooming ? false : undefined}
          content={
            <ChartTooltip
              ref={tooltipRef}
              leftMin={leftMin}
              rightMin={rightMin}
              isZeroPriceImpact={isZeroPriceImpact}
            />
          }
        />
        <YAxis
          id="yAxis"
          orientation="right"
          dataKey="size"
          axisLine={false}
          tickLine={false}
          tickMargin={2}
          tick={Y_AXIS_TICK}
          label={Y_AXIS_LABEL}
          domain={isZeroPriceImpact ? Y_AXIS_DOMAIN_ZERO_PRICE_IMPACT : Y_AXIS_DOMAIN}
          interval={0}
          tickCount={15}
          allowDecimals={true}
          allowDataOverflow={false}
          tickFormatter={yAxisTickFormatter}
        />
        <XAxis
          dataKey="executionPrice"
          type="number"
          axisLine={false}
          tickLine={false}
          domain={xAxisDomain}
          allowDecimals={true}
          allowDataOverflow={false}
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

function AreaDot(props: Partial<DotProps> & { side: "left" | "right" }) {
  const { side, cx, cy, stroke, fill, opacity } = props as Required<typeof props>;

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

function LineDot(props: Partial<DotProps> & { side: "left" | "right" }) {
  const { side, cx, cy, stroke, opacity } = props as Required<typeof props>;

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

function ActiveDotForZeroPriceImpact(
  props: Partial<
    DotProps & {
      dataKey: "leftOpaqueSize" | "rightOpaqueSize" | "leftTransparentSize" | "rightTransparentSize";
      payload: DataPoint;
    }
  > & { initialMousePositionRef: { current: { x: number; y: number } | undefined } }
) {
  const { cx, cy, dataKey, fill, opacity, payload, initialMousePositionRef } = props as Required<typeof props>;

  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | undefined>(
    initialMousePositionRef.current
  );

  const { top, height } = useOffset();
  const viewBox = useViewBox();
  const yAxis = useYAxisWithFiniteDomainOrRandom();

  useEffect(() => {
    const handler = (event: CustomEvent<{ x: number; y: number } | undefined>) => {
      setMousePosition(event.detail);
    };

    document.addEventListener("chartMouseMove", handler);

    return () => {
      document.removeEventListener("chartMouseMove", handler);
    };
  }, []);

  if (cy === null) {
    return null;
  }

  const domainSpan = yAxis.niceTicks.at(-1)! - yAxis.niceTicks.at(0)!;

  let stats: DataPoint = payload as DataPoint;

  let isOpaqueCloser = true;
  let isLogicallyLeft = false;

  if (stats) {
    isLogicallyLeft = stats.leftTransparentSize !== null || stats.leftOpaqueSize !== null;

    const transparentSize: number | null = isLogicallyLeft ? stats.leftTransparentSize : stats.rightTransparentSize;

    const opaqueSize: number | null = isLogicallyLeft ? stats.leftOpaqueSize : stats.rightOpaqueSize;

    if (transparentSize !== null && opaqueSize !== null) {
      const transparentFloatY = viewBox.height - (transparentSize! / domainSpan) * viewBox.height + viewBox.y;
      const opaqueFloatY = viewBox.height - (opaqueSize! / domainSpan) * viewBox.height + viewBox.y;

      const distanceToTransparent = Math.abs((mousePosition?.y ?? 0) - transparentFloatY);
      const distanceToOpaque = Math.abs((mousePosition?.y ?? 0) - opaqueFloatY);

      isOpaqueCloser = distanceToOpaque < distanceToTransparent;
    }

    const isTransparentCloser = !isOpaqueCloser;
    const isOpaque = dataKey === "leftOpaqueSize" || dataKey === "rightOpaqueSize";
    const isTransparent = dataKey === "leftTransparentSize" || dataKey === "rightTransparentSize";

    let shouldShowDot = (isOpaqueCloser && isOpaque) || (isTransparentCloser && isTransparent);

    if (!shouldShowDot) {
      return null;
    }
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

function ActiveDot(
  props: Partial<
    DotProps & {
      dataKey: "leftOpaqueSize" | "rightOpaqueSize" | "leftTransparentSize" | "rightTransparentSize";
      payload: DataPoint;
    }
  >
) {
  const { cx, cy, dataKey, fill, opacity } = props as Required<typeof props>;

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

function Tick(
  props: Partial<TextProps & { index: number; payload: { value: number } }> & { marketPriceIndex: number | undefined }
) {
  const { x, y, height, textAnchor, payload, verticalAnchor, index, marketPriceIndex } = props as Required<
    typeof props
  >;

  const value = numberToBigint(payload.value, USD_DECIMALS);
  const visual = formatAmount(value, USD_DECIMALS, calculateDisplayDecimals(value), false);

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

function useDepthChartPricesData(
  marketInfo: MarketInfo,
  {
    leftMax,
    rightMax,
    leftMin,
    rightMin,
    isZeroPriceImpact,
  }: { leftMax: bigint; rightMax: bigint; leftMin: bigint; rightMin: bigint; isZeroPriceImpact: boolean }
) {
  let data: DataPoint[] = [];

  let leftMinExecutionPrice = 0;
  let rightMinExecutionPrice = 0;

  if (isZeroPriceImpact) {
    // need to calculate only 2 points
    // left

    const leftExecutionPrice = getNextPositionExecutionPrice({
      isIncrease: true,
      isLong: false,
      priceImpactUsd: 0n,
      sizeDeltaUsd: DOLLAR,
      triggerPrice: marketInfo.indexToken.prices.minPrice,
    })!;

    data.push({
      executionPrice: bigintToNumber(leftExecutionPrice, USD_DECIMALS),
      leftOpaqueSize: bigintToNumber(leftMin, USD_DECIMALS),
      leftOpaqueSizeBigInt: leftMin,
      size: bigintToNumber(leftMax, USD_DECIMALS),
      priceImpact: 0,
      rightOpaqueSize: null,
      rightOpaqueSizeBigInt: null,
      rightTransparentSize: null,
      rightTransparentSizeBigInt: null,
      leftTransparentSize: leftMax > leftMin ? bigintToNumber(leftMax, USD_DECIMALS) : null,
      leftTransparentSizeBigInt: leftMax > leftMin ? leftMax : null,
      sizeBigInt: leftMax,
      executionPriceBigInt: leftExecutionPrice,
      priceImpactBigInt: 0n,
    });

    // right

    const rightExecutionPrice = getNextPositionExecutionPrice({
      isIncrease: true,
      isLong: true,
      priceImpactUsd: 0n,
      sizeDeltaUsd: DOLLAR,
      triggerPrice: marketInfo.indexToken.prices.maxPrice,
    })!;

    data.push({
      executionPrice: bigintToNumber(rightExecutionPrice, USD_DECIMALS),
      rightOpaqueSize: bigintToNumber(rightMin, USD_DECIMALS),
      rightOpaqueSizeBigInt: rightMin,
      size: bigintToNumber(rightMax, USD_DECIMALS),
      priceImpact: 0,
      leftOpaqueSize: null,
      leftOpaqueSizeBigInt: null,
      rightTransparentSize: rightMax > rightMin ? bigintToNumber(rightMax, USD_DECIMALS) : null,
      rightTransparentSizeBigInt: rightMax > rightMin ? rightMax : null,
      leftTransparentSize: null,
      leftTransparentSizeBigInt: null,
      sizeBigInt: rightMax,
      executionPriceBigInt: rightExecutionPrice,
      priceImpactBigInt: 0n,
    });
  } else {
    const leftInc = (leftMax - DOLLAR) / SIDE_POINTS_COUNT;
    const rightInc = (rightMax - DOLLAR) / SIDE_POINTS_COUNT;

    // open short
    // from left to center
    for (let positionSize = leftMax; positionSize >= DOLLAR; positionSize -= leftInc) {
      const priceImpactUsd = getPriceImpactForPosition(marketInfo, positionSize, false, { fallbackToZero: true });

      const executionPrice = getNextPositionExecutionPrice({
        isIncrease: true,
        isLong: false,
        priceImpactUsd,
        sizeDeltaUsd: positionSize,
        triggerPrice: marketInfo.indexToken.prices.minPrice,
      })!;

      data.push({
        leftOpaqueSize: positionSize <= leftMin ? bigintToNumber(positionSize, USD_DECIMALS) : null,
        leftOpaqueSizeBigInt: positionSize <= leftMin ? positionSize : null,
        executionPrice: bigintToNumber(executionPrice, USD_DECIMALS),
        size: bigintToNumber(positionSize, USD_DECIMALS),
        priceImpact: bigintToNumber(priceImpactUsd, USD_DECIMALS),
        rightOpaqueSize: null,
        rightOpaqueSizeBigInt: null,
        rightTransparentSize: null,
        rightTransparentSizeBigInt: null,
        leftTransparentSize: positionSize > leftMin ? bigintToNumber(positionSize, USD_DECIMALS) : null,
        leftTransparentSizeBigInt: positionSize > leftMin ? positionSize : null,
        sizeBigInt: positionSize,
        executionPriceBigInt: executionPrice,
        priceImpactBigInt: priceImpactUsd,
      });

      if (positionSize - leftInc < leftMin && positionSize > leftMin && leftMin > DOLLAR) {
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

        data.push({
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

      if (positionSize - leftInc < DOLLAR && positionSize > DOLLAR) {
        const priceImpactUsd = getPriceImpactForPosition(marketInfo, DOLLAR, false, { fallbackToZero: true });

        const executionPrice = getNextPositionExecutionPrice({
          isIncrease: true,
          isLong: false,
          priceImpactUsd,
          sizeDeltaUsd: DOLLAR,
          triggerPrice: marketInfo.indexToken.prices.minPrice,
        })!;

        data.push({
          executionPrice: bigintToNumber(executionPrice, USD_DECIMALS),
          leftOpaqueSize: DOLLAR > leftMin ? null : bigintToNumber(DOLLAR, USD_DECIMALS),
          leftOpaqueSizeBigInt: DOLLAR > leftMin ? null : DOLLAR,
          size: bigintToNumber(DOLLAR, USD_DECIMALS),
          priceImpact: bigintToNumber(priceImpactUsd, USD_DECIMALS),
          rightOpaqueSize: null,
          rightOpaqueSizeBigInt: null,
          rightTransparentSize: null,
          rightTransparentSizeBigInt: null,
          leftTransparentSize: DOLLAR > leftMin ? bigintToNumber(DOLLAR, USD_DECIMALS) : null,
          leftTransparentSizeBigInt: DOLLAR > leftMin ? DOLLAR : null,
          sizeBigInt: DOLLAR,
          executionPriceBigInt: executionPrice,
          priceImpactBigInt: priceImpactUsd,
        });
      }
    }

    // open long
    // from right max to center
    for (let positionSize = rightMax; positionSize >= DOLLAR; positionSize -= rightInc) {
      const priceImpactUsd = getPriceImpactForPosition(marketInfo, positionSize, true, { fallbackToZero: true });

      const executionPrice = getNextPositionExecutionPrice({
        isIncrease: true,
        isLong: true,
        priceImpactUsd,
        sizeDeltaUsd: positionSize,
        triggerPrice: marketInfo.indexToken.prices.maxPrice,
      })!;

      data.push({
        executionPrice: bigintToNumber(executionPrice, USD_DECIMALS),
        rightOpaqueSize: positionSize <= rightMin ? bigintToNumber(positionSize, USD_DECIMALS) : null,
        rightOpaqueSizeBigInt: positionSize <= rightMin ? positionSize : null,
        size: bigintToNumber(positionSize, USD_DECIMALS),
        priceImpact: bigintToNumber(priceImpactUsd, USD_DECIMALS),
        leftOpaqueSize: null,
        leftOpaqueSizeBigInt: null,
        rightTransparentSize: positionSize > rightMin ? bigintToNumber(positionSize, USD_DECIMALS) : null,
        rightTransparentSizeBigInt: positionSize > rightMin ? positionSize : null,
        leftTransparentSize: null,
        leftTransparentSizeBigInt: null,
        sizeBigInt: positionSize,
        executionPriceBigInt: executionPrice,
        priceImpactBigInt: priceImpactUsd,
      });

      if (positionSize - rightInc < rightMin && positionSize > rightMin && rightMin > DOLLAR) {
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

        data.push({
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

      if (positionSize - rightInc < DOLLAR && positionSize > DOLLAR) {
        const priceImpactUsd = getPriceImpactForPosition(marketInfo, DOLLAR, true, { fallbackToZero: true });

        const executionPrice = getNextPositionExecutionPrice({
          isIncrease: true,
          isLong: true,
          priceImpactUsd,
          sizeDeltaUsd: DOLLAR,
          triggerPrice: marketInfo.indexToken.prices.maxPrice,
        })!;

        data.push({
          executionPrice: bigintToNumber(executionPrice, USD_DECIMALS),
          rightOpaqueSize: DOLLAR > rightMin ? null : bigintToNumber(DOLLAR, USD_DECIMALS),
          rightOpaqueSizeBigInt: DOLLAR > rightMin ? null : DOLLAR,
          size: bigintToNumber(DOLLAR, USD_DECIMALS),
          priceImpact: bigintToNumber(priceImpactUsd, USD_DECIMALS),
          leftOpaqueSize: null,
          leftOpaqueSizeBigInt: null,
          rightTransparentSize: DOLLAR > rightMin ? bigintToNumber(DOLLAR, USD_DECIMALS) : null,
          rightTransparentSizeBigInt: DOLLAR > rightMin ? DOLLAR : null,
          leftTransparentSize: null,
          leftTransparentSizeBigInt: null,
          sizeBigInt: DOLLAR,
          executionPriceBigInt: executionPrice,
          priceImpactBigInt: priceImpactUsd,
        });
      }
    }
  }
  return {
    data,
    leftMinExecutionPrice,
    rightMinExecutionPrice,
  };
}

function addLeftPaddingForZeroPriceImpact(price: bigint): bigint {
  return bigMath.mulDiv(price, ZERO_PRICE_IMPACT_LEFT_MULTIPLIER_BIGINT, FLOAT_PRECISION);
}

function addRightPaddingForZeroPriceImpact(price: bigint): bigint {
  return bigMath.mulDiv(price, ZERO_PRICE_IMPACT_RIGHT_MULTIPLIER_BIGINT, FLOAT_PRECISION);
}

function useXAxis(
  marketInfo: MarketInfo,
  {
    leftExecutionPrice,
    rightExecutionPrice,
    isZeroPriceImpact,
  }: {
    leftExecutionPrice: bigint;
    rightExecutionPrice: bigint;
    isZeroPriceImpact: boolean;
  }
) {
  const midPrice = getMidPrice(marketInfo.indexToken.prices);

  let lowPrice = isZeroPriceImpact ? addLeftPaddingForZeroPriceImpact(leftExecutionPrice) : leftExecutionPrice;
  let highPrice = isZeroPriceImpact ? addRightPaddingForZeroPriceImpact(rightExecutionPrice) : rightExecutionPrice;
  let span = highPrice - lowPrice;

  let lowPriceFloat = bigintToNumber(lowPrice, USD_DECIMALS);
  let highPriceFloat = bigintToNumber(highPrice, USD_DECIMALS);

  const [tickCount, setTickCount] = useState(DEFAULT_TICK_COUNT_BIGINT);

  const { ticks, marketPriceIndex } = calculateTicks({
    span,
    tickCount,
    midPrice,
    lowPrice,
    highPrice,
  });

  return { ticks, marketPriceIndex, xAxisDomain: [lowPriceFloat, highPriceFloat], setTickCount };
}

function calculateTicks({
  span,
  tickCount,
  midPrice,
  lowPrice,
  highPrice,
}: {
  span: bigint;
  tickCount: bigint;
  midPrice: bigint;
  lowPrice: bigint;
  highPrice: bigint;
  gap?: [bigint, bigint];
}) {
  const midPriceFloat = bigintToNumber(midPrice, USD_DECIMALS);
  const stepRaw = bigMath.divRound(span, tickCount);

  const stepScale = numberToBigint(
    Math.pow(10, Math.floor(Math.log10(bigintToNumber(stepRaw, USD_DECIMALS)))),
    USD_DECIMALS
  );
  const step = bigMath.divRound(stepRaw, stepScale) * stepScale;

  let ticks: number[] = [];
  let marketPriceIndex: number | undefined;

  const midPriceInSpan = midPrice >= lowPrice && midPrice <= highPrice;

  if (midPriceInSpan) {
    const leftStart = bigMath.divRound(midPrice, stepScale) * stepScale - step;
    const rightStart = bigMath.divRound(midPrice, stepScale) * stepScale + step;
    for (let i = leftStart; i > lowPrice; i -= step) {
      ticks.unshift(bigintToNumber(i, USD_DECIMALS));
    }

    ticks.push(midPriceFloat);
    marketPriceIndex = ticks.length - 1;

    for (let i = rightStart; i < highPrice; i += step) {
      ticks.push(bigintToNumber(i, USD_DECIMALS));
    }
  } else {
    // divide and ceil
    const leftStart = (lowPrice / stepScale + 1n) * stepScale;

    for (let i = leftStart; i < highPrice; i += step) {
      ticks.push(bigintToNumber(i, USD_DECIMALS));
    }
  }

  return { ticks, marketPriceIndex };
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

  let max = bigMath.max(realRightMax, realLeftMax);

  let rightMax = bigMath.min(realRightMax, bigMath.mulDiv(max, FLOAT_PRECISION, zoomBigInt));
  let leftMax = bigMath.min(realLeftMax, bigMath.mulDiv(max, FLOAT_PRECISION, zoomBigInt));

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
  // remove top tick because it contains decimals
  if (value % 1 !== 0) {
    return "";
  }

  return numberWithCommas(value / 1000);
}
