import { useLocalStorageSerializeKey } from "lib/localStorage";
import { useEffect, useRef, useState } from "react";
import { widget } from "../../../../public/charting_library";
import Datafeed, { supportedResolutions } from "./datafeed";
import "./TVChartContainer.css";
const DEFAULT_PERIOD = "4h";
const defaultProps = {
  interval: DEFAULT_PERIOD,
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

export default function TVChartContainer({ symbol, chainId }) {
  const tvChartRef = useRef();
  const tvWidgetRef = useRef(null);
  const [chartReady, setChartReady] = useState(false);
  let [period, setPeriod] = useLocalStorageSerializeKey([chainId, "Chart-period"], DEFAULT_PERIOD);
  useEffect(() => {
    if (chartReady && tvWidgetRef.current && symbol !== tvWidgetRef.current?.activeChart()?.symbol()) {
      const CHAINID_SYMBOL = `${symbol}_${chainId}`;
      tvWidgetRef.current.setSymbol(CHAINID_SYMBOL, tvWidgetRef.current.activeChart().resolution(), () => {});
    }
  }, [symbol, chartReady, chainId]);

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
      debug: true,
      symbol: `${symbol}_${chainId}`,
      datafeed: Datafeed,
      theme: defaultProps.theme,
      interval: period,
      container: tvChartRef.current,
      library_path: defaultProps.libraryPath,
      locale: "en",
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
      custom_font_family: "'Inter', sans-serif",
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
      tvWidgetRef.current.headerReady().then(() => {
        Object.keys(supportedResolutions).forEach((res) => {
          const btn = tvWidgetRef.current.createButton();
          btn.classList.add("resolution-btn");
          if (period === supportedResolutions[res]) {
            btn.classList.add("active-resolution-btn");
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
