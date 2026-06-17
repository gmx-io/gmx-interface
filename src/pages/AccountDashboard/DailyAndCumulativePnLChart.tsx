import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  TooltipProps,
  XAxis,
  YAxis,
} from "recharts";

import { useShowDebugValues } from "context/SyntheticsStateContext/hooks/settingsHooks";
import { clamp, formatUsd } from "lib/numbers";
import { getPositiveOrNegativeClass } from "lib/utils";

import Loader from "components/Loader/Loader";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";

import type { AccountPnlHistoryPoint } from "./DailyAndCumulativePnL";
import {
  formatPnlChartYAxisTick,
  getPnlChartAreaXAxisDomain,
  getPnlChartDragPanSpeed,
  getPnlChartWheelZoomSlowdown,
  getPnlChartYAxisTicks,
  getPnlChartYAxisTicksFromValues,
  getWheelDeltaPixels,
  getZoomedPnlHistoryData,
  normalizeZoomWindow,
  panPnlWindowByDelta,
  PNL_CHART_WHEEL_ZOOM_FACTOR,
  type PnlChartGrouping,
  type PnlZoomWindow,
  zoomPnlWindowAtRatio,
} from "./DailyAndCumulativePnL.utils";
import {
  DebugTooltip,
  getDebugCumulativePnlYAxisValues,
  getDebugPeriodPnlYAxisValues,
  renderDebugLines,
} from "./dailyAndCumulativePnLDebug";

const CHART_TOOLTIP_WRAPPER_STYLE: React.CSSProperties = { zIndex: 10000 };

const CHART_TICK_PROPS: React.SVGProps<SVGTextElement> = {
  fill: "var(--color-slate-100)",
  fontSize: 11,
  fontWeight: 500,
};

const CUMULATIVE_CHART_TICK_PROPS: React.SVGProps<SVGTextElement> = {
  ...CHART_TICK_PROPS,
  fill: "var(--color-blue-300)",
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

const ACTIVE_DOT_PROPS = {
  r: 4,
  strokeWidth: 2,
  stroke: "var(--color-blue-300)",
  fill: "var(--color-slate-900)",
};

const CHART_MARGIN = { top: 16, right: 16, bottom: 16, left: 0 };
const BAR_CATEGORY_GAP = "25%";
const DEBUG_BAR_CATEGORY_GAP = "10%";
const BAR_GAP = 4;
const DEBUG_BAR_GAP = -2;
const DRAGGING_DATA_ATTRIBUTE = "dragging";
const SUPPRESS_HOVER_DATA_ATTRIBUTE = "suppressHover";
const ZOOM_INTERACTION_RESET_DELAY = 250;
const TOUCH_TAP_MAX_DISTANCE = 10;
const TOUCH_DOUBLE_TAP_TIMEOUT = 350;
const TOUCH_PINCH_STEP_RATIO = 1.08;
// Browsers synthesize mouse events (including dblclick) shortly after taps when
// touch-action disables native double-tap zoom; ignore those so a double-tap doesn't zoom twice.
const TOUCH_SYNTHETIC_DOUBLE_CLICK_TIMEOUT = 700;

type ChartPnlHistoryPoint = AccountPnlHistoryPoint & {
  chartIndex: number;
};

export function DailyAndCumulativePnLChart({
  groupedPnlData,
  grouping,
  isMobile,
  loading,
  error,
  resetKey,
}: {
  groupedPnlData: AccountPnlHistoryPoint[];
  grouping: PnlChartGrouping;
  isMobile: boolean;
  loading: boolean;
  error?: Error;
  resetKey: string;
}) {
  const [zoomWindow, setZoomWindow] = useState<PnlZoomWindow | undefined>();
  const showDebugValues = useShowDebugValues();
  const chartInteractionRef = useRef<HTMLDivElement>(null);
  const lastTouchTapRef = useRef(0);
  const lastTouchEndRef = useRef(0);
  const wheelZoomAccumulatorRef = useRef<{ direction?: "in" | "out"; value: number }>({ value: 0 });
  const zoomInteractionResetTimeoutRef = useRef<number | undefined>();
  const mobileTapTooltipTimeoutRef = useRef<number | undefined>();

  // Mirrors the latest zoom window so gesture handlers can read and update it
  // synchronously between renders, keeping the setState updaters pure.
  const zoomWindowRef = useRef<PnlZoomWindow | undefined>(undefined);
  const applyZoomWindow = useCallback((nextWindow: PnlZoomWindow | undefined) => {
    zoomWindowRef.current = nextWindow;
    setZoomWindow(nextWindow);
  }, []);

  const normalizedZoomWindow = useMemo(
    () => normalizeZoomWindow(zoomWindow, groupedPnlData.length),
    [groupedPnlData.length, zoomWindow]
  );
  const chartPnlData = useMemo<ChartPnlHistoryPoint[]>(
    () =>
      groupedPnlData.map((point, chartIndex) => ({
        ...point,
        chartIndex,
      })),
    [groupedPnlData]
  );
  const visibleChartPnlData = useMemo(
    () => getZoomedPnlHistoryData(chartPnlData, normalizedZoomWindow),
    [chartPnlData, normalizedZoomWindow]
  );
  const visibleStartIndex = normalizedZoomWindow?.startIndex ?? 0;
  const visibleEndIndex = normalizedZoomWindow?.endIndex ?? Math.max(chartPnlData.length - 1, 0);
  const barXAxisDomain = useMemo<[number, number]>(
    () => [visibleStartIndex - 0.25, visibleEndIndex + 0.25],
    [visibleEndIndex, visibleStartIndex]
  );
  const areaXAxisDomain = useMemo<[number, number]>(
    () => getPnlChartAreaXAxisDomain(visibleStartIndex, visibleEndIndex),
    [visibleEndIndex, visibleStartIndex]
  );
  const xAxisTicks = useMemo(() => visibleChartPnlData.map((point) => point.chartIndex), [visibleChartPnlData]);
  const pnlBarCells = useMemo(() => chartPnlData.map(renderPnlBar), [chartPnlData]);
  const periodPnlYAxisTicks = useMemo(
    () =>
      showDebugValues
        ? getPnlChartYAxisTicksFromValues(chartPnlData, getDebugPeriodPnlYAxisValues, true)
        : getPnlChartYAxisTicks(chartPnlData, "pnlFloat", true),
    [chartPnlData, showDebugValues]
  );
  const cumulativePnlYAxisTicks = useMemo(
    () =>
      showDebugValues
        ? getPnlChartYAxisTicksFromValues(chartPnlData, getDebugCumulativePnlYAxisValues, false)
        : getPnlChartYAxisTicks(chartPnlData, "cumulativePnlFloat", false),
    [chartPnlData, showDebugValues]
  );
  const periodPnlYAxisDomain = useMemo(() => getYAxisDomainFromTicks(periodPnlYAxisTicks), [periodPnlYAxisTicks]);
  const cumulativePnlYAxisDomain = useMemo(
    () => getYAxisDomainFromTicks(cumulativePnlYAxisTicks),
    [cumulativePnlYAxisTicks]
  );
  const formatXAxisTick = useCallback(
    (value: number | string) => chartPnlData[Number(value)]?.dateCompact ?? "",
    [chartPnlData]
  );
  const chartMargin = useMemo(() => {
    return {
      ...CHART_MARGIN,
      left: getYAxisMargin(chartPnlData, showDebugValues ? getDebugPeriodPnlYAxisValues : getPeriodPnlYAxisValues),
      right: getYAxisMargin(
        chartPnlData,
        showDebugValues ? getDebugCumulativePnlYAxisValues : getCumulativePnlYAxisValues
      ),
    };
  }, [chartPnlData, showDebugValues]);

  const isZoomed = Boolean(normalizedZoomWindow);
  const canZoom = groupedPnlData.length > 2;
  const isBarAnimationActive = !isZoomed;

  useEffect(() => {
    applyZoomWindow(undefined);
    wheelZoomAccumulatorRef.current = { value: 0 };
  }, [applyZoomWindow, resetKey]);

  useEffect(() => {
    const element = chartInteractionRef.current;

    return () => {
      window.clearTimeout(zoomInteractionResetTimeoutRef.current);
      window.clearTimeout(mobileTapTooltipTimeoutRef.current);
      if (element) {
        delete element.dataset[DRAGGING_DATA_ATTRIBUTE];
        delete element.dataset[SUPPRESS_HOVER_DATA_ATTRIBUTE];
      }
    };
  }, []);

  const cancelMobileTapTooltip = useCallback(() => {
    window.clearTimeout(mobileTapTooltipTimeoutRef.current);
    mobileTapTooltipTimeoutRef.current = undefined;
  }, []);

  const startZoomInteraction = useCallback(() => {
    window.clearTimeout(zoomInteractionResetTimeoutRef.current);
    const element = chartInteractionRef.current;
    if (element) {
      element.dataset[SUPPRESS_HOVER_DATA_ATTRIBUTE] = "true";
    }
  }, []);

  const stopZoomInteraction = useCallback((delay = 0) => {
    window.clearTimeout(zoomInteractionResetTimeoutRef.current);

    if (delay > 0) {
      zoomInteractionResetTimeoutRef.current = window.setTimeout(() => {
        const element = chartInteractionRef.current;
        if (element) {
          delete element.dataset[SUPPRESS_HOVER_DATA_ATTRIBUTE];
        }
      }, delay);
      return;
    }

    const element = chartInteractionRef.current;
    if (element) {
      delete element.dataset[SUPPRESS_HOVER_DATA_ATTRIBUTE];
    }
  }, []);

  const showMobileTapTooltipAfterDoubleTapTimeout = useCallback(() => {
    cancelMobileTapTooltip();
    mobileTapTooltipTimeoutRef.current = window.setTimeout(() => {
      mobileTapTooltipTimeoutRef.current = undefined;
      stopZoomInteraction();
    }, TOUCH_DOUBLE_TAP_TIMEOUT);
  }, [cancelMobileTapTooltip, stopZoomInteraction]);

  const getChartInteractionRatio = useCallback((clientX: number) => {
    const element = chartInteractionRef.current;

    if (!element) {
      return 0.5;
    }

    const rect = element.getBoundingClientRect();

    if (rect.width <= 0) {
      return 0.5;
    }

    return clamp((clientX - rect.left) / rect.width, 0, 1);
  }, []);

  useEffect(() => {
    const element = chartInteractionRef.current;

    if (!element || !canZoom) {
      return undefined;
    }

    const handleWheel = (event: WheelEvent) => {
      if (event.cancelable) {
        event.preventDefault();
      }
      event.stopPropagation();

      const deltaPixels = getWheelDeltaPixels(event.deltaY, event.deltaMode);

      if (Math.abs(deltaPixels) < 1) {
        return;
      }

      startZoomInteraction();
      stopZoomInteraction(ZOOM_INTERACTION_RESET_DELAY);

      const dataLength = groupedPnlData.length;
      const direction = deltaPixels < 0 ? "in" : "out";
      const anchorRatio = getChartInteractionRatio(event.clientX);
      const wheelUnits = clamp(Math.abs(deltaPixels) / 100, 0.05, 1);

      const currentWindow = normalizeZoomWindow(zoomWindowRef.current, dataLength) ?? {
        startIndex: 0,
        endIndex: dataLength - 1,
      };
      const visibleLength = currentWindow.endIndex - currentWindow.startIndex + 1;
      const slowdown = getPnlChartWheelZoomSlowdown(visibleLength, dataLength);
      const accumulator = wheelZoomAccumulatorRef.current;

      if (accumulator.direction !== direction) {
        accumulator.direction = direction;
        accumulator.value = 0;
      }

      accumulator.value += wheelUnits / slowdown;

      if (accumulator.value < 1) {
        return;
      }

      const steps = Math.floor(accumulator.value);
      accumulator.value -= steps;

      let nextWindow = zoomWindowRef.current;
      for (let i = 0; i < steps; i++) {
        nextWindow = zoomPnlWindowAtRatio(nextWindow, dataLength, direction, anchorRatio, PNL_CHART_WHEEL_ZOOM_FACTOR);
      }

      applyZoomWindow(nextWindow);
    };

    element.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      element.removeEventListener("wheel", handleWheel);
    };
  }, [
    applyZoomWindow,
    canZoom,
    getChartInteractionRatio,
    groupedPnlData.length,
    startZoomInteraction,
    stopZoomInteraction,
  ]);

  const handleChartDoubleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!canZoom || Date.now() - lastTouchEndRef.current < TOUCH_SYNTHETIC_DOUBLE_CLICK_TIMEOUT) {
        return;
      }

      const anchorRatio = getChartInteractionRatio(event.clientX);
      startZoomInteraction();
      applyZoomWindow(zoomPnlWindowAtRatio(zoomWindowRef.current, groupedPnlData.length, "in", anchorRatio));
      stopZoomInteraction(ZOOM_INTERACTION_RESET_DELAY);
    },
    [
      applyZoomWindow,
      canZoom,
      getChartInteractionRatio,
      groupedPnlData.length,
      startZoomInteraction,
      stopZoomInteraction,
    ]
  );

  const handleChartMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!normalizedZoomWindow) {
        return;
      }

      const element = chartInteractionRef.current;
      if (!element) {
        return;
      }

      event.preventDefault();
      element.dataset[DRAGGING_DATA_ATTRIBUTE] = "true";

      const startClientX = event.clientX;
      const startWindow = normalizedZoomWindow;
      const chartWidth = Math.max(element.getBoundingClientRect().width, 1);
      const visibleLength = startWindow.endIndex - startWindow.startIndex + 1;
      const panSpeed = getPnlChartDragPanSpeed(visibleLength);
      let lastDeltaPoints = 0;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        moveEvent.preventDefault();

        const deltaPoints = Math.round(((startClientX - moveEvent.clientX) / chartWidth) * visibleLength * panSpeed);

        if (deltaPoints === lastDeltaPoints) {
          return;
        }

        startZoomInteraction();
        lastDeltaPoints = deltaPoints;
        applyZoomWindow(panPnlWindowByDelta(startWindow, groupedPnlData.length, deltaPoints));
      };

      const cleanup = () => {
        window.removeEventListener("mousemove", handleMouseMove);
        delete element.dataset[DRAGGING_DATA_ATTRIBUTE];
        stopZoomInteraction();
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", cleanup, { once: true });
    },
    [applyZoomWindow, groupedPnlData.length, normalizedZoomWindow, startZoomInteraction, stopZoomInteraction]
  );

  const handleChartTouchStart = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      if (!canZoom || (event.touches.length !== 1 && event.touches.length !== 2)) {
        return;
      }

      const element = chartInteractionRef.current;
      if (!element) {
        return;
      }

      if (isMobile) {
        cancelMobileTapTooltip();
        startZoomInteraction();
      }

      if (event.touches.length === 2) {
        startZoomInteraction();

        let lastDistance = getTouchDistance(event.touches[0], event.touches[1]);
        let lastWindow = normalizedZoomWindow;

        const handleTouchMove = (moveEvent: TouchEvent) => {
          if (moveEvent.touches.length !== 2) {
            return;
          }

          moveEvent.preventDefault();

          const currentDistance = getTouchDistance(moveEvent.touches[0], moveEvent.touches[1]);

          if (lastDistance < 1 || currentDistance < 1) {
            lastDistance = currentDistance;
            return;
          }

          let distanceRatio = currentDistance / lastDistance;
          if (distanceRatio < TOUCH_PINCH_STEP_RATIO && distanceRatio > 1 / TOUCH_PINCH_STEP_RATIO) {
            return;
          }

          const direction = distanceRatio > 1 ? "in" : "out";
          const stepRatio = direction === "in" ? TOUCH_PINCH_STEP_RATIO : 1 / TOUCH_PINCH_STEP_RATIO;
          const anchorRatio = getChartInteractionRatio(
            getTouchCenterClientX(moveEvent.touches[0], moveEvent.touches[1])
          );
          let nextWindow = lastWindow;

          while (direction === "in" ? distanceRatio >= stepRatio : distanceRatio <= stepRatio) {
            nextWindow = zoomPnlWindowAtRatio(
              nextWindow,
              groupedPnlData.length,
              direction,
              anchorRatio,
              PNL_CHART_WHEEL_ZOOM_FACTOR
            );
            distanceRatio /= stepRatio;
          }

          lastDistance = currentDistance;
          lastWindow = nextWindow;
          applyZoomWindow(nextWindow);
        };

        const cleanup = () => {
          lastTouchEndRef.current = Date.now();
          lastTouchTapRef.current = 0;
          cancelMobileTapTooltip();
          window.removeEventListener("touchmove", handleTouchMove);
          if (!isMobile) {
            stopZoomInteraction();
          }
        };

        window.addEventListener("touchmove", handleTouchMove, { passive: false });
        window.addEventListener("touchend", cleanup, { once: true });
        window.addEventListener("touchcancel", cleanup, { once: true });

        return;
      }

      const startTouch = event.touches[0];
      const startClientX = startTouch.clientX;
      const startClientY = startTouch.clientY;
      const startWindow = normalizedZoomWindow;
      const chartWidth = Math.max(element.getBoundingClientRect().width, 1);
      const visibleLength = startWindow ? startWindow.endIndex - startWindow.startIndex + 1 : 0;
      const panSpeed = getPnlChartDragPanSpeed(visibleLength);
      let lastDeltaPoints = 0;
      let gesture: "idle" | "horizontal" | "vertical" = "idle";
      let maxDistance = 0;
      let hadMultiTouch = false;

      const handleTouchMove = (moveEvent: TouchEvent) => {
        if (moveEvent.touches.length !== 1) {
          hadMultiTouch = true;
          return;
        }

        const touch = moveEvent.touches[0];
        const deltaX = touch.clientX - startClientX;
        const deltaY = touch.clientY - startClientY;
        maxDistance = Math.max(maxDistance, Math.sqrt(deltaX * deltaX + deltaY * deltaY));

        if (gesture === "idle" && maxDistance > TOUCH_TAP_MAX_DISTANCE) {
          gesture = Math.abs(deltaX) > Math.abs(deltaY) ? "horizontal" : "vertical";
        }

        if (gesture !== "horizontal" || !startWindow) {
          return;
        }

        moveEvent.preventDefault();

        const deltaPoints = Math.round((-deltaX / chartWidth) * visibleLength * panSpeed);

        if (deltaPoints === lastDeltaPoints) {
          return;
        }

        startZoomInteraction();
        lastDeltaPoints = deltaPoints;
        applyZoomWindow(panPnlWindowByDelta(startWindow, groupedPnlData.length, deltaPoints));
      };

      const cleanupTouchListeners = () => {
        lastTouchEndRef.current = Date.now();
        window.removeEventListener("touchmove", handleTouchMove);
      };

      const handleTouchEnd = () => {
        cleanupTouchListeners();

        if (hadMultiTouch || maxDistance > TOUCH_TAP_MAX_DISTANCE) {
          lastTouchTapRef.current = 0;
          cancelMobileTapTooltip();
          if (!isMobile) {
            stopZoomInteraction();
          }
          return;
        }

        const now = Date.now();
        const anchorRatio = getChartInteractionRatio(startClientX);

        if (now - lastTouchTapRef.current < TOUCH_DOUBLE_TAP_TIMEOUT) {
          lastTouchTapRef.current = 0;
          cancelMobileTapTooltip();
          startZoomInteraction();
          applyZoomWindow(zoomPnlWindowAtRatio(zoomWindowRef.current, groupedPnlData.length, "in", anchorRatio));
          if (!isMobile) {
            stopZoomInteraction(ZOOM_INTERACTION_RESET_DELAY);
          }
        } else {
          lastTouchTapRef.current = now;
          if (isMobile) {
            showMobileTapTooltipAfterDoubleTapTimeout();
          } else {
            stopZoomInteraction();
          }
        }
      };

      const handleTouchCancel = () => {
        cleanupTouchListeners();
        lastTouchTapRef.current = 0;
        cancelMobileTapTooltip();
        if (!isMobile) {
          stopZoomInteraction();
        }
      };

      window.addEventListener("touchmove", handleTouchMove, { passive: false });
      window.addEventListener("touchend", handleTouchEnd, { once: true });
      window.addEventListener("touchcancel", handleTouchCancel, { once: true });
    },
    [
      applyZoomWindow,
      cancelMobileTapTooltip,
      canZoom,
      getChartInteractionRatio,
      groupedPnlData.length,
      isMobile,
      normalizedZoomWindow,
      showMobileTapTooltipAfterDoubleTapTimeout,
      startZoomInteraction,
      stopZoomInteraction,
    ]
  );

  return (
    <div className="relative min-h-[250px] grow">
      <div
        ref={chartInteractionRef}
        className={cx(
          "DailyAndCumulativePnL-chartInteraction DailyAndCumulativePnL-hide-last-tick absolute size-full",
          {
            "DailyAndCumulativePnL-chartInteraction--zoomed": isZoomed,
          }
        )}
        onDoubleClickCapture={handleChartDoubleClick}
        onMouseDownCapture={handleChartMouseDown}
        onTouchStartCapture={handleChartTouchStart}
      >
        <ResponsiveContainer debounce={500}>
          <ComposedChart
            width={500}
            height={300}
            data={chartPnlData}
            barCategoryGap={showDebugValues ? DEBUG_BAR_CATEGORY_GAP : BAR_CATEGORY_GAP}
            barGap={showDebugValues ? DEBUG_BAR_GAP : BAR_GAP}
            margin={chartMargin}
            // @ts-expect-error
            overflow="visible"
          >
            <RechartsTooltip
              trigger={isMobile ? "click" : "hover"}
              cursor={CHART_CURSOR_PROPS}
              content={(props) => <ChartTooltip {...props} grouping={grouping} />}
              wrapperStyle={CHART_TOOLTIP_WRAPPER_STYLE}
            />
            <CartesianGrid vertical={false} strokeDasharray="5 3" strokeWidth={0.5} stroke="var(--color-slate-600)" />
            <Bar
              dataKey="pnlFloat"
              yAxisId="periodPnl"
              minPointSize={1}
              radius={2}
              isAnimationActive={isBarAnimationActive}
            >
              {pnlBarCells}
            </Bar>

            <defs>
              <linearGradient id="cumulative-pnl-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="-45%" stopColor="var(--color-blue-300)" stopOpacity={0.5} />
                <stop offset="100%" stopColor="var(--color-blue-300)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              xAxisId="cumulativePnlArea"
              type="monotone"
              dataKey="cumulativePnlFloat"
              yAxisId="cumulativePnl"
              stroke="var(--color-blue-300)"
              fill="url(#cumulative-pnl-gradient)"
              strokeWidth={2}
              dot={false}
              baseValue="dataMin"
              activeDot={ACTIVE_DOT_PROPS}
              isAnimationActive={false}
            />
            <XAxis
              xAxisId="cumulativePnlArea"
              dataKey="chartIndex"
              type="number"
              allowDataOverflow
              domain={areaXAxisDomain}
              hide
            />
            <XAxis
              dataKey="chartIndex"
              type="number"
              allowDataOverflow
              domain={barXAxisDomain}
              ticks={xAxisTicks}
              tickLine={false}
              axisLine={X_AXIS_LINE_PROPS}
              minTickGap={isMobile ? 20 : 32}
              tickFormatter={formatXAxisTick}
              tick={CHART_TICK_PROPS}
              tickMargin={10}
            />
            <YAxis
              yAxisId="periodPnl"
              type="number"
              allowDecimals={false}
              allowDataOverflow
              domain={periodPnlYAxisDomain}
              ticks={periodPnlYAxisTicks}
              markerWidth={0}
              axisLine={false}
              tickLine={false}
              tickMargin={10}
              tickFormatter={formatPnlChartYAxisTick}
              tick={CHART_TICK_PROPS}
            />
            <YAxis
              yAxisId="cumulativePnl"
              orientation="right"
              type="number"
              allowDecimals={false}
              allowDataOverflow
              domain={cumulativePnlYAxisDomain}
              ticks={cumulativePnlYAxisTicks}
              markerWidth={0}
              axisLine={false}
              tickLine={false}
              tickMargin={10}
              tickFormatter={formatPnlChartYAxisTick}
              tick={CUMULATIVE_CHART_TICK_PROPS}
            />
            {showDebugValues ? renderDebugLines() : null}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {error && (
        <div className="absolute grid size-full max-h-full place-items-center overflow-auto">
          <div className="whitespace-pre-wrap font-mono text-red-500">{JSON.stringify(error, null, 2)}</div>
        </div>
      )}
      {loading && (
        <div className="absolute grid size-full place-items-center">
          <Loader />
        </div>
      )}
      {!loading && !error && visibleChartPnlData.length === 0 && (
        <div className="absolute grid size-full place-items-center text-typography-secondary">
          <Trans>No data available</Trans>
        </div>
      )}
    </div>
  );
}

function renderPnlBar(entry: AccountPnlHistoryPoint) {
  let fill: string;
  if (entry.pnl !== undefined && entry.pnl > 0n) {
    fill = "var(--color-green-500)";
  } else if (entry.pnl !== undefined && entry.pnl < 0n) {
    fill = "var(--color-red-500)";
  } else {
    fill = "var(--color-gray-900)";
  }
  return <Cell key={entry.date} fill={fill} />;
}

function ChartTooltip({ active, payload, grouping }: TooltipProps<any, any> & { grouping: PnlChartGrouping }) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const stats = payload[0].payload as AccountPnlHistoryPoint;

  return (
    <div
      className={`backdrop-blur-100 text-body-small z-50 flex flex-col rounded-4 bg-[rgba(160,163,196,0.1)]
      bg-slate-800 px-12 pt-8 bg-blend-overlay mix-blend-overlay shadow-lg`}
    >
      <StatsTooltipRow label={grouping === "daily" ? t`Date` : t`Period`} value={stats.date} showDollar={false} />
      <StatsTooltipRow
        label={t`PnL`}
        value={formatUsd(stats.pnl)}
        showDollar={false}
        textClassName={getPositiveOrNegativeClass(stats.pnl)}
      />
      <StatsTooltipRow
        label={t`Cumulative PnL`}
        value={formatUsd(stats.cumulativePnl)}
        showDollar={false}
        textClassName={getPositiveOrNegativeClass(stats.cumulativePnl)}
      />
      <DebugTooltip stats={stats} />
    </div>
  );
}

function getPeriodPnlYAxisValues(point: AccountPnlHistoryPoint) {
  return [point.pnlFloat];
}

function getCumulativePnlYAxisValues(point: AccountPnlHistoryPoint) {
  return [point.cumulativePnlFloat];
}

function getYAxisMargin(
  data: AccountPnlHistoryPoint[],
  getValues: (point: AccountPnlHistoryPoint) => (number | undefined)[]
) {
  let maxValue = 0;

  for (const point of data) {
    for (const value of getValues(point)) {
      if (value === undefined || !Number.isFinite(value)) {
        continue;
      }

      maxValue = Math.max(maxValue, Math.abs(value));
    }
  }

  if (maxValue === 0) {
    return 0;
  }

  const labelLength = Math.max(formatPnlChartYAxisTick(maxValue).length, formatPnlChartYAxisTick(-maxValue).length);

  return clamp(labelLength * 2, 0, 72);
}

function getYAxisDomainFromTicks(ticks: number[]): [number, number] {
  if (ticks.length < 2) {
    return [0, 1];
  }

  return [ticks[0], ticks[ticks.length - 1]];
}

type TouchPosition = Pick<Touch, "clientX" | "clientY">;

function getTouchDistance(firstTouch: TouchPosition, secondTouch: TouchPosition) {
  const deltaX = firstTouch.clientX - secondTouch.clientX;
  const deltaY = firstTouch.clientY - secondTouch.clientY;

  return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
}

function getTouchCenterClientX(firstTouch: TouchPosition, secondTouch: TouchPosition) {
  return (firstTouch.clientX + secondTouch.clientX) / 2;
}
