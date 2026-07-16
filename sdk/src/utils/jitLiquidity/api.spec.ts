import { describe, expect, it } from "vitest";

import type { IHttp } from "utils/http/types";

import { fetchApiJitLiquidityInfo, fetchApiJitLiquiditySnapshot } from "./api";

class JitApi implements IHttp {
  url = "http://test";
  paths: string[] = [];

  constructor(private readonly response: unknown) {}

  fetchJson<TResult>(path: string): Promise<TResult> {
    this.paths.push(path);
    return Promise.resolve(this.response as TResult);
  }

  postJson<TResult>(): Promise<TResult> {
    return Promise.reject(new Error("Unexpected postJson call"));
  }
}

function buildV2Snapshot(overrides: Record<string, unknown> = {}) {
  return {
    liquidityInfos: [
      {
        glv: "0xGlv",
        market: "0xMarket",
        long: {
          maxReservedUsd: "300",
          maxOrderSizeUsd: "100",
          glvShiftParams: {
            glv: "0xGlv",
            fromMarket: "0xFrom",
            toMarket: "0xMarket",
            marketTokenAmount: "30",
            minMarketTokens: "0",
          },
        },
        short: null,
      },
    ],
    generatedAt: 1_000,
    status: "available",
    unavailableMarkets: [],
    unavailableSides: [],
    ...overrides,
  };
}

describe("JIT liquidity snapshot API", () => {
  it("preserves v2 freshness and completeness metadata", async () => {
    const api = new JitApi(
      buildV2Snapshot({
        status: "stale",
        unavailableMarkets: ["0xUnavailable"],
        unavailableSides: [{ market: "0xMarket", isLong: false }],
      })
    );

    await expect(fetchApiJitLiquiditySnapshot({ api })).resolves.toMatchObject({
      generatedAt: 1_000,
      status: "stale",
      unavailableMarkets: ["0xUnavailable"],
      unavailableSides: [{ market: "0xMarket", isLong: false }],
      jitLiquidityMap: {
        "0xMarket": {
          maxReservedUsdWithJitLong: 300n,
          maxReservedUsdWithJitShort: 0n,
        },
      },
    });
    expect(api.paths).toEqual(["/v2/jit/liquidity_info"]);
  });

  it.each([
    { status: "stale" },
    { unavailableMarkets: ["0xUnavailable"] },
    { unavailableSides: [{ market: "0xMarket", isLong: true }] },
  ])("keeps the legacy v2 map helper from hiding stale or partial snapshots", async (overrides) => {
    const api = new JitApi(buildV2Snapshot(overrides));

    await expect(fetchApiJitLiquidityInfo({ api }, { apiVersion: "v2" })).rejects.toThrow(
      "JIT liquidity snapshot is stale or incomplete"
    );
  });

  it("returns the legacy map for a fresh complete v2 snapshot", async () => {
    const api = new JitApi(buildV2Snapshot());

    await expect(fetchApiJitLiquidityInfo({ api }, { apiVersion: "v2" })).resolves.toMatchObject({
      "0xMarket": { maxReservedUsdWithJitLong: 300n },
    });
  });

  it.each([
    {},
    buildV2Snapshot({ status: "unknown" }),
    buildV2Snapshot({ generatedAt: -1 }),
    buildV2Snapshot({ liquidityInfos: {} }),
    buildV2Snapshot({ unavailableSides: [{ market: "0xMarket", isLong: "yes" }] }),
  ])("rejects malformed v2 snapshot metadata", async (response) => {
    const api = new JitApi(response);

    await expect(fetchApiJitLiquiditySnapshot({ api })).rejects.toThrow("Invalid JIT liquidity snapshot response");
  });
});
