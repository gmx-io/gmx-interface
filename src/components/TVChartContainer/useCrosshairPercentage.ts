import { RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { USD_DECIMALS } from "config/factors";
import { selectTradeboxMarkPrice } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";

import type { CrossHairMovedEventParams, IChartingLibraryWidget } from "../../charting_library";

export interface CrosshairPercentageState {
  percentage: number;
  offsetY: number;
  isVisible: boolean;
}

const INITIAL_STATE: CrosshairPercentageState = {
  percentage: 0,
  offsetY: 0,
  isVisible: false,
};

export function useCrosshairPercentage(
  tvWidgetRef: RefObject<IChartingLibraryWidget | null>,
  chartContainerRef: RefObject<HTMLDivElement | null>,
  chartReady: boolean,
  visualMultiplier: number | undefined
): CrosshairPercentageState {
  const markPriceBn = useSelector(selectTradeboxMarkPrice);

  const markPrice = useMemo(() => {
    if (markPriceBn === undefined) return undefined;
    const divisor = 10n ** BigInt(USD_DECIMALS);
    const priceFloat = Number(markPriceBn) / Number(divisor);
    return visualMultiplier ? priceFloat * visualMultiplier : priceFloat;
  }, [markPriceBn, visualMultiplier]);

  const [state, setState] = useState<CrosshairPercentageState>(INITIAL_STATE);
  const callbackRef = useRef<((params: CrossHairMovedEventParams) => void) | null>(null);

  const hideLabel = useCallback(() => {
    setState((prev) => (prev.isVisible ? { ...prev, isVisible: false } : prev));
  }, []);

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
    if (!chartReady || !tvWidgetRef.current || markPrice === undefined) {
      setState(INITIAL_STATE);
      return;
    }

    const chart = tvWidgetRef.current.activeChart();

    const callback = (params: CrossHairMovedEventParams) => {
      if (params.price === undefined || params.offsetY === undefined) {
        hideLabel();
        return;
      }

      const crosshairPrice = params.price;
      const percentage = ((crosshairPrice - markPrice) / markPrice) * 100;

      setState({
        percentage,
        offsetY: params.offsetY,
        isVisible: true,
      });
    };

    callbackRef.current = callback;
    chart.crossHairMoved().subscribe(null, callback);

    return () => {
      if (callbackRef.current) {
        chart.crossHairMoved().unsubscribe(null, callbackRef.current);
        callbackRef.current = null;
      }
    };
  }, [chartReady, tvWidgetRef, markPrice, hideLabel]);

  return state;
}
