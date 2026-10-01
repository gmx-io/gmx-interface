import { Trans } from "@lingui/macro";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLatest, useMedia } from "react-use";

import type { IBasicDataFeed, IChartingLibraryWidget, ResolutionString } from "charting_library";
import { SUPPORTED_RESOLUTIONS_V2, type TradingViewResolution } from "config/tradingview";
import { useTheme } from "context/ThemeContext/ThemeContext";

import ErrorBoundary from "components/Errors/ErrorBoundary";
import Tabs from "components/Tabs/Tabs";
import {
  chartOverridesDark,
  chartOverridesLight,
  defaultChartProps,
  disabledFeaturesOnMobile,
} from "components/TVChartContainer/constants";

import { selectSolanaBars, type SolanaChartCandles } from "../lib/chartCandles";

import "components/TVChart/TVChart.scss";

const TAB_OPTIONS = [
  { value: "PRICE", label: <Trans>Price</Trans> },
  { value: "DEPTH", label: <Trans>Depth</Trans> },
  { value: "NET_RATE", label: <Trans>Net rate</Trans> },
  { value: "MARKET_GRAPH", label: <Trans>Market graph</Trans> },
];

const supportedResolutions = Object.keys(SUPPORTED_RESOLUTIONS_V2) as ResolutionString[];

function createDatafeed(
  getCandles: () => SolanaChartCandles | undefined,
  resetCallbacks: Map<string, () => void>
): IBasicDataFeed {
  return {
    onReady(callback) {
      setTimeout(() => callback({ supported_resolutions: supportedResolutions }), 0);
    },
    searchSymbols(_input, _exchange, _symbolType, onResult) {
      setTimeout(() => onResult([]), 0);
    },
    resolveSymbol(symbolName, onResolve) {
      setTimeout(
        () =>
          onResolve({
            name: symbolName,
            ticker: symbolName,
            description: `${symbolName}/USD`,
            type: "crypto",
            session: "24x7",
            timezone: "Etc/UTC",
            exchange: "GMX",
            listed_exchange: "GMX",
            format: "price",
            pricescale: 100,
            minmov: 1,
            has_intraday: true,
            has_daily: true,
            has_weekly_and_monthly: true,
            supported_resolutions: supportedResolutions,
            visible_plots_set: "ohlc",
          }),
        0
      );
    },
    getBars(_symbolInfo, resolution, { to, countBack }, onResult) {
      const bars = selectSolanaBars(getCandles(), resolution, to, countBack);
      setTimeout(() => onResult(bars, { noData: bars.length < countBack }), 0);
    },
    subscribeBars(_symbolInfo, _resolution, _onTick, listenerGuid, onResetCacheNeededCallback) {
      resetCallbacks.set(listenerGuid, onResetCacheNeededCallback);
    },
    unsubscribeBars(listenerGuid) {
      resetCallbacks.delete(listenerGuid);
    },
  };
}

type Props = {
  resolution: TradingViewResolution;
  onResolutionChange: (resolution: TradingViewResolution) => void;
  candles: SolanaChartCandles | undefined;
};

export function SolanaChart(props: Props) {
  const [tab, setTab] = useState("PRICE");

  return (
    <div className="Synthetics-chart col-span-full flex min-w-0 flex-col overflow-hidden rounded-8 bg-slate-900">
      <Tabs options={TAB_OPTIONS} selectedValue={tab} onChange={setTab} className="shrink-0" />
      {tab === "PRICE" && (
        <ErrorBoundary id="SolanaChart-Price" variant="block">
          <SolanaPriceChart {...props} />
        </ErrorBoundary>
      )}
    </div>
  );
}

function SolanaPriceChart({ resolution, onResolutionChange, candles }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<IChartingLibraryWidget | null>(null);
  const [chartReady, setChartReady] = useState(false);
  const resolutionRef = useLatest(resolution);
  const candlesRef = useLatest(candles);
  const onResolutionChangeRef = useLatest(onResolutionChange);
  const resetCallbacks = useMemo(() => new Map<string, () => void>(), []);
  const datafeed = useMemo(
    () => createDatafeed(() => candlesRef.current, resetCallbacks),
    [candlesRef, resetCallbacks]
  );
  const { theme } = useTheme();
  const isMobile = useMedia("(max-width: 550px)");

  useEffect(() => {
    const widget = new window.TradingView.widget({
      ...defaultChartProps,
      library_path: "/charting_library/",
      container: containerRef.current!,
      symbol: "SOL",
      datafeed,
      interval: String(resolutionRef.current) as ResolutionString,
      theme,
      overrides: theme === "light" ? chartOverridesLight : chartOverridesDark,
      loading_screen: {
        backgroundColor: theme === "light" ? "#FFFFFF" : "#121421",
        foregroundColor: "#2962ff",
      },
      disabled_features: isMobile
        ? defaultChartProps.disabled_features.concat(disabledFeaturesOnMobile)
        : defaultChartProps.disabled_features,
      favorites: { intervals: supportedResolutions },
    });

    widget.onChartReady(() => {
      widgetRef.current = widget;
      setChartReady(true);
      widget
        .activeChart()
        .onIntervalChanged()
        .subscribe(null, (resolution) => {
          if (resolution in SUPPORTED_RESOLUTIONS_V2) {
            onResolutionChangeRef.current(resolution as TradingViewResolution);
          }
        });
    });

    return () => {
      widgetRef.current = null;
      setChartReady(false);
      widget.remove();
      resetCallbacks.clear();
    };
  }, [theme, isMobile, datafeed, resolutionRef, onResolutionChangeRef, resetCallbacks]);

  useEffect(() => {
    if (!chartReady || !widgetRef.current || !candles) return;
    if (widgetRef.current.activeChart().resolution() !== String(candles.resolution)) return;
    resetCallbacks.forEach((resetCache) => resetCache());
    widgetRef.current.activeChart().resetData();
  }, [candles, chartReady, resetCallbacks]);

  return (
    <div className="relative min-h-0 grow">
      <div ref={containerRef} className="absolute inset-0" />
    </div>
  );
}
