/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import type {
  ChartData,
  ChartMetaInfo,
  ChartTemplate,
  IExternalSaveLoadAdapter,
  LineToolsAndGroupsState,
  StudyTemplateMetaInfo,
} from '../../../../public/charting_library';

type ChartDataInfo = ChartData & {
  appVersion?: number;
};

const V1_CHART_ID = "gmxsol-chart-v1";

function isValidChartId(id: unknown) {
  return id === V1_CHART_ID
}

export class SaveLoadAdapter implements IExternalSaveLoadAdapter {
  private charts: ChartDataInfo[] | undefined;
  private setTvCharts: (a: ChartDataInfo[]) => void;
  private currentAppVersion: number;

  constructor(
    charts: ChartDataInfo[] | undefined,
    setTvCharts: (a: ChartDataInfo[]) => void,
    currentAppVersion: number
  ) {
    this.charts = charts;
    this.setTvCharts = setTvCharts;
    this.currentAppVersion = currentAppVersion;

    const validV1Chart = this.charts
      ?.filter((chart) => isValidChartId(chart.id))
      .sort((a, b) => b.timestamp - a.timestamp)
      .at(0);
    this.charts = [validV1Chart].filter(Boolean);
  }

  getAllCharts(): Promise<ChartMetaInfo[]> {
    const charts = this.charts || [];
    const filteredCharts = charts.filter((chart) => {
      if (!isValidChartId(chart.id)) {
        return false;
      }

      if (!chart.appVersion) {
        chart.appVersion = 1;
      }
      return chart.appVersion === this.currentAppVersion;
    }) as ChartMetaInfo[];

    return Promise.resolve(filteredCharts);
  }

  removeChart(id: string) {
    if (!this.charts) return Promise.reject();

    this.charts = this.charts.filter((chart) => chart.id !== id);
    this.setTvCharts(this.charts);

    return Promise.resolve();
  }

  saveChart(chartData) {
    if (!isValidChartId(chartData.id)) {
      chartData.id = V1_CHART_ID;
    }

    if (!chartData.appVersion) {
      chartData.appVersion = this.currentAppVersion;
    }

    if (this.charts) {
      this.charts = this.charts.filter((chart) => isValidChartId(chart.id) && chart.id !== chartData.id);
      this.charts.push(chartData);

      this.setTvCharts(this.charts);
    }

    return Promise.resolve(chartData.id);
  }

  getChartContent(id: string) {
    if (!this.charts) return Promise.reject();
    for (let i = 0; i < this.charts.length; ++i) {
      if (this.charts[i].id === id) {
        const { content } = this.charts[i];

        return Promise.resolve(content);
      }
    }
    return Promise.reject();
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
