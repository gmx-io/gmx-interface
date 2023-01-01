import { useLocalStorageSerializeKey } from "lib/localStorage";
import { useCallback, useEffect, useRef, useState } from "react";
import { getKeyByValue, supportedResolutions } from "./api";
import useDatafeed from "./useDatafeed";
const DEFAULT_PERIOD = "4h";

const defaultProps = {
  theme: "Dark",
  containerId: "tv_chart_container",
  libraryPath: "/charting_library/",
  chartsStorageUrl: "https://saveload.tradingview.com",
  chartsStorageApiVersion: "1.1",
  clientId: "tradingview.com",
  userId: "public_user_id",
  fullscreen: false,
  autosize: true,
  studiesOverrides: {},
  header_widget_dom_node: false,
};

export default function TVChartContainer({
  symbol,
  chainId,
  savedShouldShowPositionLines,
  currentPositions,
  currentOrders,
}) {
  const tvChartRef = useRef();
  const tvWidgetRef = useRef(null);
  const [chartReady, setChartReady] = useState(false);
  let [period] = useLocalStorageSerializeKey([chainId, "Chart-period"], DEFAULT_PERIOD);
  const datafeed = useDatafeed();

  const drawLineOnChart = useCallback(
    (title, price) => {
      if (!chartReady || !tvWidgetRef.current) return;

      return tvWidgetRef.current
        .activeChart()
        .createPositionLine({ disableUndo: true })
        .setText(title)
        .setPrice(price)
        .setQuantity("")
        .setLineStyle(1)
        .setLineLength(0)
        .setBodyFont(`normal 12pt "Relative", sans-serif`)
        .setBodyTextColor("#fff")
        .setLineColor("#3a3e5e")
        .setBodyBackgroundColor("#3a3e5e")
        .setBodyBorderColor("#3a3e5e");
    },
    [chartReady]
  );

  useEffect(() => {
    const lines = [];
    if (!chartReady) return;
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
  }, [chartReady, currentPositions, savedShouldShowPositionLines, currentOrders, drawLineOnChart]);

  useEffect(() => {
    if (chartReady && tvWidgetRef.current && symbol !== tvWidgetRef.current?.activeChart()?.symbol()) {
      tvWidgetRef.current.setSymbol(symbol, tvWidgetRef.current.activeChart().resolution(), () => {});
    }
  }, [symbol, chartReady]);

  useEffect(() => {
    const mainSeriesProperties = ["candleStyle", "hollowCandleStyle", "haStyle", "barStyle"];
    let chartStyleOverrides = {};
    mainSeriesProperties.forEach((prop) => {
      chartStyleOverrides = {
        ...chartStyleOverrides,
        [`mainSeriesProperties.${prop}.barColorsOnPrevClose`]: true,
        [`mainSeriesProperties.${prop}.drawWick`]: true,
        [`mainSeriesProperties.${prop}.drawBorder`]: false,
        [`mainSeriesProperties.${prop}.borderVisible`]: false,
        [`mainSeriesProperties.${prop}.upColor`]: "#0ecc83",
        [`mainSeriesProperties.${prop}.downColor`]: "#fa3c58",
        [`mainSeriesProperties.${prop}.wickUpColor`]: "#0ecc83",
        [`mainSeriesProperties.${prop}.wickDownColor`]: "#fa3c58",
      };
    });

    const widgetOptions = {
      debug: false,
      symbol: symbol,
      datafeed: datafeed,
      theme: defaultProps.theme,
      interval: getKeyByValue(supportedResolutions, period),
      container: tvChartRef.current,
      library_path: defaultProps.libraryPath,
      locale: "en",
      loading_screen: { backgroundColor: "#16182e", foregroundColor: "#2962ff" },
      disabled_features: [
        "volume_force_overlay",
        "show_logo_on_all_charts",
        "caption_buttons_text_if_possible",
        "create_volume_indicator_by_default",
        "header_compare",
        "compare_symbol",
        "display_market_status",
        "header_interval_dialog_button",
        "show_interval_dialog_on_key_press",
        "header_symbol_search",
        "popup_hints",
        "header_saveload",
      ],
      enabled_features: [
        "side_toolbar_in_fullscreen_mode",
        "header_in_fullscreen_mode",
        "hide_resolution_in_legend",
        "items_favoriting",
      ],
      charts_storage_url: defaultProps.chartsStorageUrl,
      charts_storage_api_version: defaultProps.chartsStorageApiVersion,
      client_id: defaultProps.clientId,
      user_id: defaultProps.userId,
      fullscreen: defaultProps.fullscreen,
      autosize: defaultProps.autosize,
      custom_css_url: "/tradingview-chart.css",
      studies_overrides: defaultProps.studiesOverrides,
      overrides: {
        "paneProperties.background": "#16182e",
        "paneProperties.backgroundType": "solid",
        "paneProperties.vertGridProperties.color": "rgba(35, 38, 59, 1)",
        "paneProperties.vertGridProperties.style": 2,
        "paneProperties.horzGridProperties.color": "rgba(35, 38, 59, 1)",
        "paneProperties.horzGridProperties.style": 2,
        "mainSeriesProperties.priceLineColor": "#3a3e5e",
        "scalesProperties.statusViewStyle.symbolTextSource": "ticker",
        "scalesProperties.textColor": "#fff",
        "scalesProperties.lineColor": "#16182e",
        ...chartStyleOverrides,
      },
    };
    tvWidgetRef.current = new window.TradingView.widget(widgetOptions);
    tvWidgetRef.current.onChartReady(function () {
      setChartReady(true);
      tvWidgetRef.current.applyOverrides({
        "paneProperties.background": "#16182e",
        "paneProperties.backgroundType": "solid",
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
