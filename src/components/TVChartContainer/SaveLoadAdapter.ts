import type {
  ChartData,
  ChartMetaInfo,
  ChartTemplate,
  IExternalSaveLoadAdapter,
  LineToolsAndGroupsState,
  StudyTemplateMetaInfo,
} from "charting_library";
import { TV_SAVE_LOAD_CHARTS_KEY } from "config/localStorage";

type ChartDataInfo = ChartData & {
  appVersion?: number;
};

const V1_CHART_ID = "gmx-chart-v1";
const V2_CHART_ID = "gmx-chart-v2";

function isValidChartId(id: string | number | undefined) {
  return id === V1_CHART_ID || id === V2_CHART_ID;
}

function readJson(storageKey: string): unknown {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(storageKey);
  } catch {
    return undefined;
  }

  if (!raw) return undefined;

  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function writeJson(storageKey: string, value: unknown) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(value));
  } catch {
    // localStorage is unavailable or full
  }
}

function readStoredCharts(storageKey: string): ChartDataInfo[] | undefined {
  const parsed = readJson(storageKey);
  return Array.isArray(parsed) ? parsed : undefined;
}

function getLatestValidChart(charts: ChartDataInfo[] | undefined) {
  return charts
    ?.filter((chart) => chart && chart.id === V2_CHART_ID)
    .sort((a, b) => b.timestamp - a.timestamp)
    .at(0);
}

/** Persists the chart layout — including all drawings and studies — in localStorage */
export class SaveLoadAdapter implements IExternalSaveLoadAdapter {
  private charts: ChartDataInfo[];

  constructor() {
    const validChart = getLatestValidChart(readStoredCharts(TV_SAVE_LOAD_CHARTS_KEY));
    this.charts = validChart ? [validChart] : [];
    this.persistCharts();
  }

  private persistCharts() {
    writeJson(TV_SAVE_LOAD_CHARTS_KEY, this.charts);
  }

  getAllCharts(): Promise<ChartMetaInfo[]> {
    const filteredCharts = this.charts.filter((chart) => chart.id && isValidChartId(chart.id)) as ChartMetaInfo[];

    return Promise.resolve(filteredCharts);
  }

  removeChart(id: string) {
    this.charts = this.charts.filter((chart) => chart.id !== id);
    this.persistCharts();

    return Promise.resolve();
  }

  saveChart(chartData: ChartDataInfo) {
    if (!chartData.id) {
      chartData.id = V2_CHART_ID;
    }

    if (!chartData.appVersion) {
      chartData.appVersion = 2;
    }

    this.charts = this.charts.filter((chart) => isValidChartId(chart.id) && chart.id !== chartData.id);
    this.charts.push(chartData);
    this.persistCharts();

    return Promise.resolve(chartData.id);
  }

  getChartContent(id: string) {
    const chart = this.charts.find((c) => c.id === id);

    if (!chart) {
      return Promise.reject();
    }

    return Promise.resolve(chart.content);
  }

  // Dummy implementations to satisfy the interface

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
}
