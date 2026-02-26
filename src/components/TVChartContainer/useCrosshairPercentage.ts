import { RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { USD_DECIMALS } from "config/factors";
import { selectTradeboxMarkPrice } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { bigintToNumber } from "lib/numbers";

import type { CrossHairMovedEventParams, IChartingLibraryWidget } from "../../charting_library";

export interface CrosshairPercentageState {
  formattedPrice: string;
  percentage: number;
  offsetY: number;
  priceAxisCenterX: number | null;
  priceAxisWidth: number | null;
  isVisible: boolean;
}

const INITIAL_STATE: CrosshairPercentageState = {
  formattedPrice: "",
  percentage: 0,
  offsetY: 0,
  priceAxisCenterX: null,
  priceAxisWidth: null,
  isVisible: false,
};

export function useCrosshairPercentage(
  tvWidgetRef: RefObject<IChartingLibraryWidget | null>,
  chartContainerRef: RefObject<HTMLDivElement | null>,
  chartReady: boolean,
  visualMultiplier: number | undefined
): CrosshairPercentageState {
  const markPriceBn = useSelector(selectTradeboxMarkPrice);
  const markPriceRef = useRef<number | undefined>(undefined);

  const markPrice = useMemo(() => {
    if (markPriceBn === undefined) return undefined;
    const priceFloat = bigintToNumber(markPriceBn, USD_DECIMALS);
    return visualMultiplier ? priceFloat * visualMultiplier : priceFloat;
  }, [markPriceBn, visualMultiplier]);

  const [state, setState] = useState<CrosshairPercentageState>(INITIAL_STATE);

  useEffect(() => {
    markPriceRef.current = markPrice;

    if (markPrice === undefined) {
      setState(INITIAL_STATE);
    }
  }, [markPrice]);

  const hideLabel = useCallback(() => {
    setState((prev) => (prev.isVisible ? { ...prev, isVisible: false } : prev));
  }, []);

  const getPriceAxisMetrics = useCallback(() => {
    const container = chartContainerRef.current;
    if (!container) return null;

    const iframe = container.querySelector("iframe");
    if (!iframe?.contentDocument) return null;

    const priceAxes = Array.from(iframe.contentDocument.querySelectorAll(".price-axis"));
    if (priceAxes.length === 0) return null;

    let rightmostPriceAxisRect: DOMRect | null = null;

    for (const el of priceAxes) {
      const rect = el.getBoundingClientRect();
      if (rightmostPriceAxisRect === null || rect.left > rightmostPriceAxisRect.left) {
        rightmostPriceAxisRect = rect;
      }
    }

    if (!rightmostPriceAxisRect) return null;

    const containerRect = container.getBoundingClientRect();
    const iframeRect = iframe.getBoundingClientRect();
    const axisRect = rightmostPriceAxisRect;

    // axisRect coords are relative to iframe viewport, not to main document
    const axisLeftInContainer = iframeRect.left - containerRect.left + axisRect.left;

    return {
      centerX: axisLeftInContainer + axisRect.width / 2,
      width: axisRect.width,
    };
  }, [chartContainerRef]);

  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container || !chartReady) return;

    const iframe = container.querySelector("iframe");
    if (!iframe?.contentDocument) return;

    const chartGuiWrapper = iframe.contentDocument.querySelector(".chart-gui-wrapper");
    if (!chartGuiWrapper) return;

    chartGuiWrapper.addEventListener("mouseleave", hideLabel);

    return () => {
      chartGuiWrapper.removeEventListener("mouseleave", hideLabel);
    };
  }, [chartContainerRef, chartReady, hideLabel]);

  useEffect(() => {
    if (!chartReady || !tvWidgetRef.current) {
      setState(INITIAL_STATE);
      return;
    }

    let chart;
    try {
      chart = tvWidgetRef.current.activeChart();
    } catch {
      setState(INITIAL_STATE);
      return;
    }

    const priceFormatter = chart.priceFormatter();
    let cancelled = false;

    const callback = (params: CrossHairMovedEventParams) => {
      const currentMarkPrice = markPriceRef.current;
      if (cancelled || params.offsetY === undefined || currentMarkPrice === undefined) {
        hideLabel();
        return;
      }

      const crosshairPrice = params.price;
      const percentage = ((crosshairPrice - currentMarkPrice) / currentMarkPrice) * 100;
      const metrics = getPriceAxisMetrics();

      setState({
        formattedPrice: priceFormatter.format(crosshairPrice),
        percentage,
        offsetY: params.offsetY,
        priceAxisCenterX: metrics?.centerX ?? null,
        priceAxisWidth: metrics?.width ?? null,
        isVisible: true,
      });
    };

    chart.crossHairMoved().subscribe(null, callback);

    return () => {
      cancelled = true;
      chart.crossHairMoved().unsubscribe(null, callback);
    };
  }, [chartReady, tvWidgetRef, getPriceAxisMetrics, hideLabel]);

  return state;
}
