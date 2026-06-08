import { gql, useQuery as useGqlQuery } from "@apollo/client";
import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  TooltipProps,
  XAxis,
  YAxis,
} from "recharts";
import type { Address } from "viem";

import { USD_DECIMALS } from "config/factors";
import { useShowDebugValues } from "context/SyntheticsStateContext/hooks/settingsHooks";
import type { FromOldToNewArray } from "domain/tradingview/types";
import {
  SECONDS_IN_DAY,
  formatDateTime,
  toUtcDayStartByCalendarDate,
  type DateRange,
  type SetDateRange,
} from "lib/dates";
import downloadImage from "lib/downloadImage";
import { helperToast } from "lib/helperToast";
import { getSubsquidGraphClient } from "lib/indexers";
import { bigintToNumber, clamp, formatUsd } from "lib/numbers";
import { EMPTY_ARRAY, EMPTY_OBJECT } from "lib/objects";
import { useBreakpoints } from "lib/useBreakpoints";
import { getPositiveOrNegativeClass } from "lib/utils";

import Button from "components/Button/Button";
import { DateRangeSelect } from "components/DateRangeSelect/DateRangeSelect";
import Loader from "components/Loader/Loader";
import { SelectorBase, useSelectorClose } from "components/SelectorBase/SelectorBase";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";

import DownloadIcon from "img/ic_download2.svg?react";

import {
  formatPnlChartCompactDate,
  formatPnlChartDate,
  formatPnlChartYAxisTick,
  getPnlChartWheelZoomSlowdown,
  getPnlChartYAxisTicks,
  getZoomedPnlHistoryData,
  groupPnlHistoryData,
  normalizeZoomWindow,
  panPnlWindowByDelta,
  PNL_CHART_WHEEL_ZOOM_FACTOR,
  type BasePnlHistoryPoint,
  type PnlChartGrouping,
  type PnlZoomWindow,
  zoomPnlWindowAtRatio,
} from "./DailyAndCumulativePnL.utils";
import {
  DEBUG_FIELDS,
  DEV_QUERY_WITH_TO,
  DebugLegend,
  DebugLines,
  DebugTooltip,
  type AccountPnlHistoryPointDebugFields,
} from "./dailyAndCumulativePnLDebug";

import "./DailyAndCumulativePnL.css";

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
const GROUPING_OPTIONS: { value: PnlChartGrouping; label: string }[] = [
  { value: "daily", label: t`Daily` },
  { value: "weekly", label: t`Weekly` },
  { value: "monthly", label: t`Monthly` },
];

export function DailyAndCumulativePnL({
  chainId,
  account,
  dateRange,
  setDateRange,
}: {
  chainId: number;
  account: Address;
  dateRange: DateRange;
  setDateRange: SetDateRange;
}) {
  const [fromDate, toDate] = dateRange;
  const fromTimestamp = useMemo(() => fromDate && toUtcDayStartByCalendarDate(fromDate), [fromDate]);
  const toTimestamp = useMemo(() => toDate && toUtcDayStartByCalendarDate(toDate), [toDate]);
  const [grouping, setGrouping] = useState<PnlChartGrouping>("daily");
  const [zoomWindow, setZoomWindow] = useState<PnlZoomWindow | undefined>();

  const {
    data: historicalPnlData,
    error,
    loading,
  } = usePnlHistoricalData(chainId, account, fromTimestamp, toTimestamp);
  const groupedPnlData = useMemo(() => groupPnlHistoryData(historicalPnlData, grouping), [grouping, historicalPnlData]);
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
  const periodPnlYAxisTicks = useMemo(
    () => getPnlChartYAxisTicks(visibleChartPnlData, "pnlFloat", true),
    [visibleChartPnlData]
  );
  const cumulativePnlYAxisTicks = useMemo(
    () => getPnlChartYAxisTicks(visibleChartPnlData, "cumulativePnlFloat", false),
    [visibleChartPnlData]
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

  const { cardRef, handleImageDownload } = useImageDownload();
  const chartInteractionRef = useRef<HTMLDivElement>(null);
  const lastTouchTapRef = useRef(0);
  const wheelZoomAccumulatorRef = useRef<{ direction?: "in" | "out"; value: number }>({ value: 0 });

  const { isMobile } = useBreakpoints();
  const isZoomed = Boolean(normalizedZoomWindow);
  const canZoom = groupedPnlData.length > 2;

  useEffect(() => {
    setZoomWindow(undefined);
    wheelZoomAccumulatorRef.current = { value: 0 };
  }, [account, chainId, fromTimestamp, grouping, toTimestamp]);

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
  }, [canZoom, getChartInteractionRatio, groupedPnlData.length]);

  const handleChartDoubleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!canZoom) {
        return;
      }

      const anchorRatio = getChartInteractionRatio(event.clientX);
      setZoomWindow((window) => zoomPnlWindowAtRatio(window, groupedPnlData.length, "in", anchorRatio));
    },
    [canZoom, getChartInteractionRatio, groupedPnlData.length]
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

      const startClientX = event.clientX;
      const startWindow = normalizedZoomWindow;
      const chartWidth = Math.max(element.getBoundingClientRect().width, 1);
      const visibleLength = startWindow.endIndex - startWindow.startIndex + 1;
      let lastDeltaPoints = 0;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        moveEvent.preventDefault();

        const deltaPoints = Math.round(((startClientX - moveEvent.clientX) / chartWidth) * visibleLength);

        if (deltaPoints === lastDeltaPoints) {
          return;
        }

        lastDeltaPoints = deltaPoints;
        setZoomWindow(panPnlWindowByDelta(startWindow, groupedPnlData.length, deltaPoints));
      };

      const cleanup = () => {
        window.removeEventListener("mousemove", handleMouseMove);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", cleanup, { once: true });
    },
    [groupedPnlData.length, normalizedZoomWindow]
  );

  const handleChartTouchStart = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      if (!canZoom || event.touches.length !== 1) {
        return;
      }

      const element = chartInteractionRef.current;
      if (!element) {
        return;
      }

      const startTouch = event.touches[0];
      const startClientX = startTouch.clientX;
      const startClientY = startTouch.clientY;
      const startWindow = normalizedZoomWindow;
      const chartWidth = Math.max(element.getBoundingClientRect().width, 1);
      const visibleLength = startWindow ? startWindow.endIndex - startWindow.startIndex + 1 : 0;
      let lastDeltaPoints = 0;
      let gesture: "idle" | "horizontal" | "vertical" = "idle";
      let maxDistance = 0;

      const handleTouchMove = (moveEvent: TouchEvent) => {
        if (moveEvent.touches.length !== 1) {
          return;
        }

        const touch = moveEvent.touches[0];
        const deltaX = touch.clientX - startClientX;
        const deltaY = touch.clientY - startClientY;
        maxDistance = Math.max(maxDistance, Math.sqrt(deltaX * deltaX + deltaY * deltaY));

        if (gesture === "idle" && maxDistance > 10) {
          gesture = Math.abs(deltaX) > Math.abs(deltaY) ? "horizontal" : "vertical";
        }

        if (gesture !== "horizontal" || !startWindow) {
          return;
        }

        moveEvent.preventDefault();

        const deltaPoints = Math.round((-deltaX / chartWidth) * visibleLength);

        if (deltaPoints === lastDeltaPoints) {
          return;
        }

        lastDeltaPoints = deltaPoints;
        setZoomWindow(panPnlWindowByDelta(startWindow, groupedPnlData.length, deltaPoints));
      };

      const cleanup = () => {
        window.removeEventListener("touchmove", handleTouchMove);
      };

      const handleTouchEnd = () => {
        cleanup();

        if (maxDistance > 10) {
          return;
        }

        const now = Date.now();
        const anchorRatio = getChartInteractionRatio(startClientX);

        if (now - lastTouchTapRef.current < 350) {
          lastTouchTapRef.current = 0;
          setZoomWindow((window) => zoomPnlWindowAtRatio(window, groupedPnlData.length, "in", anchorRatio));
        } else {
          lastTouchTapRef.current = now;
        }
      };

      window.addEventListener("touchmove", handleTouchMove, { passive: false });
      window.addEventListener("touchend", handleTouchEnd, { once: true });
      window.addEventListener("touchcancel", cleanup, { once: true });
    },
    [canZoom, getChartInteractionRatio, groupedPnlData.length, normalizedZoomWindow]
  );

  const controls = (
    <div data-exclude className="flex flex-wrap items-stretch justify-end gap-8">
      <Button variant="ghost" className="inline-flex items-center gap-4" data-exclude onClick={handleImageDownload}>
        <DownloadIcon className="size-16 shrink-0" />
        <Trans>PNG</Trans>
      </Button>
      <PnlChartGroupingSelect
        grouping={grouping}
        onChange={setGrouping}
        buttonTextClassName={
          isMobile ? "text-body-small max-w-[110px] truncate whitespace-nowrap font-medium" : undefined
        }
      />
      <DateRangeSelect
        startDate={fromDate}
        endDate={toDate}
        onChange={setDateRange}
        buttonTextClassName={
          isMobile ? "text-body-small max-w-[150px] truncate whitespace-nowrap font-medium" : undefined
        }
      />
    </div>
  );

  const chartMargin = useMemo(() => {
    return {
      ...CHART_MARGIN,
      left: getYAxisMargin(visibleChartPnlData, "pnlFloat"),
      right: getYAxisMargin(visibleChartPnlData, "cumulativePnlFloat"),
    };
  }, [visibleChartPnlData]);

  return (
    <div className="flex flex-col rounded-8 bg-slate-900" ref={cardRef}>
      <div className="flex items-center justify-between px-20 py-15">
        <div className="text-20 font-medium">
          <Trans>Daily and cumulative PnL</Trans>
        </div>
        {isMobile ? null : (
          <div data-exclude className="py-8">
            {controls}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-24 px-16 pt-16 text-typography-secondary">
        <div className="flex items-center gap-8 text-13 font-medium">
          <div className="inline-block size-4 rounded-full bg-green-500" /> <Trans>Period profit</Trans>
        </div>
        <div className="flex items-center gap-8 text-13 font-medium">
          <div className="inline-block size-4 rounded-full bg-red-500" /> <Trans>Period loss</Trans>
        </div>
        <div className="flex items-center gap-8 text-13 font-medium">
          <div className="inline-block size-4 rounded-full bg-blue-300" />{" "}
          <Trans>
            Cumulative PnL{" "}
            <span className={getPositiveOrNegativeClass(groupedPnlData.at(-1)?.cumulativePnl)}>
              {formatUsd(groupedPnlData.at(-1)?.cumulativePnl)}
            </span>
          </Trans>
        </div>
        <DebugLegend lastPoint={groupedPnlData.at(-1)} />
      </div>

      <div className="relative min-h-[250px] grow">
        <div
          ref={chartInteractionRef}
          className={cx(
            "DailyAndCumulativePnL-chartInteraction DailyAndCumulativePnL-hide-last-tick absolute size-full",
            {
              "DailyAndCumulativePnL-chartInteraction--zoomed": isZoomed,
            }
          )}
          onDoubleClick={handleChartDoubleClick}
          onMouseDown={handleChartMouseDown}
          onTouchStart={handleChartTouchStart}
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
              <Bar dataKey="pnlFloat" yAxisId="periodPnl" minPointSize={1} radius={2} isAnimationActive={true}>
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
                isAnimationActive={true}
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
              {DebugLines()}
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

      {isMobile && (
        <div data-exclude className="flex flex-wrap justify-between gap-8 border-t-1/2 border-slate-600 px-16 py-12">
          {controls}
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

function PnlChartGroupingSelect({
  grouping,
  onChange,
  buttonTextClassName,
}: {
  grouping: PnlChartGrouping;
  onChange: (grouping: PnlChartGrouping) => void;
  buttonTextClassName?: string;
}) {
  const selectedOption = GROUPING_OPTIONS.find((option) => option.value === grouping) ?? GROUPING_OPTIONS[0];

  return (
    <SelectorBase
      modalLabel={t`Grouping`}
      popoverPlacement="bottom-end"
      desktopPanelClassName="mt-8 !border !border-slate-600 !bg-slate-900 !outline-none"
      handleClassName="button ghost center flex min-h-32 gap-4 px-12 py-6 text-[13px] max-md:px-10 max-md:py-6"
      chevronClassName="!text-typography-secondary group-hover:!text-typography-primary"
      label={
        <span className={buttonTextClassName ?? "text-body-small whitespace-nowrap font-medium"}>
          {selectedOption.label}
        </span>
      }
    >
      <div>
        {GROUPING_OPTIONS.map((option) => (
          <PnlChartGroupingOption
            key={option.value}
            option={option}
            isSelected={option.value === grouping}
            onSelect={onChange}
          />
        ))}
      </div>
    </SelectorBase>
  );
}

function PnlChartGroupingOption({
  option,
  isSelected,
  onSelect,
}: {
  option: (typeof GROUPING_OPTIONS)[number];
  isSelected: boolean;
  onSelect: (grouping: PnlChartGrouping) => void;
}) {
  const close = useSelectorClose();

  return (
    <div
      className={cx(
        "text-body-medium cursor-pointer p-8 font-medium text-typography-secondary hover:bg-fill-surfaceHover hover:text-typography-primary",
        {
          "!text-typography-primary": isSelected,
        }
      )}
      onClick={() => {
        onSelect(option.value);
        close();
      }}
    >
      {option.label}
    </div>
  );
}

function ChartTooltip({ active, payload, grouping }: TooltipProps<any, any> & { grouping: PnlChartGrouping }) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const stats = payload[0].payload as PnlHistoricalData[number];

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

export type AccountPnlHistoryPoint = BasePnlHistoryPoint & AccountPnlHistoryPointDebugFields;

type ChartPnlHistoryPoint = AccountPnlHistoryPoint & {
  chartIndex: number;
};

type PnlHistoricalData = FromOldToNewArray<AccountPnlHistoryPoint>;

const PROD_QUERY = gql`
  query AccountHistoricalPnlResolver($account: String!, $from: Int, $to: Int) {
    accountPnlHistoryStats(account: $account, from: $from, to: $to) {
      cumulativePnl
      pnl
      timestamp
    }
  }
`;

const MINIMUM_DATA_POINTS = 7;

function usePnlHistoricalData(
  chainId: number,
  account: Address,
  fromTimestamp: number | undefined,
  toTimestamp: number | undefined
) {
  const showDebugValues = useShowDebugValues();
  const query = showDebugValues ? DEV_QUERY_WITH_TO : PROD_QUERY;
  const res = useGqlQuery(query, {
    client: getSubsquidGraphClient(chainId)!,
    variables: { account: account, from: fromTimestamp, to: toTimestamp },
  });

  const transformedData: PnlHistoricalData = useMemo(() => {
    let dataPoints =
      res.data?.accountPnlHistoryStats
        ?.filter((row: any) => toTimestamp === undefined || row.timestamp <= toTimestamp)
        ?.map((row: any) => {
          const parsedDebugFields = showDebugValues
            ? DEBUG_FIELDS.reduce(
                (acc, key) => {
                  const raw = row[key];

                  const bn = raw ? BigInt(raw) : 0n;
                  acc[key] = bn;
                  acc[`${key}Float`] = bigintToNumber(bn, USD_DECIMALS);
                  return acc;
                },
                {} as Record<string, bigint | number>
              )
            : EMPTY_OBJECT;

          return {
            date: showDebugValues
              ? formatDateTime(row.timestamp) + " - " + formatDateTime(row.timestamp + SECONDS_IN_DAY) + " local"
              : formatPnlChartDate(row.timestamp),
            dateCompact: formatPnlChartCompactDate(row.timestamp),
            timestamp: row.timestamp,
            pnl: BigInt(row.pnl),
            pnlFloat: bigintToNumber(BigInt(row.pnl), USD_DECIMALS),
            cumulativePnl: BigInt(row.cumulativePnl),
            cumulativePnlFloat: bigintToNumber(BigInt(row.cumulativePnl), USD_DECIMALS),
            ...parsedDebugFields,
          };
        }) || EMPTY_ARRAY;

    if (dataPoints.length === 0) {
      return EMPTY_ARRAY;
    }

    if (!fromTimestamp && !toTimestamp && dataPoints.length < MINIMUM_DATA_POINTS) {
      const lastTimestamp = dataPoints.length > 0 ? dataPoints[0].timestamp : Math.floor(Date.now() / 1000);

      const pointsLength = dataPoints.length;
      for (let i = pointsLength; i < MINIMUM_DATA_POINTS; i++) {
        const newTimestamp = lastTimestamp - SECONDS_IN_DAY * (i - pointsLength + 1);
        const emptyPoint = {
          date: showDebugValues
            ? formatDateTime(newTimestamp) + " - " + formatDateTime(newTimestamp + SECONDS_IN_DAY) + " local"
            : formatPnlChartDate(newTimestamp),
          dateCompact: formatPnlChartCompactDate(newTimestamp),
          timestamp: newTimestamp,
          pnl: undefined,
          pnlFloat: undefined,
          cumulativePnl: undefined,
          cumulativePnlFloat: undefined,
          ...(showDebugValues
            ? DEBUG_FIELDS.reduce(
                (acc, key) => {
                  acc[key] = 0n;
                  acc[`${key}Float`] = 0;
                  return acc;
                },
                {} as Record<string, bigint | number>
              )
            : EMPTY_OBJECT),
        };

        dataPoints = [emptyPoint].concat(dataPoints);
      }
    }

    return dataPoints;
  }, [fromTimestamp, res.data?.accountPnlHistoryStats, showDebugValues, toTimestamp]);

  return { data: transformedData, error: res.error, loading: res.loading };
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

function useImageDownload() {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleImageDownload = useCallback(async () => {
    if (!cardRef.current) {
      helperToast.error("Error in downloading image");
      return;
    }

    const { toPng } = await import("html-to-image");
    toPng(cardRef.current, {
      filter: (element) => {
        if (element.dataset?.exclude) {
          return false;
        }
        return true;
      },
    }).then((dataUri) => {
      downloadImage(dataUri, "daily-and-cumulative-pnl.png");
    });
  }, []);

  return { cardRef, handleImageDownload };
}
