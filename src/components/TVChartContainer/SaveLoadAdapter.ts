import type {
  ChartData,
  ChartMetaInfo,
  ChartTemplate,
  IExternalSaveLoadAdapter,
  LineToolsAndGroupsState,
  StudyTemplateMetaInfo,
} from "charting_library";
import { getTokenBySymbol } from "config/tokens";
import type { Token } from "domain/tokens";

type ChartDataInfo = ChartData & {
  appVersion?: number;
};

export class SaveLoadAdapter implements IExternalSaveLoadAdapter {
  chainId: number;
  charts: ChartDataInfo[] | undefined;
  setTvCharts: (a: ChartDataInfo[]) => void;
  onSelectToken: (token: Token) => void;
  currentAppVersion: number;
  setTradePageVersion: (version: number) => void;

  constructor(
    chainId: number,
    charts: ChartDataInfo[] | undefined,
    setTvCharts: (a: ChartDataInfo[]) => void,
    onSelectToken: (token: Token) => void,
    currentAppVersion: number,
    setTradePageVersion: (version: number) => void
  ) {
    this.charts = charts;
    this.setTvCharts = setTvCharts;
    this.chainId = chainId;
    this.onSelectToken = onSelectToken;
    this.currentAppVersion = currentAppVersion;
    this.setTradePageVersion = setTradePageVersion;
  }
  getAllStudyTemplates(): Promise<StudyTemplateMetaInfo[]> {
    return Promise.resolve([]);
  }
  removeStudyTemplate(): Promise<void> {
    return Promise.resolve();
  }
  saveStudyTemplate(): Promise<void> {
    return Promise.resolve();
  }
  getStudyTemplateContent(): Promise<string> {
    return Promise.resolve("");
  }
  getDrawingTemplates(): Promise<string[]> {
    return Promise.resolve([]);
  }
  loadDrawingTemplate(): Promise<string> {
    return Promise.resolve("");
  }
  removeDrawingTemplate(): Promise<void> {
    return Promise.resolve();
  }
  saveDrawingTemplate(): Promise<void> {
    return Promise.resolve();
  }
  getChartTemplateContent(): Promise<ChartTemplate> {
    return Promise.resolve({});
  }
  getAllChartTemplates(): Promise<string[]> {
    return Promise.resolve([]);
  }
  saveChartTemplate(): Promise<void> {
    return Promise.resolve();
  }
  removeChartTemplate(): Promise<void> {
    return Promise.resolve();
  }
  saveLineToolsAndGroups(): Promise<void> {
    return Promise.resolve();
  }
  loadLineToolsAndGroups(): Promise<Partial<LineToolsAndGroupsState> | null> {
    return Promise.resolve(null);
  }

  getAllCharts(): Promise<ChartMetaInfo[]> {
    const charts = this.charts || [];
    const filteredCharts = charts
      .filter((chart) => {
        if (!chart.appVersion) {
          chart.appVersion = 1;
        }
        return chart.appVersion === this.currentAppVersion;
      })
      .filter((chart) => chart.id) as ChartMetaInfo[];

    return Promise.resolve(filteredCharts);
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

    const currentTimestamp = Math.floor(Date.now() / 1000);
    const offsetMinutes = new Date().getTimezoneOffset();
    const offsetSeconds = offsetMinutes * 60;
    const adjustedTimestamp = currentTimestamp - offsetSeconds;

    chartData.timestamp = adjustedTimestamp;
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
