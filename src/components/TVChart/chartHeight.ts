export const CHART_MIN_HEIGHT = 300;
export const CHART_HEIGHT_KEYBOARD_STEP = 24;
export const CHART_HEIGHT_SNAP_DISTANCE = 8;
export const CHART_DRAG_THRESHOLD = 3;
/** The gap between the chart and the account panel, where the resize handle sits. */
export const CHART_HANDLE_GAP = 8;

const CHART_HEIGHT_STORAGE_VERSION = 1;

export type StoredChartHeight = {
  v: number;
  chartHeight: number;
};

/**
 * Default chart height on the desktop trade page, by window width.
 * The only source of the desktop default: the layout task PRO-2488 can replace it.
 */
export function getDefaultChartHeight(windowWidth: number): number {
  if (windowWidth >= 3840) {
    return 1140;
  }

  if (windowWidth >= 2560) {
    return 780;
  }

  return 536;
}

/**
 * The tallest chart that keeps the resize handle in the window when the page is at the top.
 * It is never below the default height, so a trader who never resizes keeps today's height.
 */
export function getChartMaxHeight({
  windowHeight,
  chartTop,
  defaultHeight,
}: {
  windowHeight: number;
  chartTop: number;
  defaultHeight: number;
}): number {
  return Math.max(defaultHeight, Math.floor(windowHeight - chartTop - CHART_HANDLE_GAP));
}

export function clampChartHeight(height: number, maxHeight: number): number {
  return Math.round(Math.min(Math.max(height, CHART_MIN_HEIGHT), maxHeight));
}

export function getChartHeight({
  storedHeight,
  defaultHeight,
  maxHeight,
}: {
  storedHeight: number | undefined;
  defaultHeight: number;
  maxHeight: number;
}): number {
  return storedHeight === undefined ? defaultHeight : clampChartHeight(storedHeight, maxHeight);
}

export function getIsNearDefaultChartHeight(height: number, defaultHeight: number): boolean {
  return Math.abs(height - defaultHeight) < CHART_HEIGHT_SNAP_DISTANCE;
}

export function createStoredChartHeight(chartHeight: number): StoredChartHeight {
  return { v: CHART_HEIGHT_STORAGE_VERSION, chartHeight: Math.round(chartHeight) };
}

export function parseStoredChartHeight(value: unknown): number | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  const { v, chartHeight } = value as Partial<StoredChartHeight>;

  if (v !== CHART_HEIGHT_STORAGE_VERSION || typeof chartHeight !== "number" || !Number.isFinite(chartHeight)) {
    return undefined;
  }

  return chartHeight >= CHART_MIN_HEIGHT ? chartHeight : undefined;
}
