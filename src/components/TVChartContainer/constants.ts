import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/macro";
import { lightFormat, parse } from "date-fns";

import { ChartingLibraryFeatureset, ChartingLibraryWidgetOptions, WidgetOverrides } from "charting_library";
import { ARBITRUM, AVALANCHE } from "config/chains";
import { colors } from "config/colors";
import { USD_DECIMALS } from "config/factors";
import { OrderType } from "domain/synthetics/orders";
import { formatTVDate, formatTVTime } from "lib/dates";
import { calculateDisplayDecimals, numberToBigint } from "lib/numbers";

export const DEFAULT_PERIOD = "4h";

const createChartStyleOverrides = (upColor: string, downColor: string): Partial<WidgetOverrides> =>
  ["candleStyle", "hollowCandleStyle", "haStyle"].reduce((acc, cv) => {
    acc[`mainSeriesProperties.${cv}.drawWick`] = true;
    acc[`mainSeriesProperties.${cv}.drawBorder`] = false;
    acc[`mainSeriesProperties.${cv}.upColor`] = upColor;
    acc[`mainSeriesProperties.${cv}.downColor`] = downColor;
    acc[`mainSeriesProperties.${cv}.wickUpColor`] = upColor;
    acc[`mainSeriesProperties.${cv}.wickDownColor`] = downColor;
    acc[`mainSeriesProperties.${cv}.borderUpColor`] = upColor;
    acc[`mainSeriesProperties.${cv}.borderDownColor`] = downColor;
    return acc;
  }, {});

export const chartOverridesDark: Partial<WidgetOverrides> = {
  "paneProperties.background": "#121421",
  "paneProperties.backgroundGradientStartColor": "#121421",
  "paneProperties.backgroundGradientEndColor": "#121421",
  "paneProperties.backgroundType": "solid",
  "paneProperties.vertGridProperties.color": "#363A5960",
  "paneProperties.vertGridProperties.style": 2,
  "paneProperties.horzGridProperties.color": "#363A5960",
  "paneProperties.horzGridProperties.style": 2,
  "mainSeriesProperties.priceLineColor": "#8B94B6AA",
  "scalesProperties.textColor": colors.typography["secondary"].dark,
  "mainSeriesProperties.statusViewStyle.showExchange": false,
  ...createChartStyleOverrides(colors.green[500].dark, colors.red[500].dark),
};

export const chartOverridesLight: Partial<WidgetOverrides> = {
  "paneProperties.background": "#FFFFFF",
  "paneProperties.backgroundGradientStartColor": "#FFFFFF",
  "paneProperties.backgroundGradientEndColor": "#FFFFFF",
  "paneProperties.backgroundType": "solid",
  "paneProperties.vertGridProperties.color": "#E0E0E0",
  "paneProperties.vertGridProperties.style": 2,
  "paneProperties.horzGridProperties.color": "#E0E0E0",
  "paneProperties.horzGridProperties.style": 2,
  "mainSeriesProperties.priceLineColor": "#6B7280AA",
  "scalesProperties.textColor": colors.typography["secondary"].light,
  "mainSeriesProperties.statusViewStyle.showExchange": false,
  ...createChartStyleOverrides(colors.green[500].light, colors.red[500].light),
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
  "header_saveload",
];

const enabledFeatures: ChartingLibraryFeatureset[] = [
  "side_toolbar_in_fullscreen_mode",
  "header_in_fullscreen_mode",
  "items_favoriting",
  "hide_left_toolbar_by_default",
  "iframe_loading_same_origin",
];

export const defaultChartProps = {
  theme: "dark",
  locale: "en",
  library_path: "/charting_library/",
  client_id: "tradingview.com",
  user_id: "public_user_id",
  fullscreen: false,
  autosize: true,
  overrides: chartOverridesDark,
  enabled_features: enabledFeatures,
  disabled_features: disabledFeatures,
  custom_css_url: "/tradingview-chart.css",
  loading_screen: { backgroundColor: "#121421", foregroundColor: "#2962ff" },
  favorites: {},
  custom_formatters: {
    timeFormatter: {
      format: (date) => formatTVTime(date),
      formatLocal: (date) => formatTVTime(date),
      parse: (date) => lightFormat(parse(date, "HH:mm", new Date()), "YYYY-MM-DD"),
    },
    dateFormatter: {
      format: (date) => formatTVDate(date),
      formatLocal: (date) => formatTVDate(date),
      parse: (date) => lightFormat(parse(date, "dd MMM yyyy", new Date()), "YYYY-MM-DD"),
    },

    priceFormatterFactory: (symbolInfo) => {
      if (symbolInfo === null) {
        return null;
      }

      return {
        format: (price) => {
          const bn = numberToBigint(price, USD_DECIMALS);
          let displayDecimals = calculateDisplayDecimals(bn);

          // Custom float formatting to avoid floating point precision issues like 256.999
          const roundedFloat = Math.round(price * 10 ** displayDecimals) / 10 ** displayDecimals;

          // Special case for stablecoins because calculateDisplayDecimals is not accurate for them
          if (roundedFloat === 1) {
            displayDecimals = 4;
          } else if (roundedFloat === 0) {
            displayDecimals = 2;
          }

          let [whole, decimals = ""] = String(roundedFloat).split(".");

          decimals = decimals.slice(0, displayDecimals).padEnd(displayDecimals, "0");

          const formattedFloat = `${whole}.${decimals}`;

          return formattedFloat;
        },
      };
    },
  },
} satisfies Partial<ChartingLibraryWidgetOptions>;

export const availableNetworksForChart = [ARBITRUM, AVALANCHE];

export const orderTypeToTitle: Partial<Record<`${OrderType}-${"long" | "short"}`, MessageDescriptor>> = {
  [`${OrderType.LimitIncrease}-short`]: msg`Limit - Short Inc.`,
  [`${OrderType.LimitIncrease}-long`]: msg`Limit - Long Inc.`,

  [`${OrderType.LimitDecrease}-short`]: msg`TP - Short Dec.`,
  [`${OrderType.LimitDecrease}-long`]: msg`TP - Long Dec.`,

  [`${OrderType.StopLossDecrease}-long`]: msg`SL - Long Dec.`,
  [`${OrderType.StopLossDecrease}-short`]: msg`SL - Short Dec.`,

  [`${OrderType.StopIncrease}-short`]: msg`Stop Market - Short Inc.`,
  [`${OrderType.StopIncrease}-long`]: msg`Stop Market - Long Inc.`,

  [`${OrderType.MarketIncrease}-long`]: msg`Market - Long Inc.`,
  [`${OrderType.MarketIncrease}-short`]: msg`Market - Short Inc.`,

  [`${OrderType.MarketDecrease}-long`]: msg`Market - Long Dec.`,
  [`${OrderType.MarketDecrease}-short`]: msg`Market - Short Dec.`,
};
