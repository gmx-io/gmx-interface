import { afterEach, describe, expect, it, vi } from "vitest";

import { usdToNumber } from "../../costs";
import { fetchHyperliquidL2Books, normalizeHyperliquidMarkets } from "../api";
import type { HyperliquidMetaAndAssetCtxsResponse } from "../types";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Hyperliquid API normalization", () => {
  it("combines meta and asset contexts and excludes delisted markets", () => {
    const response: HyperliquidMetaAndAssetCtxsResponse = [
      {
        universe: [
          { name: "ETH", szDecimals: 4, maxLeverage: 25, marginTableId: 1 },
          { name: "MATIC", szDecimals: 1, maxLeverage: 20, marginTableId: 2, isDelisted: true },
        ],
      },
      [
        { dayNtlVlm: "12345.67", markPx: "2100", midPx: "2100.5", funding: "0.0000125" },
        { dayNtlVlm: "999", markPx: "1", funding: "0" },
      ],
    ];

    const markets = normalizeHyperliquidMarkets(response, 123);

    expect(markets).toHaveLength(1);
    expect(markets[0]).toMatchObject({
      symbol: "ETH",
      displayName: "ETH",
      isDisabled: false,
      markPrice: 2100,
      midPrice: 2100.5,
      hourlyFundingRate: 0.0000125,
      timestamp: 123,
    });
    expect(usdToNumber(markets[0].volume24hUsd)).toBeCloseTo(12345.67, 6);
  });

  it("fetches default and aggregated L2 books for each coin", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));

      return {
        ok: true,
        json: async () => ({ coin: body.coin, time: 1, levels: [[], []] }),
      };
    });

    vi.stubGlobal("fetch", fetchMock);

    await fetchHyperliquidL2Books(["BTC"]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ type: "l2Book", coin: "BTC" });
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({
      type: "l2Book",
      coin: "BTC",
      nSigFigs: 5,
      mantissa: 5,
    });
  });
});
