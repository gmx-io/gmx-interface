import { beforeEach, describe, expect, it } from "vitest";

import type { ChartData } from "charting_library";
import { TV_SAVE_LOAD_CHARTS_KEY } from "config/localStorage";

import { SaveLoadAdapter } from "./SaveLoadAdapter";

function makeChart(overrides: Partial<ChartData> = {}): ChartData {
  return {
    id: "gmx-chart-v2",
    name: "gmx-chart-v2",
    symbol: "BTC",
    resolution: "60" as ChartData["resolution"],
    content: JSON.stringify({ layout: "test" }),
    timestamp: 1000,
    ...overrides,
  };
}

function readCharts(key: string): ChartData[] {
  return JSON.parse(localStorage.getItem(key) ?? "[]");
}

describe("SaveLoadAdapter", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("persists layouts across adapter instances", async () => {
    const adapter = new SaveLoadAdapter();

    await adapter.saveChart(makeChart({ id: undefined }));

    expect(readCharts(TV_SAVE_LOAD_CHARTS_KEY)).toHaveLength(1);
    expect(readCharts(TV_SAVE_LOAD_CHARTS_KEY)[0].id).toBe("gmx-chart-v2");

    const nextAdapter = new SaveLoadAdapter();
    expect(await nextAdapter.getAllCharts()).toHaveLength(1);
  });

  it("keeps only the latest gmx-chart-v2 record", async () => {
    localStorage.setItem(
      TV_SAVE_LOAD_CHARTS_KEY,
      JSON.stringify([
        makeChart({ id: "gmx-chart-v1", timestamp: 3000 }),
        makeChart({ symbol: "OLD", timestamp: 1000 }),
        makeChart({ symbol: "NEW", timestamp: 2000 }),
      ])
    );

    const adapter = new SaveLoadAdapter();

    const charts = await adapter.getAllCharts();
    expect(charts).toHaveLength(1);
    expect((charts[0] as unknown as ChartData).symbol).toBe("NEW");
  });

  it("returns chart content by id and rejects for unknown ids", async () => {
    const adapter = new SaveLoadAdapter();
    await adapter.saveChart(makeChart({ content: "the-content" }));

    await expect(adapter.getChartContent("gmx-chart-v2")).resolves.toBe("the-content");
    await expect(adapter.getChartContent("unknown")).rejects.toBeUndefined();
  });

  it("recovers from corrupted stored data", async () => {
    localStorage.setItem(TV_SAVE_LOAD_CHARTS_KEY, "{not json");

    const adapter = new SaveLoadAdapter();

    expect(await adapter.getAllCharts()).toHaveLength(0);
  });
});
