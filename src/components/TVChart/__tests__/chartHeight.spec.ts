import { describe, expect, it } from "vitest";

import {
  CHART_MIN_HEIGHT,
  createStoredChartHeight,
  getChartHeight,
  getChartMaxHeight,
  getDefaultChartHeight,
  getIsNearDefaultChartHeight,
  parseStoredChartHeight,
} from "../chartHeight";

describe("chartHeight", () => {
  it.each([
    [1025, 536],
    [2559, 536],
    [2560, 780],
    [3839, 780],
    [3840, 1140],
  ])("keeps today's default height at %i px wide", (windowWidth, expected) => {
    expect(getDefaultChartHeight(windowWidth)).toBe(expected);
  });

  it.each([
    ["fills the window under the page header", 860, 780],
    ["never goes below the default height in a short window", 600, 536],
  ])("%s", (_, windowHeight, expected) => {
    expect(getChartMaxHeight({ windowHeight, chartTop: 72, defaultHeight: 536 })).toBe(expected);
  });

  it.each([
    ["the default height without a saved height", undefined, 536],
    ["the saved height", 420.4, 420],
    ["the minimum for a lower height", 120, CHART_MIN_HEIGHT],
    ["the maximum for a saved height taller than the window", 2000, 780],
  ])("shows %s", (_, storedHeight, expected) => {
    expect(getChartHeight({ storedHeight, defaultHeight: 536, maxHeight: 780 })).toBe(expected);
  });

  it.each([
    [createStoredChartHeight(420.4), 420],
    [{ v: 1, chartHeight: CHART_MIN_HEIGHT - 1 }, undefined],
    [{ v: 2, chartHeight: 420 }, undefined],
    [{ v: 1, chartHeight: "420" }, undefined],
    [420, undefined],
    [null, undefined],
    [undefined, undefined],
  ])("reads the saved value %j as %s", (value, expected) => {
    expect(parseStoredChartHeight(value)).toBe(expected);
  });

  it.each([
    [529, true],
    [528, false],
    [543, true],
    [544, false],
  ])("treats %i px as the default height of 536 px: %s", (height, expected) => {
    expect(getIsNearDefaultChartHeight(height, 536)).toBe(expected);
  });
});
