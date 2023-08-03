import { ChartData } from "charting_library";
import { getTokenBySymbol } from "config/tokens";
import { Token } from "domain/tokens";

type ChartDataInfo = ChartData & {
  appVersion?: number;
};

export class SaveLoadAdapter {
  chainId: number;
  charts: ChartDataInfo[] | undefined;
  setTvCharts: (a: ChartDataInfo[]) => void;
  onSelectToken: (token: Token) => void;
  currentAppVersion: number;
  setTradePageVersion: (version: number) => void;
  chartReady: boolean;

  constructor(
    chainId: number,
    charts: ChartDataInfo[] | undefined,
    setTvCharts: (a: ChartDataInfo[]) => void,
    onSelectToken: (token: Token) => void,
    currentAppVersion: number,
    setTradePageVersion: (version: number) => void,
    chartReady: boolean
  ) {
    this.charts = charts;
    this.setTvCharts = setTvCharts;
    this.chainId = chainId;
    this.onSelectToken = onSelectToken;
    this.currentAppVersion = currentAppVersion;
    this.setTradePageVersion = setTradePageVersion;
    this.chartReady = chartReady;
  }

  getAllCharts() {
    return Promise.resolve(this.charts);
  }

  removeChart(id: string) {
    if (!this.charts) return Promise.reject();
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
    if (!chartData.id || !chartData.appVersion) {
      chartData.id = Math.random().toString();
      chartData.appVersion = this.currentAppVersion;
    } else {
      this.removeChart(chartData.id);
    }

    chartData.timestamp = new Date().valueOf();
    if (this.charts) {
      this.charts.push(chartData);
      this.setTvCharts(this.charts);
    }

    return Promise.resolve(chartData.id);
  }

  getChartContent(id: string) {
    if (!this.charts) return Promise.reject();
    for (let i = 0; i < this.charts.length; ++i) {
      if (this.charts[i].id === id) {
        const { content, symbol, appVersion = 1 } = this.charts[i];
        if (this.currentAppVersion !== appVersion) {
          this.setTradePageVersion(appVersion);
        }
        const tokenInfo = getTokenBySymbol(this.chainId, symbol);
        this.onSelectToken(tokenInfo);
        return Promise.resolve(content);
      }
    }
    return Promise.reject();
  }
}
