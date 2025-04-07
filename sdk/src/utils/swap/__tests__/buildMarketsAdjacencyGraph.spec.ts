import { describe, it, expect } from "vitest";

import type { MarketConfig } from "configs/markets";

import { buildMarketsAdjacencyGraph } from "../buildMarketsAdjacencyGraph";

describe("buildMarketsAdjacencyGraph", () => {
  it("should build graph for single market", () => {
    const marketsMap: Record<string, MarketConfig> = {
      "ETH [ETH-USDC]": {
        marketTokenAddress: "ETH [ETH-USDC]",
        indexTokenAddress: "ETH",
        longTokenAddress: "ETH",
        shortTokenAddress: "USDC",
      },
    };

    const result = buildMarketsAdjacencyGraph(marketsMap);

    expect(result).toEqual({
      ETH: {
        USDC: ["ETH [ETH-USDC]"],
      },
      USDC: {
        ETH: ["ETH [ETH-USDC]"],
      },
    });
  });

  it("should build graph for multiple markets", () => {
    const marketsMap: Record<string, MarketConfig> = {
      "ETH [ETH-USDC]": {
        marketTokenAddress: "ETH [ETH-USDC]",
        indexTokenAddress: "ETH",
        longTokenAddress: "ETH",
        shortTokenAddress: "USDC",
      },
      "BTC [BTC-USDC]": {
        marketTokenAddress: "BTC [BTC-USDC]",
        indexTokenAddress: "BTC",
        longTokenAddress: "BTC",
        shortTokenAddress: "USDC",
      },
      "BTC [BTC-ETH]": {
        marketTokenAddress: "BTC [BTC-ETH]",
        indexTokenAddress: "BTC",
        longTokenAddress: "BTC",
        shortTokenAddress: "ETH",
      },
    };

    const result = buildMarketsAdjacencyGraph(marketsMap);

    expect(result).toEqual({
      ETH: {
        USDC: ["ETH [ETH-USDC]"],
        BTC: ["BTC [BTC-ETH]"],
      },
      USDC: {
        ETH: ["ETH [ETH-USDC]"],
        BTC: ["BTC [BTC-USDC]"],
      },
      BTC: {
        USDC: ["BTC [BTC-USDC]"],
        ETH: ["BTC [BTC-ETH]"],
      },
    });
  });

  it("should handle multiple markets between same tokens", () => {
    const marketsMap: Record<string, MarketConfig> = {
      "ETH [ETH-USDC]": {
        marketTokenAddress: "ETH [ETH-USDC]",
        indexTokenAddress: "ETH",
        longTokenAddress: "ETH",
        shortTokenAddress: "USDC",
      },
      "ETH [ETH-USDC-2]": {
        marketTokenAddress: "ETH [ETH-USDC-2]",
        indexTokenAddress: "ETH",
        longTokenAddress: "ETH",
        shortTokenAddress: "USDC",
      },
    };

    const result = buildMarketsAdjacencyGraph(marketsMap);

    expect(result).toEqual({
      ETH: {
        USDC: ["ETH [ETH-USDC]", "ETH [ETH-USDC-2]"],
      },
      USDC: {
        ETH: ["ETH [ETH-USDC]", "ETH [ETH-USDC-2]"],
      },
    });
  });

  it("should skip markets with same collateral tokens", () => {
    const marketsMap: Record<string, MarketConfig> = {
      "ETH [ETH-ETH]": {
        marketTokenAddress: "ETH [ETH-ETH]",
        indexTokenAddress: "ETH",
        longTokenAddress: "ETH",
        shortTokenAddress: "ETH",
      },
      "ETH [ETH-USDC]": {
        marketTokenAddress: "ETH [ETH-USDC]",
        indexTokenAddress: "ETH",
        longTokenAddress: "ETH",
        shortTokenAddress: "USDC",
      },
    };

    const result = buildMarketsAdjacencyGraph(marketsMap);

    expect(result).toEqual({
      ETH: {
        ETH: ["ETH [ETH-ETH]"],
        USDC: ["ETH [ETH-USDC]"],
      },
      USDC: {
        ETH: ["ETH [ETH-USDC]"],
      },
    });
  });

  it("should handle empty markets map", () => {
    const marketsMap: Record<string, MarketConfig> = {};
    const result = buildMarketsAdjacencyGraph(marketsMap);
    expect(result).toEqual({});
  });
});
