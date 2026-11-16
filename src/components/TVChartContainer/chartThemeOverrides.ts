import type { ChartPropertiesOverrides } from "charting_library";
import { colors } from "config/colors";
import type { Theme } from "context/ThemeContext/ThemeContext";

import { chartOverridesDark, chartOverridesLight } from "./constants";

export type ChartOverrides = Partial<ChartPropertiesOverrides>;

export const PRICE_LINE_COLOR_KEY = "mainSeriesProperties.priceLineColor";

const PRICE_LINE_DIRECTION_COLORS = [
  colors.green[500].dark,
  colors.green[500].light,
  colors.red[500].dark,
  colors.red[500].light,
];

export function getChartThemeOverrides(theme: Theme): ChartOverrides {
  return theme === "light" ? chartOverridesLight : chartOverridesDark;
}

function getAppValues(key: string): unknown[] {
  const values: unknown[] = [chartOverridesDark[key], chartOverridesLight[key]];

  if (key === PRICE_LINE_COLOR_KEY) {
    values.push(...PRICE_LINE_DIRECTION_COLORS);
  }

  return values.filter((value) => value !== undefined);
}

export function isAppChartValue(key: string, value: unknown): boolean {
  return getAppValues(key).includes(value);
}

export function getThemeOverridesToApply({
  theme,
  savedValues,
}: {
  theme: Theme;
  savedValues: Record<string, unknown>;
}): ChartOverrides {
  const themeOverrides = getChartThemeOverrides(theme);
  const overrides: ChartOverrides = {};

  for (const [key, value] of Object.entries(themeOverrides)) {
    if (value === undefined || chartOverridesDark[key] === chartOverridesLight[key]) {
      continue;
    }

    const savedValue = savedValues[key];

    if (savedValue !== value && isAppChartValue(key, savedValue)) {
      overrides[key] = value;
    }
  }

  return overrides;
}

function getByPath(source: unknown, path: string[]): unknown {
  let current: unknown = source;

  for (const segment of path) {
    if (typeof current !== "object" || current === null) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

function findMainSeriesState(chart: unknown): unknown {
  const panes = getByPath(chart, ["panes"]);

  if (!Array.isArray(panes)) {
    return undefined;
  }

  for (const pane of panes) {
    const sources = getByPath(pane, ["sources"]);

    if (!Array.isArray(sources)) {
      continue;
    }

    const mainSeries = sources.find((source) => getByPath(source, ["type"]) === "MainSeries");

    if (mainSeries) {
      return getByPath(mainSeries, ["state"]);
    }
  }

  return undefined;
}

export function readSavedChartValues(state: unknown, keys: string[]): Record<string, unknown> {
  const chart = getByPath(state, ["charts", "0"]);
  const chartProperties = getByPath(chart, ["chartProperties"]);
  const mainSeriesState = findMainSeriesState(chart);
  const values: Record<string, unknown> = {};

  for (const key of keys) {
    const [root, ...path] = key.split(".");
    const source = root === "mainSeriesProperties" ? mainSeriesState : getByPath(chartProperties, [root]);
    values[key] = getByPath(source, path);
  }

  return values;
}
