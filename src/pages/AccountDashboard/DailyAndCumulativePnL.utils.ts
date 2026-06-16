import { tz } from "@date-fns/tz";
import { format } from "date-fns";

import { USD_DECIMALS } from "config/factors";
import { SECONDS_IN_DAY } from "lib/dates";
import { bigintToNumber, clamp } from "lib/numbers";

export type PnlChartGrouping = "daily" | "weekly" | "monthly";

export type BasePnlHistoryPoint = {
  timestamp: number;
  date: string;
  dateCompact: string;
  pnl?: bigint;
  pnlFloat?: number;
  cumulativePnl?: bigint;
  cumulativePnlFloat?: number;
};

export type PnlZoomWindow = {
  startIndex: number;
  endIndex: number;
};

const PNL_CHART_ZOOM_FACTOR = 0.3;
export const PNL_CHART_WHEEL_ZOOM_FACTOR = Math.pow(PNL_CHART_ZOOM_FACTOR, 1 / 12);

const UTC_FORMAT_OPTIONS = { in: tz("UTC") };
const COMPACT_USD_FORMATTER = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatPnlChartYAxisTick(value: number) {
  if (!Number.isFinite(value)) {
    return "$0";
  }

  const truncatedValue = Math.trunc(value);

  if (truncatedValue === 0) {
    return "$0";
  }

  const sign = truncatedValue < 0 ? "-" : "";
  const absValue = Math.abs(truncatedValue);
  const formattedValue = absValue < 1000 ? absValue.toString() : COMPACT_USD_FORMATTER.format(absValue).toLowerCase();

  return `${sign}$${formattedValue}`;
}

type PnlChartYAxisKey = "pnlFloat" | "cumulativePnlFloat";

export function getPnlChartYAxisTicks<T extends BasePnlHistoryPoint>(
  data: T[],
  key: PnlChartYAxisKey,
  includeZero: boolean,
  targetTickCount = 5
) {
  return getPnlChartYAxisTicksFromValues(data, (point) => [point[key]], includeZero, targetTickCount);
}

export function getPnlChartYAxisTicksFromValues<T extends BasePnlHistoryPoint>(
  data: T[],
  getValues: (point: T) => (number | undefined)[],
  includeZero: boolean,
  targetTickCount = 5
) {
  let min = includeZero ? 0 : Infinity;
  let max = includeZero ? 0 : -Infinity;

  for (const point of data) {
    const values = getValues(point);

    for (const value of values) {
      if (value === undefined || !Number.isFinite(value)) {
        continue;
      }

      min = Math.min(min, value);
      max = Math.max(max, value);
    }
  }

  if (min === Infinity || max === -Infinity) {
    return [0, 1];
  }

  if (min === max) {
    const padding = Math.max(Math.abs(min) * 0.1, 1);
    min -= padding;
    max += padding;
  }

  const tickCount = clamp(Math.floor(targetTickCount), 2, 8);
  const step = Math.max(getNiceTickStep((max - min) / (tickCount - 1)), 1);
  const niceMin = Math.floor(min / step) * step;
  const niceMax = Math.ceil(max / step) * step;
  const ticks: number[] = [];

  for (let tick = niceMin; tick <= niceMax + step / 2; tick += step) {
    ticks.push(normalizeTickValue(tick));
  }

  return ticks.length >= 2 ? ticks : [niceMin, niceMin + step].map(normalizeTickValue);
}

function getNiceTickStep(rawStep: number) {
  if (!Number.isFinite(rawStep) || rawStep <= 0) {
    return 1;
  }

  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const fraction = rawStep / magnitude;
  let niceFraction: number;

  if (fraction <= 1) {
    niceFraction = 1;
  } else if (fraction <= 2) {
    niceFraction = 2;
  } else if (fraction <= 2.5) {
    niceFraction = 2.5;
  } else if (fraction <= 5) {
    niceFraction = 5;
  } else {
    niceFraction = 10;
  }

  return niceFraction * magnitude;
}

function normalizeTickValue(value: number) {
  const normalizedValue = Number(value.toPrecision(12));

  return Object.is(normalizedValue, -0) ? 0 : normalizedValue;
}

const DEBUG_SUM_FIELDS = [
  "realizedFees",
  "realizedPnl",
  "realizedPriceImpact",
  "realizedSwapImpact",
  "realizedSwapFees",
] as const;

const DEBUG_LAST_FIELDS = [
  "unrealizedFees",
  "unrealizedPnl",
  "cumulativeRealizedFees",
  "cumulativeRealizedPnl",
  "cumulativeRealizedPriceImpact",
  "cumulativeRealizedSwapImpact",
  "cumulativeRealizedSwapFees",
] as const;

const DEBUG_FIRST_FIELDS = ["startUnrealizedPnl", "startUnrealizedFees"] as const;

export function formatPnlChartDate(timestamp: number) {
  return format(timestamp * 1000, "dd MMM yyyy", UTC_FORMAT_OPTIONS);
}

export function formatPnlChartCompactDate(timestamp: number) {
  return format(timestamp * 1000, "dd/MM", UTC_FORMAT_OPTIONS);
}

function formatPnlChartMonth(timestamp: number) {
  return format(timestamp * 1000, "MMM yyyy", UTC_FORMAT_OPTIONS);
}

function formatPnlChartRange(startTimestamp: number, endTimestamp: number) {
  if (startTimestamp === endTimestamp) {
    return formatPnlChartDate(startTimestamp);
  }

  return `${formatPnlChartDate(startTimestamp)} - ${formatPnlChartDate(endTimestamp)}`;
}

function getUtcMonthStart(timestamp: number) {
  const date = new Date(timestamp * 1000);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1) / 1000;
}

function getUtcWeekStart(timestamp: number) {
  const dayStart = Math.floor(timestamp / SECONDS_IN_DAY) * SECONDS_IN_DAY;
  const day = new Date(dayStart * 1000).getUTCDay();
  const daysSinceMonday = (day + 6) % 7;
  return dayStart - daysSinceMonday * SECONDS_IN_DAY;
}

function getBucketStart(timestamp: number, grouping: PnlChartGrouping) {
  if (grouping === "monthly") {
    return getUtcMonthStart(timestamp);
  }

  if (grouping === "weekly") {
    return getUtcWeekStart(timestamp);
  }

  return Math.floor(timestamp / SECONDS_IN_DAY) * SECONDS_IN_DAY;
}

function getBucketCompactLabel(startTimestamp: number, grouping: PnlChartGrouping) {
  if (grouping === "monthly") {
    return formatPnlChartMonth(startTimestamp);
  }

  return formatPnlChartCompactDate(startTimestamp);
}

function getFloatValue(value: bigint | undefined) {
  return value === undefined ? undefined : bigintToNumber(value, USD_DECIMALS);
}

function sumDefinedBigInts(values: (bigint | undefined)[]) {
  let hasValue = false;
  let sum = 0n;

  for (const value of values) {
    if (value !== undefined) {
      hasValue = true;
      sum += value;
    }
  }

  return hasValue ? sum : undefined;
}

function applyDebugAggregates<T extends BasePnlHistoryPoint>(target: T, bucketPoints: T[]) {
  const firstPoint = bucketPoints[0] as unknown as Record<string, bigint | number | undefined>;
  const lastPoint = bucketPoints[bucketPoints.length - 1] as unknown as Record<string, bigint | number | undefined>;
  const targetWithDebugFields = target as unknown as Record<string, bigint | number | undefined>;

  for (const field of DEBUG_SUM_FIELDS) {
    const value = sumDefinedBigInts(
      bucketPoints.map((point) => (point as unknown as Record<string, bigint | undefined>)[field])
    );

    if (value !== undefined) {
      targetWithDebugFields[field] = value;
      targetWithDebugFields[`${field}Float`] = getFloatValue(value);
    }
  }

  for (const field of DEBUG_LAST_FIELDS) {
    const value = lastPoint[field];

    if (typeof value === "bigint") {
      targetWithDebugFields[field] = value;
      targetWithDebugFields[`${field}Float`] = getFloatValue(value);
    }
  }

  for (const field of DEBUG_FIRST_FIELDS) {
    const value = firstPoint[field];

    if (typeof value === "bigint") {
      targetWithDebugFields[field] = value;
      targetWithDebugFields[`${field}Float`] = getFloatValue(value);
    }
  }
}

export function groupPnlHistoryData<T extends BasePnlHistoryPoint>(data: T[], grouping: PnlChartGrouping): T[] {
  if (grouping === "daily" || data.length === 0) {
    return data;
  }

  const buckets = new Map<number, T[]>();

  for (const point of data) {
    const bucketStart = getBucketStart(point.timestamp, grouping);
    const bucketPoints = buckets.get(bucketStart);

    if (bucketPoints) {
      bucketPoints.push(point);
    } else {
      buckets.set(bucketStart, [point]);
    }
  }

  return Array.from(buckets.values()).map((bucketPoints) => {
    const firstPoint = bucketPoints[0];
    const lastPoint = bucketPoints[bucketPoints.length - 1];
    const pnl = sumDefinedBigInts(bucketPoints.map((point) => point.pnl));
    const cumulativePnl = lastPoint.cumulativePnl;
    const groupedPoint = {
      ...lastPoint,
      timestamp: firstPoint.timestamp,
      date: formatPnlChartRange(firstPoint.timestamp, lastPoint.timestamp),
      dateCompact: getBucketCompactLabel(firstPoint.timestamp, grouping),
      pnl,
      pnlFloat: getFloatValue(pnl),
      cumulativePnl,
      cumulativePnlFloat: getFloatValue(cumulativePnl),
    };

    applyDebugAggregates(groupedPoint, bucketPoints);

    return groupedPoint;
  });
}

const WEEKLY_GROUPING_THRESHOLD_SECONDS = 90 * SECONDS_IN_DAY;
const MONTHLY_GROUPING_THRESHOLD_SECONDS = 365 * SECONDS_IN_DAY;

export function getDefaultPnlChartGrouping<T extends BasePnlHistoryPoint>(data: T[]): PnlChartGrouping {
  if (data.length < 2) {
    return "daily";
  }

  const historySpanSeconds = data[data.length - 1].timestamp - data[0].timestamp;

  if (historySpanSeconds > MONTHLY_GROUPING_THRESHOLD_SECONDS) {
    return "monthly";
  }

  if (historySpanSeconds > WEEKLY_GROUPING_THRESHOLD_SECONDS) {
    return "weekly";
  }

  return "daily";
}

export function normalizeZoomWindow(window: PnlZoomWindow | undefined, dataLength: number): PnlZoomWindow | undefined {
  if (!window || dataLength <= 0) {
    return undefined;
  }

  const startIndex = clamp(Math.floor(window.startIndex), 0, dataLength - 1);
  const endIndex = clamp(Math.floor(window.endIndex), startIndex, dataLength - 1);

  if (startIndex === 0 && endIndex === dataLength - 1) {
    return undefined;
  }

  return { startIndex, endIndex };
}

export function getZoomedPnlHistoryData<T>(data: T[], window: PnlZoomWindow | undefined): T[] {
  const normalizedWindow = normalizeZoomWindow(window, data.length);

  if (!normalizedWindow) {
    return data;
  }

  return data.slice(normalizedWindow.startIndex, normalizedWindow.endIndex + 1);
}

export function getPnlChartAreaXAxisDomain(startIndex: number, endIndex: number): [number, number] {
  if (startIndex === endIndex) {
    // A single point cannot span an axis; pad half a slot on each side so the point aligns with the bar's center.
    return [startIndex - 0.5, endIndex + 0.5];
  }

  return [startIndex, endIndex];
}

const WHEEL_DELTA_LINE_HEIGHT = 40;
const WHEEL_DELTA_PAGE_HEIGHT = 800;

/**
 * WheelEvent.deltaY units depend on deltaMode: pixels (0), lines (1, e.g. Firefox with a mouse wheel),
 * or pages (2). Convert to pixels so zoom speed is consistent across browsers.
 */
export function getWheelDeltaPixels(deltaY: number, deltaMode: number) {
  if (deltaMode === 1) {
    return deltaY * WHEEL_DELTA_LINE_HEIGHT;
  }

  if (deltaMode === 2) {
    return deltaY * WHEEL_DELTA_PAGE_HEIGHT;
  }

  return deltaY;
}

export function getPnlChartWheelZoomSlowdown(visibleLength: number, dataLength: number) {
  if (visibleLength <= 0 || dataLength <= 0) {
    return 1;
  }

  return clamp(Math.sqrt(dataLength / visibleLength), 1, 20);
}

export function getPnlChartDragPanSpeed(visibleLength: number) {
  if (visibleLength <= 0) {
    return 1;
  }

  return clamp(Math.sqrt(visibleLength / 12), 1, 5);
}

export function zoomPnlWindow(
  currentWindow: PnlZoomWindow | undefined,
  dataLength: number,
  direction: "in" | "out"
): PnlZoomWindow | undefined {
  return zoomPnlWindowAtRatio(currentWindow, dataLength, direction, 0.5);
}

export function zoomPnlWindowAtRatio(
  currentWindow: PnlZoomWindow | undefined,
  dataLength: number,
  direction: "in" | "out",
  anchorRatio: number,
  zoomFactor = PNL_CHART_ZOOM_FACTOR
): PnlZoomWindow | undefined {
  if (dataLength <= 2) {
    return undefined;
  }

  const normalizedWindow = normalizeZoomWindow(currentWindow, dataLength) ?? {
    startIndex: 0,
    endIndex: dataLength - 1,
  };
  const visibleLength = normalizedWindow.endIndex - normalizedWindow.startIndex + 1;
  const safeZoomFactor = clamp(zoomFactor, 0.01, 0.999);
  const nextVisibleLength =
    direction === "in"
      ? Math.max(2, Math.floor(visibleLength * safeZoomFactor))
      : Math.min(dataLength, Math.ceil(visibleLength / safeZoomFactor));

  if (nextVisibleLength === dataLength) {
    return undefined;
  }

  if (nextVisibleLength === visibleLength) {
    return normalizedWindow;
  }

  const safeAnchorRatio = clamp(anchorRatio, 0, 1);
  const anchorIndex = normalizedWindow.startIndex + (visibleLength - 1) * safeAnchorRatio;
  let startIndex = Math.round(anchorIndex - (nextVisibleLength - 1) * safeAnchorRatio);
  startIndex = clamp(startIndex, 0, dataLength - nextVisibleLength);

  return normalizeZoomWindow({ startIndex, endIndex: startIndex + nextVisibleLength - 1 }, dataLength);
}

export function panPnlWindowByDelta(
  currentWindow: PnlZoomWindow | undefined,
  dataLength: number,
  deltaPoints: number
): PnlZoomWindow | undefined {
  const normalizedWindow = normalizeZoomWindow(currentWindow, dataLength);

  if (!normalizedWindow) {
    return undefined;
  }

  const visibleLength = normalizedWindow.endIndex - normalizedWindow.startIndex + 1;
  const startIndex = clamp(normalizedWindow.startIndex + deltaPoints, 0, dataLength - visibleLength);

  return normalizeZoomWindow({ startIndex, endIndex: startIndex + visibleLength - 1 }, dataLength);
}

export function panPnlWindow(
  currentWindow: PnlZoomWindow | undefined,
  dataLength: number,
  direction: "left" | "right"
): PnlZoomWindow | undefined {
  const normalizedWindow = normalizeZoomWindow(currentWindow, dataLength);

  if (!normalizedWindow) {
    return undefined;
  }

  const visibleLength = normalizedWindow.endIndex - normalizedWindow.startIndex + 1;
  const step = Math.max(1, Math.round(visibleLength * 0.4));
  const delta = direction === "left" ? -step : step;
  return panPnlWindowByDelta(normalizedWindow, dataLength, delta);
}
