import { ARBITRUM, AVALANCHE } from "config/chains";

const chartStyleOverrides = ["candleStyle", "hollowCandleStyle", "haStyle"].reduce((acc, cv) => {
  acc[`mainSeriesProperties.${cv}.drawWick`] = true;
  acc[`mainSeriesProperties.${cv}.drawBorder`] = false;
  acc[`mainSeriesProperties.${cv}.upColor`] = "#0ecc83";
  acc[`mainSeriesProperties.${cv}.downColor`] = "#fa3c58";
  acc[`mainSeriesProperties.${cv}.wickUpColor`] = "#0ecc83";
  acc[`mainSeriesProperties.${cv}.wickDownColor`] = "#fa3c58";
  return acc;
}, {});

const chartOverrides = {
  "paneProperties.background": "#16182e",
  "paneProperties.backgroundGradientStartColor": "#16182e",
  "paneProperties.backgroundGradientEndColor": "#16182e",
  "paneProperties.backgroundType": "solid",
  "paneProperties.vertGridProperties.color": "rgba(35, 38, 59, 1)",
  "paneProperties.vertGridProperties.style": 2,
  "paneProperties.horzGridProperties.color": "rgba(35, 38, 59, 1)",
  "paneProperties.horzGridProperties.style": 2,
  "mainSeriesProperties.priceLineColor": "#3a3e5e",
  "scalesProperties.textColor": "#fff",
  "scalesProperties.lineColor": "#16182e",
  ...chartStyleOverrides,
};

export const disabledFeaturesOnMobile = ["header_saveload", "header_fullscreen_button"];

const disabledFeatures = [
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
  "header_in_fullscreen_mode",
];
const enabledFeatures = [
  "side_toolbar_in_fullscreen_mode",
  "header_in_fullscreen_mode",
  "hide_resolution_in_legend",
  "items_favoriting",
];

export const defaultChartProps = {
  theme: "Dark",
  locale: "en",
  library_path: "/charting_library/",
  clientId: "tradingview.com",
  userId: "public_user_id",
  fullscreen: false,
  autosize: true,
  header_widget_dom_node: false,
  overrides: chartOverrides,
  enabled_features: enabledFeatures,
  disabled_features: disabledFeatures,
  custom_css_url: "/tradingview-chart.css",
  loading_screen: { backgroundColor: "#16182e", foregroundColor: "#2962ff" },
};

export const availableNetworksForChart = [ARBITRUM, AVALANCHE];
