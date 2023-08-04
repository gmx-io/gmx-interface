import { ARBITRUM, AVALANCHE } from "config/chains";
import { formatTVDate, formatTVTime } from "lib/dates";

const RED = "#fa3c58";
const GREEN = "#0ecc83";
export const DEFAULT_PERIOD = "4h";

const chartBackgroundMap: { [key: string]: string } = {
  1: "#16182e",
  2: "#101123",
};

const chartStyleOverrides = ["candleStyle", "hollowCandleStyle", "haStyle"].reduce((acc, cv) => {
  acc[`mainSeriesProperties.${cv}.drawWick`] = true;
  acc[`mainSeriesProperties.${cv}.drawBorder`] = false;
  acc[`mainSeriesProperties.${cv}.upColor`] = GREEN;
  acc[`mainSeriesProperties.${cv}.downColor`] = RED;
  acc[`mainSeriesProperties.${cv}.wickUpColor`] = GREEN;
  acc[`mainSeriesProperties.${cv}.wickDownColor`] = RED;
  acc[`mainSeriesProperties.${cv}.borderUpColor`] = GREEN;
  acc[`mainSeriesProperties.${cv}.borderDownColor`] = RED;
  return acc;
}, {});

const getChartOverrides = (tradePageVersion) => ({
  "paneProperties.background": chartBackgroundMap[tradePageVersion],
  "paneProperties.backgroundType": "solid",
  "paneProperties.vertGridProperties.color": "rgba(35, 38, 59, 1)",
  "paneProperties.vertGridProperties.style": 2,
  "paneProperties.horzGridProperties.color": "rgba(35, 38, 59, 1)",
  "paneProperties.horzGridProperties.style": 2,
  "mainSeriesProperties.priceLineColor": "#3a3e5e",
  "scalesProperties.textColor": "#fff",
  "scalesProperties.lineColor": chartBackgroundMap[tradePageVersion],
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  ...chartStyleOverrides,
});

export const disabledFeaturesOnMobile = ["header_saveload", "header_fullscreen_button"];

const disabledFeatures = [
  "volume_force_overlay",
  "create_volume_indicator_by_default",
  "header_compare",
  "display_market_status",
  "show_interval_dialog_on_key_press",
  "header_symbol_search",
  "popup_hints",
  "header_in_fullscreen_mode",
  "use_localstorage_for_settings",
  "right_bar_stays_on_scroll",
  "symbol_info",
  "control_bar",
];
const enabledFeatures = [
  "side_toolbar_in_fullscreen_mode",
  "header_in_fullscreen_mode",
  "hide_resolution_in_legend",
  "items_favoriting",
  "hide_left_toolbar_by_default",
];

export const getDefaultChartProps = (tradePageVersion = 1) => ({
  theme: "dark",
  locale: "en",
  library_path: "/charting_library/",
  fullscreen: false,
  autosize: true,
  overrides: getChartOverrides(tradePageVersion),
  enabled_features: enabledFeatures,
  disabled_features: disabledFeatures,
  custom_css_url: "/tradingview-chart.css",
  loading_screen: { backgroundColor: chartBackgroundMap[tradePageVersion], foregroundColor: "#2962ff" },
  favorites: {},
  custom_formatters: {
    timeFormatter: {
      format: (date) => formatTVTime(date),
    },
    dateFormatter: {
      format: (date) => formatTVDate(date),
    },
  },
});

export const availableNetworksForChart = [ARBITRUM, AVALANCHE];
