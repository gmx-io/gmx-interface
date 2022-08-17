import { useEffect, useRef, useState } from "react";
import { widget } from "../../../charting_library";
import Datafeed from "./api/DataFeed";
import "./TVChartContainer.css";

function getLanguageFromURL() {
  const regex = new RegExp("[\\?&]lang=([^&#]*)");
  const results = regex.exec(window.location.search);
  return results === null ? null : decodeURIComponent(results[1].replace(/\+/g, " "));
}

const defaultProps = {
  symbol: "ETH",
  interval: "4h",
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

export default function TVChartContainer(props) {
  const tvChartRef = useRef();
  const tvWidgetRef = useRef(null);
  const [chartReady, setChartReady] = useState(false);
  useEffect(() => {
    if (chartReady && tvWidgetRef.current && props.symbol !== tvWidgetRef.current?.activeChart()?.symbol()) {
      console.log(props.symbol, "main");
      tvWidgetRef.current.setSymbol(props.symbol, tvWidgetRef.current.activeChart().resolution(), () => {
        // if (showOrderLines) {
        //   deleteLines();
        //   drawLinesForMarket();
        // }
      });
    }
  }, [props.symbol, chartReady]);

  useEffect(() => {
    const mainSeriesProperties = ["candleStyle", "hollowCandleStyle", "haStyle", "barStyle"];
    let chartStyleOverrides = {};
    mainSeriesProperties.forEach((prop) => {
      chartStyleOverrides = {
        ...chartStyleOverrides,
        [`mainSeriesProperties.${prop}.barColorsOnPrevClose`]: true,
        [`mainSeriesProperties.${prop}.drawWick`]: true,
        [`mainSeriesProperties.${prop}.drawBorder`]: true,
        [`mainSeriesProperties.${prop}.borderVisible`]: false,
        [`mainSeriesProperties.${prop}.upColor`]: "#0ecc83",
        [`mainSeriesProperties.${prop}.downColor`]: "#fa3c58",
        [`mainSeriesProperties.${prop}.wickUpColor`]: "#0ecc83",
        [`mainSeriesProperties.${prop}.wickDownColor`]: "#fa3c58",
      };
    });
    const widgetOptions = {
      debug: false,
      symbol: defaultProps.symbol,
      datafeed: Datafeed,
      theme: defaultProps.theme,
      interval: defaultProps.interval,
      container: tvChartRef.current,
      library_path: defaultProps.libraryPath,
      locale: getLanguageFromURL() || "en",
      enabled_features: ["hide_left_toolbar_by_default"],
      disabled_features: [
        "use_localstorage_for_settings",
        "timeframes_toolbar",
        "volume_force_overlay",
        "left_toolbar",
        "show_logo_on_all_charts",
        "caption_buttons_text_if_possible",
        "header_settings",
        "create_volume_indicator_by_default",
        "header_compare",
        "compare_symbol",
        "header_screenshot",
        "display_market_status",
        "header_saveload",
        "header_undo_redo",
        "header_interval_dialog_button",
        "show_interval_dialog_on_key_press",
        "header_symbol_search",
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
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        "paneProperties.background": "#16182e",
        "paneProperties.backgroundType": "solid",
        "paneProperties.vertGridProperties.color": "rgba(35, 38, 59, 1)",
        "paneProperties.vertGridProperties.style": 2,
        "paneProperties.horzGridProperties.color": "rgba(35, 38, 59, 1)",
        "paneProperties.horzGridProperties.style": 2,
        ...chartStyleOverrides,
      },
    };
    tvWidgetRef.current = new widget(widgetOptions);
    tvWidgetRef.current.onChartReady(function () {
      const button = tvWidgetRef?.current?.createButton();
      if (!button) {
        return;
      }
      setChartReady(true);
    });

    return () => {
      tvWidgetRef.current.remove();
      tvWidgetRef.current = null;
    };
  }, []);

  return <div ref={tvChartRef} className="TVChartContainer ExchangeChart-bottom-content" />;
}
