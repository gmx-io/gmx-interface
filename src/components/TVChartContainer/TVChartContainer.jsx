import { useLocalStorageSerializeKey } from "lib/localStorage";
import { useEffect, useRef, useState } from "react";
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
  let [period, setPeriod] = useLocalStorageSerializeKey([chainId, "Chart-period"], DEFAULT_PERIOD);
  const datafeed = useDatafeed();

  function createPositionLine(title, price) {
    if (!tvWidgetRef?.current) return;
    return tvWidgetRef.current
      .activeChart()
      .createPositionLine({ id: Math.random() })
      .setText(title)
      .setPrice(price)
      .setQuantity("")
      .setLineStyle(1)
      .setLineLength(0)
      .setBodyTextColor("#fff")
      .setLineColor("#3a3e5e")
      .setBodyBackgroundColor("#3a3e5e")
      .setBodyBorderColor("#3a3e5e")
      .setBodyBorderColor("#3a3e5e");
  }

  useEffect(() => {
    const lines = [];
    if (!chartReady) return;
    if (savedShouldShowPositionLines) {
      currentPositions.forEach((position) => {
        const { open, liq } = position;
        lines.push(createPositionLine(open.title, open.price));
        lines.push(createPositionLine(liq.title, liq.price));
      });
      currentOrders.forEach((order) => {
        lines.push(createPositionLine(order.title, order.price));
      });
    }
    return () => {
      lines.forEach((line) => line?.remove());
    };
  }, [chartReady, currentPositions, savedShouldShowPositionLines, currentOrders]);

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
      debug: true,
      symbol: symbol,
      datafeed: datafeed,
      theme: defaultProps.theme,
      interval: getKeyByValue(supportedResolutions, period),
      container: tvChartRef.current,
      library_path: defaultProps.libraryPath,
      locale: "en",
      disabled_features: [
        "use_localstorage_for_settings",
        "timeframes_toolbar",
        "volume_force_overlay",
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
        "header_resolutions",
        "header_indicators",
        "header_chart_type",
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
      tvWidgetRef.current.headerReady().then(() => {
        Object.keys(supportedResolutions).forEach((res) => {
          const btn = tvWidgetRef.current.createButton();
          btn.classList.add("resolution-btn");
          if (period === supportedResolutions[res]) {
            btn.classList.add("active-resolution-btn");
            tvWidgetRef.current.chart().setResolution(res);
          }

          btn.textContent = supportedResolutions[res];
          btn.addEventListener("click", (event) => {
            tvWidgetRef.current.chart().setResolution(res, () => {
              setPeriod(supportedResolutions[res]);
              const allButtons =
                event.target.parentElement.parentElement.parentElement.querySelectorAll(".resolution-btn");
              allButtons.forEach((btn) => btn.classList.remove("active-resolution-btn"));
              event.target.classList.add("active-resolution-btn");
            });
          });
        });
        const indicatorsBtn = tvWidgetRef.current.createButton();
        indicatorsBtn.textContent = "Indicators";
        indicatorsBtn.classList.add("indicator-btn");
        indicatorsBtn.addEventListener("click", () => {
          tvWidgetRef.current.activeChart().executeActionById("insertIndicator");
        });
      });

      setChartReady(true);
    });

    return () => {
      tvWidgetRef.current.remove();
      tvWidgetRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={tvChartRef} className="TVChartContainer ExchangeChart-bottom-content" />;
}
