import { useCallback, useEffect, useRef, useState } from "react";
import { TV_CHART_RELOAD_TIMESTAMP_KEY, TV_SAVE_LOAD_CHARTS_KEY } from "config/localStorage";
import { useLocalStorage, useMedia } from "react-use";
import { defaultChartProps, disabledFeaturesOnMobile } from "./constants";
import useTVDatafeed from "domain/tradingview/useTVDatafeed";
import { ChartData, IChartingLibraryWidget, IPositionLineAdapter } from "../../charting_library";
import { getObjectKeyFromValue } from "domain/tradingview/utils";
import { SaveLoadAdapter } from "./SaveLoadAdapter";
import { SUPPORTED_RESOLUTIONS, TV_CHART_RELOAD_INTERVAL } from "config/tradingview";
import { isChartAvailabeForToken } from "config/tokens";

type ChartLine = {
  price: number;
  title: string;
};

type Props = {
  symbol: string;
  chainId: number;
  savedShouldShowPositionLines: boolean;
  chartLines: ChartLine[];
  onSelectToken: () => void;
  period: string;
  setPeriod: (period: string) => void;
};

export default function TVChartContainer({
  symbol,
  chainId,
  savedShouldShowPositionLines,
  chartLines,
  onSelectToken,
  period,
  setPeriod,
}: Props) {
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const tvWidgetRef = useRef<IChartingLibraryWidget | null>(null);
  const [chartReady, setChartReady] = useState(false);
  const [tvCharts, setTvCharts] = useLocalStorage<ChartData[] | undefined>(TV_SAVE_LOAD_CHARTS_KEY, []);
  const { datafeed, resetCache } = useTVDatafeed();
  const isMobile = useMedia("(max-width: 550px)");
  const symbolRef = useRef(symbol);

  const drawLineOnChart = useCallback(
    (title: string, price: number) => {
      if (chartReady && tvWidgetRef.current?.activeChart?.().dataReady()) {
        const chart = tvWidgetRef.current.activeChart();
        const positionLine = chart.createPositionLine({ disableUndo: true });

        return positionLine
          .setText(title)
          .setPrice(price)
          .setQuantity("")
          .setLineStyle(1)
          .setLineLength(1)
          .setBodyFont(`normal 12pt "Relative", sans-serif`)
          .setBodyTextColor("#fff")
          .setLineColor("#3a3e5e")
          .setBodyBackgroundColor("#3a3e5e")
          .setBodyBorderColor("#3a3e5e");
      }
    },
    [chartReady]
  );

  /* Tradingview charting library only fetches the historical data once so if the tab is inactive or system is in sleep mode
  for a long time, the historical data will be outdated. */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        localStorage.setItem(TV_CHART_RELOAD_TIMESTAMP_KEY, Date.now().toString());
      } else {
        const tvReloadTimestamp = Number(localStorage.getItem(TV_CHART_RELOAD_TIMESTAMP_KEY));
        if (tvReloadTimestamp && Date.now() - tvReloadTimestamp > TV_CHART_RELOAD_INTERVAL) {
          if (resetCache.current) {
            resetCache.current();
            tvWidgetRef.current?.activeChart().resetData();
          }
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [resetCache]);

  useEffect(
    function updateLines() {
      const lines: (IPositionLineAdapter | undefined)[] = [];
      if (savedShouldShowPositionLines) {
        chartLines.forEach((order) => {
          lines.push(drawLineOnChart(order.title, order.price));
        });
      }
      return () => {
        lines.forEach((line) => line?.remove());
      };
    },
    [chartLines, savedShouldShowPositionLines, drawLineOnChart]
  );

  useEffect(() => {
    if (chartReady && tvWidgetRef.current && symbol !== tvWidgetRef.current?.activeChart?.().symbol()) {
      if (isChartAvailabeForToken(chainId, symbol)) {
        tvWidgetRef.current.setSymbol(symbol, tvWidgetRef.current.activeChart().resolution(), () => {});
      }
    }
  }, [symbol, chartReady, period, chainId]);

  useEffect(() => {
    const widgetOptions = {
      debug: false,
      symbol: symbolRef.current, // Using ref to avoid unnecessary re-renders on symbol change and still have access to the latest symbol
      datafeed: datafeed,
      theme: defaultChartProps.theme,
      container: chartContainerRef.current,
      library_path: defaultChartProps.library_path,
      locale: defaultChartProps.locale,
      loading_screen: defaultChartProps.loading_screen,
      enabled_features: defaultChartProps.enabled_features,
      disabled_features: isMobile
        ? defaultChartProps.disabled_features.concat(disabledFeaturesOnMobile)
        : defaultChartProps.disabled_features,
      client_id: defaultChartProps.clientId,
      user_id: defaultChartProps.userId,
      fullscreen: defaultChartProps.fullscreen,
      autosize: defaultChartProps.autosize,
      custom_css_url: defaultChartProps.custom_css_url,
      overrides: defaultChartProps.overrides,
      interval: getObjectKeyFromValue(period, SUPPORTED_RESOLUTIONS),
      favorites: defaultChartProps.favorites,
      custom_formatters: defaultChartProps.custom_formatters,
      save_load_adapter: new SaveLoadAdapter(chainId, tvCharts, setTvCharts, onSelectToken),
    };
    tvWidgetRef.current = new window.TradingView.widget(widgetOptions);
    tvWidgetRef.current!.onChartReady(function () {
      setChartReady(true);
      tvWidgetRef.current!.applyOverrides({
        "paneProperties.background": "#16182e",
        "paneProperties.backgroundType": "solid",
      });
      tvWidgetRef.current
        ?.activeChart()
        .onIntervalChanged()
        .subscribe(null, (interval) => {
          if (SUPPORTED_RESOLUTIONS[interval]) {
            const period = SUPPORTED_RESOLUTIONS[interval];
            setPeriod(period);
          }
        });
    });

    return () => {
      if (tvWidgetRef.current) {
        tvWidgetRef.current.remove();
        tvWidgetRef.current = null;
        setChartReady(false);
      }
    };
    // We don't want to re-initialize the chart when the symbol changes. This will make the chart flicker.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chainId]);

  return <div ref={chartContainerRef} className="TVChartContainer ExchangeChart-bottom-content" />;
}
