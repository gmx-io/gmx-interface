import { describe, expect, it } from "vitest";

import type { ProtocolStatsSummaryResponse } from "sdk/utils/stats/types";

import { getProtocolStatsNetworkFreshness, type ProtocolStatsSummaryResult } from "./useProtocolStatsSummary";

function summaryWith(health: "fresh" | "stale", asOf: number | null, isStale = false): ProtocolStatsSummaryResult {
  const source = {
    id: "squid-gmtrade",
    network: "solana",
    version: "v2",
    asOf,
    fetchedAt: null,
    health,
    lagSeconds: null,
    lastError: null,
  };
  const data = {
    meta: { asOf: 0, completeness: "complete", sources: [source], schemaVersion: "2026-09" },
  } as ProtocolStatsSummaryResponse;

  return {
    data,
    isLoading: false,
    error: isStale ? new Error("refresh failed") : undefined,
    freshness: { isStale, asOf: 90_000 },
  };
}

describe("getProtocolStatsNetworkFreshness", () => {
  it("is fresh while the api reports the source fresh and the last refresh succeeded", () => {
    expect(getProtocolStatsNetworkFreshness(summaryWith("fresh", 60), "solana")).toEqual({
      isStale: false,
      asOf: 90_000,
    });
  });

  it("dates a lagging source from the api's as-of time in milliseconds", () => {
    expect(getProtocolStatsNetworkFreshness(summaryWith("stale", 60), "solana")).toEqual({
      isStale: true,
      asOf: 60_000,
    });
  });

  it("dates a response the interface could not refresh from its last successful fetch", () => {
    expect(getProtocolStatsNetworkFreshness(summaryWith("fresh", 60, true), "solana")).toEqual({
      isStale: true,
      asOf: 90_000,
    });
  });
});
