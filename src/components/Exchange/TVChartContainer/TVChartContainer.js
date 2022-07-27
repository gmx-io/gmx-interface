import { useEffect, useRef } from "react";
import { widget } from "../../../charting_library/charting_library";
import Datafeed from "./api/DataFeed";
import "./TVChartContainer.css";

function getLanguageFromURL() {
  const regex = new RegExp("[\\?&]lang=([^&#]*)");
  const results = regex.exec(window.location.search);
  return results === null ? null : decodeURIComponent(results[1].replace(/\+/g, " "));
}

const defaultProps = {
  symbol: "ETH/USD",
  interval: "15",
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
  const tvWidget = useRef(null);
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
      symbol: props.symbol || defaultProps.symbol,
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
    tvWidget.current = new widget(widgetOptions);
    tvWidget.current.onChartReady(() => {
      tvWidget.headerReady().then(() => {
        const button = tvWidget.createButton();
        button.setAttribute("title", "Click to show a notification popup");
        button.classList.add("apply-common-tooltip");
        button.addEventListener("click", () =>
          tvWidget.showNoticeDialog({
            title: "Notification",
            body: "TradingView Charting Library API works correctly",
            callback: () => {
              console.log("Noticed!");
            },
          })
        );

        button.innerHTML = "Check API";
      });
    });
    return () => {
      tvWidget.current.remove();
      tvWidget.current = null;
    };
  }, [props.symbol]);
  return <div ref={tvChartRef} className="TVChartContainer ExchangeChart-bottom-content" />;
}
