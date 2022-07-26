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
};

export default function TVChartContainer(props) {
  const tvChartRef = useRef();
  const tvWidget = useRef(null);
  useEffect(() => {
    const widgetOptions = {
      debug: false,
      symbol: props.symbol || defaultProps.symbol,
      datafeed: Datafeed,
      theme: defaultProps.theme,
      interval: defaultProps.interval,
      container: tvChartRef.current,
      library_path: defaultProps.libraryPath,
      locale: getLanguageFromURL() || "en",
      disabled_features: ["use_localstorage_for_settings"],
      enabled_features: ["study_templates"],
      charts_storage_url: defaultProps.chartsStorageUrl,
      charts_storage_api_version: defaultProps.chartsStorageApiVersion,
      client_id: defaultProps.clientId,
      user_id: defaultProps.userId,
      fullscreen: defaultProps.fullscreen,
      autosize: defaultProps.autosize,
      studies_overrides: defaultProps.studiesOverrides,
      overrides: {
        "mainSeriesProperties.showCountdown": true,
        "paneProperties.background": "#131722",
        "paneProperties.vertGridProperties.color": "#363c4e",
        "paneProperties.horzGridProperties.color": "#363c4e",
        "symbolWatermarkProperties.transparency": 90,
        "scalesProperties.textColor": "#AAA",
        "mainSeriesProperties.candleStyle.wickUpColor": "#336854",
        "mainSeriesProperties.candleStyle.wickDownColor": "#7f323f",
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
