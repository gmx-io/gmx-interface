import { ChartingLibraryFeatureset, ChartingLibraryWidgetOptions, WidgetOverrides } from "charting_library";
import { ARBITRUM, AVALANCHE } from "config/chains";
import { lightFormat, parse } from "date-fns";
import { formatTVDate, formatTVTime } from "lib/dates";

const RED = "#fa3c58";
const GREEN = "#0ecc83";
export const DEFAULT_PERIOD = "4h";

const chartStyleOverrides: Partial<WidgetOverrides> = ["candleStyle", "hollowCandleStyle", "haStyle"].reduce(
  (acc, cv) => {
    acc[`mainSeriesProperties.${cv}.drawWick`] = true;
    acc[`mainSeriesProperties.${cv}.drawBorder`] = false;
    acc[`mainSeriesProperties.${cv}.upColor`] = GREEN;
    acc[`mainSeriesProperties.${cv}.downColor`] = RED;
    acc[`mainSeriesProperties.${cv}.wickUpColor`] = GREEN;
    acc[`mainSeriesProperties.${cv}.wickDownColor`] = RED;
    acc[`mainSeriesProperties.${cv}.borderUpColor`] = GREEN;
    acc[`mainSeriesProperties.${cv}.borderDownColor`] = RED;
    return acc;
  },
  {}
);

const chartOverrides: Partial<WidgetOverrides> = {
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

export const disabledFeaturesOnMobile: ChartingLibraryFeatureset[] = ["header_saveload", "header_fullscreen_button"];

const disabledFeatures: ChartingLibraryFeatureset[] = [
  "volume_force_overlay",
  "create_volume_indicator_by_default",
  "header_compare",
  "symbol_search_hot_key",
  "allow_arbitrary_symbol_search_input",
  "header_quick_search",
  "display_market_status",
  "show_interval_dialog_on_key_press",
  "header_symbol_search",
  "popup_hints",
  "header_in_fullscreen_mode",
  "use_localstorage_for_settings",
  "right_bar_stays_on_scroll",
  "symbol_info",
  "edit_buttons_in_legend",
  "header_undo_redo",
];

const enabledFeatures: ChartingLibraryFeatureset[] = [
  "side_toolbar_in_fullscreen_mode",
  "header_in_fullscreen_mode",
  "items_favoriting",
  "hide_left_toolbar_by_default",
];

export const defaultChartProps = {
  theme: "dark",
  locale: "en",
  library_path: "/charting_library/",
  client_id: "tradingview.com",
  user_id: "public_user_id",
  fullscreen: false,
  autosize: true,
  overrides: chartOverrides,
  enabled_features: enabledFeatures,
  disabled_features: disabledFeatures,
  custom_css_url: "/tradingview-chart.css",
  loading_screen: { backgroundColor: "#16182e", foregroundColor: "#2962ff" },
  favorites: {},
  custom_formatters: {
    timeFormatter: {
      format: (date) => formatTVTime(date),
      formatLocal: (date) => formatTVTime(date),
      parse: (date) => lightFormat(parse(date, "h:mm a", new Date()), "YYYY-MM-DD"),
    },
    dateFormatter: {
      format: (date) => formatTVDate(date),
      formatLocal: (date) => formatTVDate(date),
      parse: (date) => lightFormat(parse(date, "dd MMM yyyy", new Date()), "YYYY-MM-DD"),
    },
  },
} satisfies Partial<ChartingLibraryWidgetOptions>;

export const availableNetworksForChart = [ARBITRUM, AVALANCHE];
