import { maxUint256 } from "viem";
import { describe, expect, it } from "vitest";

import type { IHttp } from "utils/http/types";

import { fetchApiJitLiquidityInfo, fetchApiJitLiquiditySnapshot } from "./api";

const GLV_ADDRESS = "0x1111111111111111111111111111111111111111";
const MARKET_ADDRESS = "0x2222222222222222222222222222222222222222";
const LONG_FROM_MARKET_ADDRESS = "0x3333333333333333333333333333333333333333";
const SHORT_FROM_MARKET_ADDRESS = "0x4444444444444444444444444444444444444444";
const UNAVAILABLE_MARKET_ADDRESS = "0x5555555555555555555555555555555555555555";

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

function buildV2Entry(overrides: Record<string, unknown> = {}) {
  return {
    glv: GLV_ADDRESS,
    market: MARKET_ADDRESS,
    long: {
      maxReservedUsd: "300",
      maxOrderSizeUsd: "100",
      glvShiftParams: {
        glv: GLV_ADDRESS,
        fromMarket: LONG_FROM_MARKET_ADDRESS,
        toMarket: MARKET_ADDRESS,
        marketTokenAmount: "30",
        minMarketTokens: "0",
      },
    },
    short: {
      maxReservedUsd: "400",
      maxOrderSizeUsd: "200",
      glvShiftParams: {
        glv: GLV_ADDRESS,
        fromMarket: SHORT_FROM_MARKET_ADDRESS,
        toMarket: MARKET_ADDRESS,
        marketTokenAmount: "40",
        minMarketTokens: "0",
      },
    },
    ...overrides,
  };
}

function buildV2Snapshot(overrides: Record<string, unknown> = {}) {
  return {
    liquidityInfos: [buildV2Entry()],
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
        unavailableMarkets: [UNAVAILABLE_MARKET_ADDRESS],
        unavailableSides: [{ market: MARKET_ADDRESS, isLong: false }],
      })
    );

    await expect(fetchApiJitLiquiditySnapshot({ api })).resolves.toMatchObject({
      generatedAt: 1_000,
      status: "stale",
      unavailableMarkets: [UNAVAILABLE_MARKET_ADDRESS],
      unavailableSides: [{ market: MARKET_ADDRESS, isLong: false }],
      jitLiquidityMap: {
        [MARKET_ADDRESS]: {
          maxReservedUsdWithJitLong: 300n,
          maxReservedUsdWithJitShort: 400n,
        },
      },
    });
    expect(api.paths).toEqual(["/v2/jit/liquidity_info"]);
  });

  it("replaces a previously usable legacy map with an empty map when the snapshot becomes stale", async () => {
    const freshApi = new JitApi(buildV2Snapshot());
    const staleApi = new JitApi(buildV2Snapshot({ status: "stale" }));

    await expect(fetchApiJitLiquidityInfo({ api: freshApi }, { apiVersion: "v2" })).resolves.toHaveProperty(
      MARKET_ADDRESS
    );
    await expect(fetchApiJitLiquidityInfo({ api: staleApi }, { apiVersion: "v2" })).resolves.toEqual({});
  });

  it("removes unavailable markets from the legacy v2 map", async () => {
    const api = new JitApi(buildV2Snapshot({ unavailableMarkets: [MARKET_ADDRESS] }));

    await expect(fetchApiJitLiquidityInfo({ api }, { apiVersion: "v2" })).resolves.toEqual({});
  });

  it.each([
    {
      isLong: true,
      expected: {
        maxReservedUsdWithJitLong: 0n,
        maxReservedUsdWithJitShort: 400n,
        glvShiftParamsLong: [],
        glvShiftParamsShort: [expect.objectContaining({ fromMarket: SHORT_FROM_MARKET_ADDRESS })],
      },
    },
    {
      isLong: false,
      expected: {
        maxReservedUsdWithJitLong: 300n,
        maxReservedUsdWithJitShort: 0n,
        glvShiftParamsLong: [expect.objectContaining({ fromMarket: LONG_FROM_MARKET_ADDRESS })],
        glvShiftParamsShort: [],
      },
    },
  ])("clears only an unavailable side from the legacy v2 map", async ({ isLong, expected }) => {
    const api = new JitApi(buildV2Snapshot({ unavailableSides: [{ market: MARKET_ADDRESS, isLong }] }));

    await expect(fetchApiJitLiquidityInfo({ api }, { apiVersion: "v2" })).resolves.toMatchObject({
      [MARKET_ADDRESS]: expected,
    });
  });

  it("returns the legacy map for a fresh complete v2 snapshot", async () => {
    const api = new JitApi(buildV2Snapshot());

    await expect(fetchApiJitLiquidityInfo({ api }, { apiVersion: "v2" })).resolves.toMatchObject({
      [MARKET_ADDRESS]: {
        maxReservedUsdWithJitLong: 300n,
        maxReservedUsdWithJitShort: 400n,
      },
    });
  });

  it.each([
    {},
    buildV2Snapshot({ status: "unknown" }),
    buildV2Snapshot({ generatedAt: -1 }),
    buildV2Snapshot({ generatedAt: Date.now() + 120_000 }),
    buildV2Snapshot({ liquidityInfos: {} }),
    buildV2Snapshot({ unavailableMarkets: ["not-an-address"] }),
    buildV2Snapshot({ unavailableSides: [{ market: MARKET_ADDRESS, isLong: "yes" }] }),
  ])("rejects malformed v2 snapshot metadata", async (response) => {
    const api = new JitApi(response);

    await expect(fetchApiJitLiquiditySnapshot({ api })).rejects.toThrow("Invalid JIT liquidity snapshot response");
  });

  it.each([
    buildV2Entry({ market: "not-an-address" }),
    buildV2Entry({ long: { ...buildV2Entry().long, maxReservedUsd: "-1" } }),
    buildV2Entry({ long: { ...buildV2Entry().long, maxOrderSizeUsd: (maxUint256 + 1n).toString() } }),
    buildV2Entry({
      long: {
        ...buildV2Entry().long,
        glvShiftParams: { ...buildV2Entry().long.glvShiftParams, fromMarket: MARKET_ADDRESS },
      },
    }),
    buildV2Entry({
      long: {
        ...buildV2Entry().long,
        glvShiftParams: { ...buildV2Entry().long.glvShiftParams, marketTokenAmount: "0" },
      },
    }),
  ])("rejects malformed v2 snapshot entries", async (entry) => {
    const api = new JitApi(buildV2Snapshot({ liquidityInfos: [entry] }));

    await expect(fetchApiJitLiquiditySnapshot({ api })).rejects.toThrow("Invalid JIT liquidity snapshot response");
  });

  it("rejects duplicate market entries even when their address casing differs", async () => {
    const market = "0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa";
    const duplicate = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const fromMarket = "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB";
    const entry = buildV2Entry({
      market,
      long: {
        ...buildV2Entry().long,
        glvShiftParams: { ...buildV2Entry().long.glvShiftParams, fromMarket, toMarket: market },
      },
      short: null,
    });
    const api = new JitApi(buildV2Snapshot({ liquidityInfos: [entry, { ...entry, market: duplicate }] }));

    await expect(fetchApiJitLiquiditySnapshot({ api })).rejects.toThrow("Invalid JIT liquidity snapshot response");
  });
});
