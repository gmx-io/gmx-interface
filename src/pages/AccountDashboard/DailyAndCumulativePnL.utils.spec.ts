import { describe, expect, it } from "vitest";

import {
  formatPnlChartYAxisTick,
  getDefaultPnlChartGrouping,
  getPnlChartDragPanSpeed,
  getPnlChartWheelZoomSlowdown,
  getPnlChartXAxisDomain,
  getPnlChartYAxisTicks,
  getPnlChartYAxisTicksFromValues,
  getWheelDeltaPixels,
  groupPnlHistoryData,
  panPnlWindow,
  panPnlWindowByDelta,
  PNL_CHART_WHEEL_ZOOM_FACTOR,
  zoomPnlWindowAtRatio,
  zoomPnlWindow,
  type BasePnlHistoryPoint,
} from "./DailyAndCumulativePnL.utils";

const USD = 10n ** 30n;

function point(timestamp: number, pnl: bigint, cumulativePnl: bigint): BasePnlHistoryPoint {
  return {
    timestamp,
    date: "",
    dateCompact: "",
    pnl,
    pnlFloat: Number(pnl / USD),
    cumulativePnl,
    cumulativePnlFloat: Number(cumulativePnl / USD),
  };
}

describe("formatPnlChartYAxisTick", () => {
  it("formats axis ticks with compact USD suffixes", () => {
    expect(formatPnlChartYAxisTick(0)).toBe("$0");
    expect(formatPnlChartYAxisTick(999)).toBe("$999");
    expect(formatPnlChartYAxisTick(150000)).toBe("$150k");
    expect(formatPnlChartYAxisTick(5000000)).toBe("$5m");
    expect(formatPnlChartYAxisTick(1250000000)).toBe("$1.3b");
    expect(formatPnlChartYAxisTick(-300000)).toBe("-$300k");
  });
});

describe("getPnlChartYAxisTicks", () => {
  it("rounds fractional compact values to nice tick steps", () => {
    const data = [
      { ...point(Date.UTC(2024, 0, 1) / 1000, -456300n * USD, -206300n * USD), pnlFloat: -456300 },
      { ...point(Date.UTC(2024, 0, 2) / 1000, 293700n * USD, 293700n * USD), pnlFloat: 293700 },
    ];

    expect(getPnlChartYAxisTicks(data, "pnlFloat", true)).toEqual([-600000, -400000, -200000, 0, 200000, 400000]);
  });

  it("does not force zero for cumulative PnL ticks", () => {
    const data = [
      {
        ...point(Date.UTC(2024, 0, 1) / 1000, 0n, 43000n * USD),
        cumulativePnlFloat: 43700,
      },
      {
        ...point(Date.UTC(2024, 0, 2) / 1000, 0n, 293000n * USD),
        cumulativePnlFloat: 293700,
      },
    ];

    expect(getPnlChartYAxisTicks(data, "cumulativePnlFloat", false)).toEqual([0, 100000, 200000, 300000]);
  });

  it("uses all provided series values for tick bounds", () => {
    const data = [
      { ...point(Date.UTC(2024, 0, 1) / 1000, 10n * USD, 10n * USD), extraFloat: 175 },
      { ...point(Date.UTC(2024, 0, 2) / 1000, -20n * USD, -20n * USD), extraFloat: -425 },
    ];

    expect(getPnlChartYAxisTicksFromValues(data, (item) => [item.pnlFloat, item.extraFloat], true)).toEqual([
      -600, -400, -200, 0, 200,
    ]);
  });
});

describe("groupPnlHistoryData", () => {
  it("aggregates weekly buckets by UTC Monday and keeps the end-of-bucket cumulative PnL", () => {
    const data = [
      point(Date.UTC(2024, 5, 10) / 1000, 1n * USD, 1n * USD),
      point(Date.UTC(2024, 5, 11) / 1000, 2n * USD, 3n * USD),
      point(Date.UTC(2024, 5, 17) / 1000, 3n * USD, 6n * USD),
    ];

    const grouped = groupPnlHistoryData(data, "weekly");

    expect(grouped).toHaveLength(2);
    expect(grouped[0].date).toBe("10 Jun 2024 - 11 Jun 2024");
    expect(grouped[0].dateCompact).toBe("10/06");
    expect(grouped[0].pnl).toBe(3n * USD);
    expect(grouped[0].cumulativePnl).toBe(3n * USD);
    expect(grouped[1].date).toBe("17 Jun 2024");
    expect(grouped[1].pnl).toBe(3n * USD);
    expect(grouped[1].cumulativePnl).toBe(6n * USD);
  });

  it("aggregates monthly buckets by UTC month", () => {
    const data = [
      point(Date.UTC(2024, 0, 31) / 1000, 1n * USD, 1n * USD),
      point(Date.UTC(2024, 1, 1) / 1000, 2n * USD, 3n * USD),
      point(Date.UTC(2024, 1, 29) / 1000, 3n * USD, 6n * USD),
    ];

    const grouped = groupPnlHistoryData(data, "monthly");

    expect(grouped).toHaveLength(2);
    expect(grouped[0].dateCompact).toBe("Jan 2024");
    expect(grouped[0].pnl).toBe(1n * USD);
    expect(grouped[1].dateCompact).toBe("Feb 2024");
    expect(grouped[1].date).toBe("01 Feb 2024 - 29 Feb 2024");
    expect(grouped[1].pnl).toBe(5n * USD);
    expect(grouped[1].cumulativePnl).toBe(6n * USD);
  });
});

describe("Pnl zoom helpers", () => {
  it("zooms in and out around the current window center", () => {
    expect(zoomPnlWindow(undefined, 10, "in")).toEqual({ startIndex: 4, endIndex: 6 });
    expect(zoomPnlWindow({ startIndex: 2, endIndex: 8 }, 10, "out")).toBeUndefined();
  });

  it("zooms a three-point chart down to two points", () => {
    expect(zoomPnlWindow(undefined, 3, "in")).toEqual({ startIndex: 1, endIndex: 2 });
  });

  it("zooms out from the minimum visible window", () => {
    expect(zoomPnlWindow({ startIndex: 3, endIndex: 4 }, 10, "out")).toEqual({ startIndex: 1, endIndex: 7 });
  });

  it("zooms around the requested anchor ratio", () => {
    expect(zoomPnlWindowAtRatio(undefined, 10, "in", 0)).toEqual({ startIndex: 0, endIndex: 2 });
    expect(zoomPnlWindowAtRatio(undefined, 10, "in", 1)).toEqual({ startIndex: 7, endIndex: 9 });
  });

  it("uses a much smaller zoom step for wheel interactions", () => {
    expect(zoomPnlWindowAtRatio(undefined, 1000, "in", 0.5, PNL_CHART_WHEEL_ZOOM_FACTOR)).toEqual({
      startIndex: 48,
      endIndex: 951,
    });
  });

  it("slows wheel zoom as the visible window gets smaller", () => {
    expect(getPnlChartWheelZoomSlowdown(100, 100)).toBe(1);
    expect(getPnlChartWheelZoomSlowdown(25, 100)).toBe(2);
    expect(getPnlChartWheelZoomSlowdown(4, 100)).toBe(5);
  });

  it("speeds drag panning as the visible window gets larger", () => {
    expect(getPnlChartDragPanSpeed(4)).toBe(1);
    expect(getPnlChartDragPanSpeed(48)).toBe(2);
    expect(getPnlChartDragPanSpeed(108)).toBe(3);
    expect(getPnlChartDragPanSpeed(500)).toBe(5);
  });

  it("pans a zoomed window within bounds", () => {
    expect(panPnlWindow({ startIndex: 2, endIndex: 5 }, 10, "left")).toEqual({ startIndex: 0, endIndex: 3 });
    expect(panPnlWindow({ startIndex: 2, endIndex: 5 }, 10, "right")).toEqual({ startIndex: 4, endIndex: 7 });
    expect(panPnlWindow({ startIndex: 6, endIndex: 9 }, 10, "right")).toEqual({ startIndex: 6, endIndex: 9 });
    expect(panPnlWindowByDelta({ startIndex: 2, endIndex: 5 }, 10, 3)).toEqual({ startIndex: 5, endIndex: 8 });
  });
});

describe("getDefaultPnlChartGrouping", () => {
  const DAY = 86400;
  const START = Date.UTC(2023, 0, 1) / 1000;

  function spanData(days: number): BasePnlHistoryPoint[] {
    return [point(START, 1n * USD, 1n * USD), point(START + days * DAY, 1n * USD, 2n * USD)];
  }

  it("defaults to daily for empty or single-point history", () => {
    expect(getDefaultPnlChartGrouping([])).toBe("daily");
    expect(getDefaultPnlChartGrouping([point(START, 1n * USD, 1n * USD)])).toBe("daily");
  });

  it("defaults to daily for history up to 3 months", () => {
    expect(getDefaultPnlChartGrouping(spanData(30))).toBe("daily");
    expect(getDefaultPnlChartGrouping(spanData(90))).toBe("daily");
  });

  it("defaults to weekly for history over 3 months", () => {
    expect(getDefaultPnlChartGrouping(spanData(91))).toBe("weekly");
    expect(getDefaultPnlChartGrouping(spanData(365))).toBe("weekly");
  });

  it("defaults to monthly for history over 1 year", () => {
    expect(getDefaultPnlChartGrouping(spanData(366))).toBe("monthly");
    expect(getDefaultPnlChartGrouping(spanData(1000))).toBe("monthly");
  });
});

describe("getWheelDeltaPixels", () => {
  it("passes pixel-mode deltas through unchanged", () => {
    expect(getWheelDeltaPixels(120, 0)).toBe(120);
    expect(getWheelDeltaPixels(-53, 0)).toBe(-53);
  });

  it("converts line-mode deltas (Firefox mouse wheel) to pixels", () => {
    expect(getWheelDeltaPixels(3, 1)).toBe(120);
    expect(getWheelDeltaPixels(-3, 1)).toBe(-120);
  });

  it("converts page-mode deltas to pixels", () => {
    expect(getWheelDeltaPixels(1, 2)).toBe(800);
    expect(getWheelDeltaPixels(-1, 2)).toBe(-800);
  });
});

describe("getPnlChartXAxisDomain", () => {
  it("pads the visible window so line points align with bar centers", () => {
    expect(getPnlChartXAxisDomain(2, 5)).toEqual([1.75, 5.25]);
    expect(getPnlChartXAxisDomain(0, 9)).toEqual([-0.25, 9.25]);
  });

  it("pads a single visible point to match the bar position", () => {
    expect(getPnlChartXAxisDomain(0, 0)).toEqual([-0.25, 0.25]);
    expect(getPnlChartXAxisDomain(3, 3)).toEqual([2.75, 3.25]);
  });
});
