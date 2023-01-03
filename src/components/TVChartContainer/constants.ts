import { getTokenBySymbol } from "config/tokens";
import { Token } from "domain/tokens";

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
];
const enabledFeatures = [
  "side_toolbar_in_fullscreen_mode",
  "header_in_fullscreen_mode",
  "hide_resolution_in_legend",
  "items_favoriting",
];

export class SaveLoadAdapter {
  charts: any[];
  setTvCharts: (a: any[]) => void;
  onSelectToken: (token: Token) => void;
  chainId: number;

  constructor(chainId, charts, setTvCharts, onSelectToken) {
    this.charts = charts;
    this.setTvCharts = setTvCharts;
    this.chainId = chainId;
    this.onSelectToken = onSelectToken;
  }

  getAllCharts() {
    return Promise.resolve(this.charts);
  }

  removeChart(id: number) {
    for (let i = 0; i < this.charts.length; ++i) {
      if (this.charts[i].id === id) {
        this.charts.splice(i, 1);
        this.setTvCharts(this.charts);
        return Promise.resolve();
      }
    }

    return Promise.reject();
  }

  saveChart(chartData) {
    if (!chartData.id) {
      chartData.id = Math.random().toString();
    } else {
      this.removeChart(chartData.id);
    }

    chartData.timestamp = new Date().valueOf();

    this.charts.push(chartData);

    this.setTvCharts(this.charts);

    return Promise.resolve(chartData.id);
  }

  getChartContent(id) {
    for (let i = 0; i < this.charts.length; ++i) {
      if (this.charts[i].id === id) {
        const { content, symbol } = this.charts[i];
        const tokenInfo = getTokenBySymbol(this.chainId, symbol);
        this.onSelectToken(tokenInfo);
        return Promise.resolve(content);
      }
    }
    return Promise.reject();
  }
}

export const defaultChartProps = {
  theme: "Dark",
  locale: "en",
  library_path: "/charting_library/",
  clientId: "tradingview.com",
  userId: "public_user_id",
  fullscreen: false,
  autosize: true,
  studiesOverrides: {},
  header_widget_dom_node: false,
  overrides: chartOverrides,
  enabled_features: enabledFeatures,
  disabled_features: disabledFeatures,
  custom_css_url: "/tradingview-chart.css",
  loading_screen: { backgroundColor: "#16182e", foregroundColor: "#2962ff" },
};
