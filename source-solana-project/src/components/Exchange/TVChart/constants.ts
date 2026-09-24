import { USD_DECIMALS } from '@/config/constants';
import { getPriceDecimals, parseValue } from '@/utils/legacy';
import { formatTVDate, formatTVTime } from '@/utils/legacy/format';
import { format as formatDateFn, lightFormat, parse } from 'date-fns';

import {
  ChartingLibraryFeatureset,
  ChartingLibraryWidgetOptions,
  ResolutionString,
  WidgetOverrides,
} from '../../../../public/charting_library';

const RED = '#FF5454';
const GREEN = '#31C366';
const CHART_GRID_COLOR = '#53535350';
const CHART_CROSSHAIR_COLOR = '#A3A3A350';
const CHART_SOLID_LINE_STYLE = 0;

let currentChartResolution: string | undefined;

const isHigherTimeframeResolution = (resolution?: string) =>
  resolution === '1D' || resolution === '1W' || resolution === '1M';

const formatChartHoverDate = (date: Date) =>
  isHigherTimeframeResolution(currentChartResolution)
    ? formatDateFn(date, 'dd MMM yyyy HH:mm')
    : formatTVDate(date);

const parseChartHoverDate = (value: string) =>
  lightFormat(
    parse(
      value,
      value.includes(':') ? 'dd MMM yyyy HH:mm' : 'dd MMM yyyy',
      new Date()
    ),
    'yyyy-MM-dd'
  );

export const setCurrentChartResolution = (resolution?: string) => {
  currentChartResolution = resolution;
};

export const DEFAULT_PERIOD = '4h';

const chartStyleOverrides: Partial<WidgetOverrides> = [
  'candleStyle',
  'hollowCandleStyle',
  'haStyle',
].reduce((acc: Partial<WidgetOverrides>, cv) => {
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

export const chartOverrides: Partial<WidgetOverrides> = {
  "paneProperties.background": "#181818",
  "paneProperties.backgroundGradientStartColor": "#181818",
  "paneProperties.backgroundGradientEndColor": "#181818",
  "paneProperties.backgroundType": "solid",
  "paneProperties.vertGridProperties.color": CHART_GRID_COLOR,
  "paneProperties.vertGridProperties.style": CHART_SOLID_LINE_STYLE,
  "paneProperties.horzGridProperties.color": CHART_GRID_COLOR,
  "paneProperties.horzGridProperties.style": CHART_SOLID_LINE_STYLE,
  "paneProperties.crossHairProperties.color": CHART_CROSSHAIR_COLOR,
  "mainSeriesProperties.priceLineColor": "#323232",
  'scalesProperties.textColor': '#A3A3A3',
  "scalesProperties.lineWidth": 1, 
  'mainSeriesProperties.statusViewStyle.showExchange': false,
  ...chartStyleOverrides,
};

export const disabledFeaturesOnMobile: ChartingLibraryFeatureset[] = [
  'header_saveload',
  'header_fullscreen_button',
];

export const disabledFeatures: ChartingLibraryFeatureset[] = [
  'volume_force_overlay',
  'create_volume_indicator_by_default',
  'header_compare',
  'symbol_search_hot_key',
  'allow_arbitrary_symbol_search_input',
  'header_quick_search',
  'display_market_status',
  'show_interval_dialog_on_key_press',
  'header_symbol_search',
  'popup_hints',
  'header_in_fullscreen_mode',
  'use_localstorage_for_settings',
  'right_bar_stays_on_scroll',
  'symbol_info',
  'edit_buttons_in_legend',
  'header_undo_redo',
  'header_saveload',
];

export const enabledFeatures: ChartingLibraryFeatureset[] = [
  'side_toolbar_in_fullscreen_mode',
  'header_in_fullscreen_mode',
  'items_favoriting',
  'header_undo_redo',
  'hide_left_toolbar_by_default',
  'iframe_loading_same_origin',
];

export const defaultChartProps = {
  theme: 'dark',
  locale: 'en',
  library_path: '/charting_library/',
  client_id: 'tradingview.com',
  user_id: 'public_user_id',
  fullscreen: false,
  autosize: true,
  overrides: chartOverrides,
  settings_overrides: chartOverrides,
  enabled_features: enabledFeatures,
  disabled_features: disabledFeatures,
  custom_css_url: '/tradingview-chart.css',
  loading_screen: { backgroundColor: '#181818', foregroundColor: '#FA7B4E' },
  favorites: {
    intervals: ['1', '5', '15', '1h', '4h', '1d', '1w', '1M'] as ResolutionString[],
  },
  custom_formatters: {
    timeFormatter: {
      format: (date) => formatTVTime(date),
      formatLocal: (date) => formatTVTime(date),
      parse: (date) =>
        lightFormat(parse(date, 'HH:mm', new Date()), 'YYYY-MM-DD'),
    },
    dateFormatter: {
      format: (date) => formatChartHoverDate(date),
      formatLocal: (date) => formatChartHoverDate(date),
      parse: (date) => parseChartHoverDate(date),
    },

    priceFormatterFactory: (symbolInfo) => {
      if (symbolInfo === null) {
        return null;
      }

      return {
        format: (price) => {
          const bn = parseValue(price.toString(), USD_DECIMALS);
          const precision = symbolInfo?.name.includes('EUR') || symbolInfo?.name.includes('GBP') || symbolInfo?.name.includes('USDCAD') || symbolInfo?.name.includes('USDMXN') || symbolInfo?.name.includes('USDJPY') ? 5 : getPriceDecimals(bn);
          let displayDecimals = precision;

          // Custom float formatting to avoid floating point precision issues like 256.999
          const roundedFloat =
            Math.round(price * 10 ** displayDecimals) / 10 ** displayDecimals;

          // Special case for stablecoins because calculateDisplayDecimals is not accurate for them
          if (roundedFloat === 1) {
            displayDecimals = 4;
          } else if (roundedFloat === 0) {
            displayDecimals = 2;
          }

          const [whole, decimals = ''] = String(roundedFloat).split('.');

          const formattedDecimals = decimals
            .slice(0, displayDecimals)
            .padEnd(displayDecimals, '0');

          const formattedFloat = `${whole}.${formattedDecimals}`;

          return formattedFloat;
        },
      };
    },
  },
} satisfies Partial<ChartingLibraryWidgetOptions>;
