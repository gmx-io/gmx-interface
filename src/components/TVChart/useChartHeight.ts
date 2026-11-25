import { type RefObject, useCallback, useLayoutEffect, useState } from "react";
import { useWindowSize } from "react-use";

import { CHART_HEIGHT_KEY } from "config/localStorage";
import { useLocalStorageSerializeKey } from "lib/localStorage";

import {
  type StoredChartHeight,
  createStoredChartHeight,
  getChartHeight,
  getChartMaxHeight,
  getDefaultChartHeight,
  getIsNearDefaultChartHeight,
  parseStoredChartHeight,
} from "./chartHeight";

// The space above the chart in a 1512 x 860 window, used until the chart is measured
const FALLBACK_CHART_TOP = 72;

/** The top of the chart in the window when the page is scrolled to the top. */
function getChartTop(element: HTMLElement): number {
  const pageScroller = element.closest("[data-page-scroller]");

  return element.getBoundingClientRect().top + (pageScroller?.scrollTop ?? 0);
}

export function useChartHeight(containerRef: RefObject<HTMLElement>) {
  const { width: windowWidth, height: windowHeight } = useWindowSize();
  const [storedValue, setStoredValue, removeStoredValue] = useLocalStorageSerializeKey<StoredChartHeight | undefined>(
    CHART_HEIGHT_KEY,
    undefined
  );
  const [chartTop, setChartTop] = useState(FALLBACK_CHART_TOP);

  useLayoutEffect(() => {
    if (containerRef.current) {
      setChartTop(getChartTop(containerRef.current));
    }
  }, [containerRef, windowWidth, windowHeight]);

  const defaultHeight = getDefaultChartHeight(windowWidth);
  const maxHeight = getChartMaxHeight({ windowHeight, chartTop, defaultHeight });
  const chartHeight = getChartHeight({
    storedHeight: parseStoredChartHeight(storedValue),
    defaultHeight,
    maxHeight,
  });

  /** Measures the maximum again, because the header above the chart can change height. */
  const getMaxHeight = useCallback(() => {
    if (!containerRef.current) {
      return maxHeight;
    }

    return getChartMaxHeight({ windowHeight, chartTop: getChartTop(containerRef.current), defaultHeight });
  }, [containerRef, defaultHeight, maxHeight, windowHeight]);

  /** Saves the height and returns the height that the chart shows after it. */
  const saveChartHeight = useCallback(
    (height: number) => {
      if (getIsNearDefaultChartHeight(height, defaultHeight)) {
        removeStoredValue();
        return defaultHeight;
      }

      const storedChartHeight = createStoredChartHeight(height);
      setStoredValue(storedChartHeight);

      return storedChartHeight.chartHeight;
    },
    [defaultHeight, removeStoredValue, setStoredValue]
  );

  const resetChartHeight = useCallback(() => {
    removeStoredValue();
  }, [removeStoredValue]);

  return { chartHeight, maxHeight, getMaxHeight, saveChartHeight, resetChartHeight };
}
