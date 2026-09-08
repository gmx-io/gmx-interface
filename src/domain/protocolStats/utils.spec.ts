import { i18n } from "@lingui/core";
import { describe, expect, it } from "vitest";

import type { ProtocolStatsSourceStatus, ProtocolStatsTimeseriesGroup } from "sdk/utils/stats/types";

import {
  formatProtocolStatsCount,
  formatProtocolStatsSourceHealth,
  formatProtocolStatsUsd,
  formatProtocolStatsUsdNumber,
  getProtocolStatsChartPoints,
  getProtocolStatsNetworkLabel,
  parseProtocolStatsTimeseriesValue,
  sumProtocolStatsValues,
} from "./utils";

i18n.load({ en: {} });
i18n.activate("en");

const USD = "0".repeat(30);
const USD_SIGN = "$\u200a";
const DAY = 86400;
const FIRST_DAY = 1_756_857_600;

function createSource(overrides: Partial<ProtocolStatsSourceStatus>): ProtocolStatsSourceStatus {
  return {
    id: "squid-arbitrum",
    network: "arbitrum",
    version: "v2",
    asOf: FIRST_DAY,
    fetchedAt: FIRST_DAY,
    health: "fresh",
    lagSeconds: null,
    lastError: null,
    ...overrides,
  };
}

describe("formatProtocolStatsUsd", () => {
  it.each([
    ["1234567", `${USD_SIGN}1.23m`],
    ["12500000000", `${USD_SIGN}12.50b`],
    ["999", `${USD_SIGN}999.00`],
    ["0", `${USD_SIGN}0.00`],
  ])("formats a 30-decimal %s as %s", (whole, expected) => {
    expect(formatProtocolStatsUsd(`${whole}${USD}`)).toBe(expected);
  });

  it("keeps the fractional part of a 30-decimal value", () => {
    expect(formatProtocolStatsUsd(`1500${"0".repeat(27)}`)).toBe(`${USD_SIGN}1.50`);
  });

  it("renders an unknown total as a dash and a pending one as an ellipsis", () => {
    expect(formatProtocolStatsUsd(null)).toBe("-");
    expect(formatProtocolStatsUsd(undefined)).toBe("...");
  });
});

describe("formatProtocolStatsUsdNumber", () => {
  it("formats parsed USD numbers like the encoded ones", () => {
    expect(formatProtocolStatsUsdNumber(1234567)).toBe(`${USD_SIGN}1.23m`);
    expect(formatProtocolStatsUsdNumber(null)).toBe("-");
    expect(formatProtocolStatsUsdNumber(undefined)).toBe("...");
  });
});

describe("formatProtocolStatsCount", () => {
  it("formats counts without a dollar sign", () => {
    expect(formatProtocolStatsCount(12345)).toBe("12.35k");
    expect(formatProtocolStatsCount(0)).toBe("0.00");
    expect(formatProtocolStatsCount(null)).toBe("-");
    expect(formatProtocolStatsCount(undefined)).toBe("...");
  });
});

describe("sumProtocolStatsValues", () => {
  it("adds known values", () => {
    expect(sumProtocolStatsValues([1, 2.5, 0])).toBe(3.5);
  });

  it("returns null when any contributor is unknown", () => {
    expect(sumProtocolStatsValues([1, null, 2])).toBeNull();
    expect(sumProtocolStatsValues([1, undefined])).toBeNull();
  });
});

describe("formatProtocolStatsSourceHealth", () => {
  it.each([
    [{ health: "fresh", lagSeconds: null }, "Fresh"],
    [{ health: "fresh", lagSeconds: 45 }, "Fresh, 45s behind"],
    [{ health: "stale", lagSeconds: null }, "Stale"],
    [{ health: "stale", lagSeconds: 90 }, "Stale, 2m behind"],
    [{ health: "stale", lagSeconds: 7200 }, "Stale, 2h behind"],
    [{ health: "missing", lagSeconds: 7200 }, "Missing"],
  ] as const)("describes %o as %s", (overrides, expected) => {
    expect(formatProtocolStatsSourceHealth(createSource(overrides))).toBe(expected);
  });
});

describe("getProtocolStatsNetworkLabel", () => {
  it("labels EVM networks by chain name and Solana by its deployment", () => {
    expect(getProtocolStatsNetworkLabel("arbitrum")).toBe("Arbitrum");
    expect(getProtocolStatsNetworkLabel("avalanche")).toBe("Avalanche");
    expect(getProtocolStatsNetworkLabel("megaeth")).toBe("MegaETH");
    expect(getProtocolStatsNetworkLabel("solana")).toBe("Solana (GMTrade)");
  });
});

describe("parseProtocolStatsTimeseriesValue", () => {
  it("parses 30-decimal USD strings, passes counts through and keeps nulls", () => {
    expect(parseProtocolStatsTimeseriesValue(`1500${"0".repeat(27)}`)).toBe(1.5);
    expect(parseProtocolStatsTimeseriesValue(42)).toBe(42);
    expect(parseProtocolStatsTimeseriesValue(null)).toBeNull();
  });
});

describe("getProtocolStatsChartPoints", () => {
  const groups: ProtocolStatsTimeseriesGroup[] = [
    {
      key: "solana",
      points: [
        { day: FIRST_DAY + DAY, value: `3${USD}`, provisional: true },
        { day: FIRST_DAY, value: `2${USD}`, provisional: false },
      ],
    },
    {
      key: "arbitrum",
      points: [
        { day: FIRST_DAY, value: `10${USD}`, provisional: false },
        { day: FIRST_DAY + DAY, value: null, provisional: false },
        { day: FIRST_DAY + 2 * DAY, value: `5${USD}`, provisional: true },
      ],
    },
  ];

  it("merges groups into day-sorted points keyed by group", () => {
    expect(getProtocolStatsChartPoints(groups)).toEqual([
      { day: FIRST_DAY, provisional: false, values: { arbitrum: 10, solana: 2 } },
      { day: FIRST_DAY + DAY, provisional: true, values: { arbitrum: null, solana: 3 } },
      { day: FIRST_DAY + 2 * DAY, provisional: true, values: { arbitrum: 5 } },
    ]);
  });

  it("returns no points without groups", () => {
    expect(getProtocolStatsChartPoints([])).toEqual([]);
  });
});
