import { useLocalStorageSerializeKey } from "lib/localStorage";
import { useCallback, useEffect, useRef, useState } from "react";
import { TV_SAVE_LOAD_CHARTS } from "config/localStorage";
import { useLocalStorage } from "react-use";
import { defaultChartProps, getKeyByValue, SaveLoadAdapter, supportedResolutions } from "./constants";
import useTVDatafeed from "domain/tradingview/useTVDatafeed";
const DEFAULT_PERIOD = "4h";

export default function TVChartContainer({
  symbol,
  chainId,
  savedShouldShowPositionLines,
  currentPositions,
  currentOrders,
  onSelectToken,
}) {
  const tvChartRef = useRef();
  const tvWidgetRef = useRef(null);
  const [chartReady, setChartReady] = useState(false);
  let [period, setPeriod] = useLocalStorageSerializeKey([chainId, "Chart-period"], DEFAULT_PERIOD);
  let [tvCharts, setTvCharts] = useLocalStorage(TV_SAVE_LOAD_CHARTS, []);
  const datafeed = useTVDatafeed();

  const drawLineOnChart = useCallback(
    (title, price) => {
      if (chartReady && tvWidgetRef.current?.activeChart?.().dataReady()) {
        return tvWidgetRef.current
          .activeChart()
          .createPositionLine({ disableUndo: true })
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

  useEffect(() => {
    const lines = [];
    if (savedShouldShowPositionLines) {
      currentPositions.forEach((position) => {
        const { open, liq } = position;
        lines.push(drawLineOnChart(open.title, open.price));
        lines.push(drawLineOnChart(liq.title, liq.price));
      });
      currentOrders.forEach((order) => {
        lines.push(drawLineOnChart(order.title, order.price));
      });
    }
    return () => {
      lines.forEach((line) => line?.remove());
    };
  }, [currentPositions, savedShouldShowPositionLines, currentOrders, drawLineOnChart]);

  useEffect(() => {
    if (chartReady && tvWidgetRef.current && symbol !== tvWidgetRef.current?.activeChart?.().symbol()) {
      tvWidgetRef.current.setSymbol(symbol, tvWidgetRef.current.activeChart().resolution(), () => {});
    }
  }, [symbol, chartReady, period]);

  useEffect(() => {
    const widgetOptions = {
      debug: false,
      symbol: symbol,
      datafeed: datafeed,
      theme: defaultChartProps.theme,
      interval: getKeyByValue(supportedResolutions, period),
      container: tvChartRef.current,
      library_path: defaultChartProps.libraryPath,
      locale: defaultChartProps.locale,
      loading_screen: defaultChartProps.loading_screen,
      save_load_adapter: new SaveLoadAdapter(chainId, tvCharts, setTvCharts, onSelectToken),
      enabled_features: defaultChartProps.enabled_features,
      disabled_features: defaultChartProps.disabled_features,
      client_id: defaultChartProps.clientId,
      user_id: defaultChartProps.userId,
      fullscreen: defaultChartProps.fullscreen,
      autosize: defaultChartProps.autosize,
      custom_css_url: "/tradingview-chart.css",
      studies_overrides: defaultChartProps.studiesOverrides,
      overrides: defaultChartProps.overrides,
    };
    tvWidgetRef.current = new window.TradingView.widget(widgetOptions);

    tvWidgetRef.current.onChartReady(function () {
      setChartReady(true);
      tvWidgetRef.current.applyOverrides({
        "paneProperties.background": "#16182e",
        "paneProperties.backgroundType": "solid",
      });
      tvWidgetRef.current
        .activeChart()
        .onIntervalChanged()
        .subscribe(null, (interval) => {
          if (supportedResolutions[interval]) {
            const period = supportedResolutions[interval];
            setPeriod(period);
          }
        });
    });

    return () => {
      tvWidgetRef.current.remove();
      tvWidgetRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={tvChartRef} className="TVChartContainer ExchangeChart-bottom-content" />;
}
