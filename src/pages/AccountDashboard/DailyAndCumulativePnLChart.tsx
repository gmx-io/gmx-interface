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

import { clamp, formatUsd } from "lib/numbers";
import { EMPTY_ARRAY } from "lib/objects";
import { getPositiveOrNegativeClass } from "lib/utils";

import Loader from "components/Loader/Loader";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";

import type { AccountPnlHistoryPoint } from "./DailyAndCumulativePnL";
import {
  formatPnlChartYAxisTick,
  getPnlChartDragPanSpeed,
  getPnlChartWheelZoomSlowdown,
  getPnlChartYAxisTicks,
  getZoomedPnlHistoryData,
  normalizeZoomWindow,
  panPnlWindowByDelta,
  PNL_CHART_WHEEL_ZOOM_FACTOR,
  type PnlChartGrouping,
  type PnlZoomWindow,
  zoomPnlWindowAtRatio,
} from "./DailyAndCumulativePnL.utils";
import { DebugLines, DebugTooltip } from "./dailyAndCumulativePnLDebug";

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
const DRAGGING_DATA_ATTRIBUTE = "dragging";
const SUPPRESS_HOVER_DATA_ATTRIBUTE = "suppressHover";
const ZOOM_INTERACTION_RESET_DELAY = 250;
const TOUCH_TAP_MAX_DISTANCE = 10;
const TOUCH_DOUBLE_TAP_TIMEOUT = 350;
const TOUCH_PINCH_STEP_RATIO = 1.08;

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
  const chartInteractionRef = useRef<HTMLDivElement>(null);
  const lastTouchTapRef = useRef(0);
  const wheelZoomAccumulatorRef = useRef<{ direction?: "in" | "out"; value: number }>({ value: 0 });
  const zoomInteractionResetTimeoutRef = useRef<number | undefined>();

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
  const rechartsPnlData = useMemo(() => {
    // Recharts refreshes Bar's previous geometry only when chart data changes.
    if (visibleStartIndex > visibleEndIndex) {
      return EMPTY_ARRAY as ChartPnlHistoryPoint[];
    }

    return chartPnlData.slice();
  }, [chartPnlData, visibleEndIndex, visibleStartIndex]);
  const barXAxisDomain = useMemo<[number, number]>(
    () => [visibleStartIndex - 0.5, visibleEndIndex + 0.5],
    [visibleEndIndex, visibleStartIndex]
  );
  const areaXAxisDomain = useMemo<[number, number]>(
    () => [visibleStartIndex, visibleStartIndex === visibleEndIndex ? visibleEndIndex + 1 : visibleEndIndex],
    [visibleEndIndex, visibleStartIndex]
  );
  const xAxisTicks = useMemo(() => visibleChartPnlData.map((point) => point.chartIndex), [visibleChartPnlData]);
  const periodPnlYAxisTicks = useMemo(() => getPnlChartYAxisTicks(chartPnlData, "pnlFloat", true), [chartPnlData]);
  const cumulativePnlYAxisTicks = useMemo(
    () => getPnlChartYAxisTicks(chartPnlData, "cumulativePnlFloat", false),
    [chartPnlData]
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
      left: getYAxisMargin(chartPnlData, "pnlFloat"),
      right: getYAxisMargin(chartPnlData, "cumulativePnlFloat"),
    };
  }, [chartPnlData]);

  const isZoomed = Boolean(normalizedZoomWindow);
  const canZoom = groupedPnlData.length > 2;
  const isBarAnimationActive = !isZoomed;

  useEffect(() => {
    setZoomWindow(undefined);
    wheelZoomAccumulatorRef.current = { value: 0 };
  }, [resetKey]);

  useEffect(() => {
    const element = chartInteractionRef.current;

    return () => {
      window.clearTimeout(zoomInteractionResetTimeoutRef.current);
      if (element) {
        delete element.dataset[DRAGGING_DATA_ATTRIBUTE];
        delete element.dataset[SUPPRESS_HOVER_DATA_ATTRIBUTE];
      }
    };
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
      if (Math.abs(event.deltaY) < 1) {
        return;
      }

      event.preventDefault();
      startZoomInteraction();
      stopZoomInteraction(ZOOM_INTERACTION_RESET_DELAY);

      const direction = event.deltaY < 0 ? "in" : "out";
      const anchorRatio = getChartInteractionRatio(event.clientX);
      const wheelUnits = clamp(Math.abs(event.deltaY) / 100, 0.05, 1);

      setZoomWindow((window) => {
        const normalizedWindow = normalizeZoomWindow(window, groupedPnlData.length) ?? {
          startIndex: 0,
          endIndex: groupedPnlData.length - 1,
        };
        const visibleLength = normalizedWindow.endIndex - normalizedWindow.startIndex + 1;
        const slowdown = getPnlChartWheelZoomSlowdown(visibleLength, groupedPnlData.length);
        const accumulator = wheelZoomAccumulatorRef.current;

        if (accumulator.direction !== direction) {
          accumulator.direction = direction;
          accumulator.value = 0;
        }

        accumulator.value += wheelUnits / slowdown;

        if (accumulator.value < 1) {
          return window;
        }

        const steps = Math.floor(accumulator.value);
        accumulator.value -= steps;

        let nextWindow = window;
        for (let i = 0; i < steps; i++) {
          nextWindow = zoomPnlWindowAtRatio(
            nextWindow,
            groupedPnlData.length,
            direction,
            anchorRatio,
            PNL_CHART_WHEEL_ZOOM_FACTOR
          );
        }

        return nextWindow;
      });
    };

    element.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      element.removeEventListener("wheel", handleWheel);
    };
  }, [canZoom, getChartInteractionRatio, groupedPnlData.length, startZoomInteraction, stopZoomInteraction]);

  const handleChartDoubleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!canZoom) {
        return;
      }

      const anchorRatio = getChartInteractionRatio(event.clientX);
      startZoomInteraction();
      setZoomWindow((window) => zoomPnlWindowAtRatio(window, groupedPnlData.length, "in", anchorRatio));
      stopZoomInteraction(ZOOM_INTERACTION_RESET_DELAY);
    },
    [canZoom, getChartInteractionRatio, groupedPnlData.length, startZoomInteraction, stopZoomInteraction]
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
        setZoomWindow(panPnlWindowByDelta(startWindow, groupedPnlData.length, deltaPoints));
      };

      const cleanup = () => {
        window.removeEventListener("mousemove", handleMouseMove);
        delete element.dataset[DRAGGING_DATA_ATTRIBUTE];
        stopZoomInteraction();
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", cleanup, { once: true });
    },
    [groupedPnlData.length, normalizedZoomWindow, startZoomInteraction, stopZoomInteraction]
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

      if (event.touches.length === 2) {
        event.preventDefault();
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
          setZoomWindow(nextWindow);
        };

        const cleanup = () => {
          window.removeEventListener("touchmove", handleTouchMove);
          stopZoomInteraction();
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
        setZoomWindow(panPnlWindowByDelta(startWindow, groupedPnlData.length, deltaPoints));
      };

      const cleanup = () => {
        window.removeEventListener("touchmove", handleTouchMove);
        stopZoomInteraction();
      };

      const handleTouchEnd = () => {
        cleanup();

        if (hadMultiTouch || maxDistance > TOUCH_TAP_MAX_DISTANCE) {
          return;
        }

        const now = Date.now();
        const anchorRatio = getChartInteractionRatio(startClientX);

        if (now - lastTouchTapRef.current < TOUCH_DOUBLE_TAP_TIMEOUT) {
          lastTouchTapRef.current = 0;
          startZoomInteraction();
          setZoomWindow((window) => zoomPnlWindowAtRatio(window, groupedPnlData.length, "in", anchorRatio));
          stopZoomInteraction(ZOOM_INTERACTION_RESET_DELAY);
        } else {
          lastTouchTapRef.current = now;
        }
      };

      window.addEventListener("touchmove", handleTouchMove, { passive: false });
      window.addEventListener("touchend", handleTouchEnd, { once: true });
      window.addEventListener("touchcancel", cleanup, { once: true });
    },
    [
      canZoom,
      getChartInteractionRatio,
      groupedPnlData.length,
      normalizedZoomWindow,
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
            data={rechartsPnlData}
            barCategoryGap="25%"
            margin={chartMargin}
            // @ts-expect-error
            overflow="visible"
          >
            <RechartsTooltip
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
              {chartPnlData.map(renderPnlBar)}
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
            <DebugLines />
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

function getYAxisMargin(data: AccountPnlHistoryPoint[], key: "pnlFloat" | "cumulativePnlFloat") {
  const maxValue = data.reduce((max, point) => Math.max(max, Math.abs(point[key] ?? 0)), 0);

  if (maxValue === 0) {
    return 0;
  }

  const labelLength = Math.max(formatPnlChartYAxisTick(maxValue).length, formatPnlChartYAxisTick(-maxValue).length);

  return clamp(labelLength * 3, 0, 72);
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
