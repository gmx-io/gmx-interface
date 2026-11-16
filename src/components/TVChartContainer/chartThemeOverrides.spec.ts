import { describe, expect, it } from "vitest";

import { colors } from "config/colors";

import {
  PRICE_LINE_COLOR_KEY,
  getChartThemeOverrides,
  getThemeOverridesToApply,
  isAppChartValue,
  readSavedChartValues,
} from "./chartThemeOverrides";
import { chartOverridesDark, chartOverridesLight } from "./constants";

const UP_COLOR_KEY = "mainSeriesProperties.candleStyle.upColor";
const BACKGROUND_KEY = "paneProperties.background";
const GRID_COLOR_KEY = "paneProperties.vertGridProperties.color";
const GRID_STYLE_KEY = "paneProperties.vertGridProperties.style";

function makeSavedState({
  background = chartOverridesDark[BACKGROUND_KEY],
  upColor = chartOverridesDark[UP_COLOR_KEY],
  priceLineColor = chartOverridesDark[PRICE_LINE_COLOR_KEY],
}: {
  background?: unknown;
  upColor?: unknown;
  priceLineColor?: unknown;
} = {}) {
  return {
    layout: "s",
    charts: [
      {
        panes: [
          {
            sources: [
              { type: "study_Volume", state: {} },
              {
                type: "MainSeries",
                state: {
                  priceLineColor,
                  candleStyle: { upColor, downColor: chartOverridesDark["mainSeriesProperties.candleStyle.downColor"] },
                  hollowCandleStyle: { upColor: chartOverridesDark["mainSeriesProperties.hollowCandleStyle.upColor"] },
                },
              },
            ],
          },
        ],
        chartProperties: {
          paneProperties: {
            background,
            vertGridProperties: { color: chartOverridesDark[GRID_COLOR_KEY] },
          },
          scalesProperties: { textColor: chartOverridesDark["scalesProperties.textColor"] },
        },
      },
    ],
  };
}

describe("readSavedChartValues", () => {
  it("reads pane, scales and main series properties by override key", () => {
    const values = readSavedChartValues(makeSavedState({ upColor: "#ff00ff" }), [
      BACKGROUND_KEY,
      GRID_COLOR_KEY,
      "scalesProperties.textColor",
      UP_COLOR_KEY,
      "mainSeriesProperties.hollowCandleStyle.upColor",
      PRICE_LINE_COLOR_KEY,
    ]);

    expect(values).toEqual({
      [BACKGROUND_KEY]: chartOverridesDark[BACKGROUND_KEY],
      [GRID_COLOR_KEY]: chartOverridesDark[GRID_COLOR_KEY],
      "scalesProperties.textColor": chartOverridesDark["scalesProperties.textColor"],
      [UP_COLOR_KEY]: "#ff00ff",
      "mainSeriesProperties.hollowCandleStyle.upColor":
        chartOverridesDark["mainSeriesProperties.hollowCandleStyle.upColor"],
      [PRICE_LINE_COLOR_KEY]: chartOverridesDark[PRICE_LINE_COLOR_KEY],
    });
  });

  it("returns undefined for properties missing from the saved state", () => {
    expect(readSavedChartValues(makeSavedState(), [GRID_STYLE_KEY, "mainSeriesProperties.haStyle.upColor"])).toEqual({
      [GRID_STYLE_KEY]: undefined,
      "mainSeriesProperties.haStyle.upColor": undefined,
    });
    expect(readSavedChartValues(undefined, [BACKGROUND_KEY])).toEqual({ [BACKGROUND_KEY]: undefined });
    expect(readSavedChartValues({ charts: "broken" }, [UP_COLOR_KEY])).toEqual({ [UP_COLOR_KEY]: undefined });
  });
});

describe("getThemeOverridesToApply", () => {
  const darkKeys = Object.keys(chartOverridesDark);

  it("applies nothing when the saved colors already match the theme", () => {
    const savedValues = readSavedChartValues(makeSavedState(), darkKeys);

    expect(getThemeOverridesToApply({ theme: "dark", savedValues })).toEqual({});
  });

  it("keeps colors the user has customized", () => {
    const savedValues = readSavedChartValues(makeSavedState({ upColor: "#ff00ff", background: "#300030" }), darkKeys);

    const overrides = getThemeOverridesToApply({ theme: "dark", savedValues });

    expect(overrides).toEqual({});

    const lightOverrides = getThemeOverridesToApply({ theme: "light", savedValues });

    expect(lightOverrides).not.toHaveProperty(UP_COLOR_KEY);
    expect(lightOverrides).not.toHaveProperty(BACKGROUND_KEY);
    expect(lightOverrides[GRID_COLOR_KEY]).toBe(chartOverridesLight[GRID_COLOR_KEY]);
    expect(lightOverrides["mainSeriesProperties.candleStyle.downColor"]).toBe(
      chartOverridesLight["mainSeriesProperties.candleStyle.downColor"]
    );
  });

  it("repaints colors still at the other theme's defaults when the theme switches", () => {
    const savedValues = readSavedChartValues(makeSavedState(), darkKeys);

    const overrides = getThemeOverridesToApply({ theme: "light", savedValues });

    expect(overrides[BACKGROUND_KEY]).toBe(chartOverridesLight[BACKGROUND_KEY]);
    expect(overrides[UP_COLOR_KEY]).toBe(chartOverridesLight[UP_COLOR_KEY]);
    expect(overrides[PRICE_LINE_COLOR_KEY]).toBe(chartOverridesLight[PRICE_LINE_COLOR_KEY]);
  });

  it("treats the candle-direction price line colors as app-set", () => {
    const savedValues = readSavedChartValues(makeSavedState({ priceLineColor: colors.green[500].dark }), darkKeys);

    expect(getThemeOverridesToApply({ theme: "light", savedValues })[PRICE_LINE_COLOR_KEY]).toBe(
      chartOverridesLight[PRICE_LINE_COLOR_KEY]
    );
  });

  it("never touches theme-independent properties or properties it cannot read", () => {
    const savedValues = readSavedChartValues(makeSavedState(), darkKeys);

    const overrides = getThemeOverridesToApply({ theme: "light", savedValues });

    expect(overrides).not.toHaveProperty(GRID_STYLE_KEY);
    expect(overrides).not.toHaveProperty("paneProperties.backgroundType");
    expect(overrides).not.toHaveProperty("mainSeriesProperties.candleStyle.drawBorder");
    expect(overrides).not.toHaveProperty("mainSeriesProperties.haStyle.upColor");
  });
});

describe("isAppChartValue", () => {
  it("recognizes both theme defaults and the price line direction colors", () => {
    expect(isAppChartValue(UP_COLOR_KEY, chartOverridesDark[UP_COLOR_KEY])).toBe(true);
    expect(isAppChartValue(UP_COLOR_KEY, chartOverridesLight[UP_COLOR_KEY])).toBe(true);
    expect(isAppChartValue(UP_COLOR_KEY, "#ff00ff")).toBe(false);
    expect(isAppChartValue(UP_COLOR_KEY, undefined)).toBe(false);
    expect(isAppChartValue("paneProperties.unknown", undefined)).toBe(false);

    expect(isAppChartValue(PRICE_LINE_COLOR_KEY, colors.red[500].light)).toBe(true);
    expect(isAppChartValue(PRICE_LINE_COLOR_KEY, "#ff00ff")).toBe(false);
  });
});

describe("getChartThemeOverrides", () => {
  it("returns the overrides for the theme", () => {
    expect(getChartThemeOverrides("dark")).toBe(chartOverridesDark);
    expect(getChartThemeOverrides("light")).toBe(chartOverridesLight);
  });
});
