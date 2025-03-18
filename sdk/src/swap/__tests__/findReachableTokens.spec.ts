import { describe, it, expect } from "vitest";
import { findReachableTokens } from "../findReachableTokens";
import type { MarketsGraph } from "../buildMarketsAdjacencyGraph";

describe("findReachableTokens", () => {
  it("should find directly reachable tokens", () => {
    const graph: MarketsGraph = {
      ETH: {
        USDC: ["ETH [ETH-USDC]"],
      },
      USDC: {
        ETH: ["ETH [ETH-USDC]"],
      },
    };

    const result = findReachableTokens(graph);

    expect(result).toEqual({
      ETH: ["USDC"],
      USDC: ["ETH"],
    });
  });

  it("should find multi-hop reachable tokens", () => {
    const graph: MarketsGraph = {
      ETH: {
        USDC: ["ETH [ETH-USDC]"],
        BTC: ["BTC [BTC-ETH]"],
      },
      USDC: {
        ETH: ["ETH [ETH-USDC]"],
        BTC: ["BTC [BTC-USDC]"],
      },
      BTC: {
        ETH: ["BTC [BTC-ETH]"],
        USDC: ["BTC [BTC-USDC]"],
      },
    };

    const result = findReachableTokens(graph);

    expect(result).toEqual({
      ETH: ["USDC", "BTC"],
      USDC: ["ETH", "BTC"],
      BTC: ["ETH", "USDC"],
    });
  });

  it("should handle multiple markets between same tokens", () => {
    const graph: MarketsGraph = {
      ETH: {
        USDC: ["ETH [ETH-USDC]", "ETH [ETH-USDC-2]"],
      },
      USDC: {
        ETH: ["ETH [ETH-USDC]", "ETH [ETH-USDC-2]"],
      },
    };

    const result = findReachableTokens(graph);

    expect(result).toEqual({
      ETH: ["USDC"],
      USDC: ["ETH"],
    });
  });

  it("should not include self-loops", () => {
    const graph: MarketsGraph = {
      ETH: {
        ETH: ["ETH [ETH-ETH]"],
      },
    };

    const result = findReachableTokens(graph);

    expect(result).toEqual({
      ETH: [],
    });
  });

  it("should handle empty graph", () => {
    const graph: MarketsGraph = {};
    const result = findReachableTokens(graph);
    expect(result).toEqual({});
  });

  it("should handle isolated tokens", () => {
    const graph: MarketsGraph = {
      ETH: {},
      USDC: {},
    };

    const result = findReachableTokens(graph);

    expect(result).toEqual({
      ETH: [],
      USDC: [],
    });
  });

  it("should respect MAX_EDGE_PATH_LENGTH limit", () => {
    const graph: MarketsGraph = {
      ETH: {
        USDC: ["ETH [ETH-USDC]"],
      },
      USDC: {
        ETH: ["ETH [ETH-USDC]"],
        BTC: ["BTC [BTC-USDC]"],
      },
      BTC: {
        USDC: ["BTC [BTC-USDC]"],
        WBTC: ["WBTC [WBTC-BTC]"],
      },
      WBTC: {
        BTC: ["WBTC [WBTC-BTC]"],
        USDT: ["USDT [USDT-WBTC]"],
      },
      USDT: {
        WBTC: ["USDT [USDT-WBTC]"],
        DAI: ["DAI [DAI-USDT]"],
      },
      DAI: {
        USDT: ["DAI [DAI-USDT]"],
      },
    };

    const result = findReachableTokens(graph);

    expect(result.ETH).toEqual(["USDC", "BTC", "WBTC"]);
    expect(result.USDC).toEqual(["ETH", "BTC", "WBTC", "USDT"]);
    expect(result.BTC).toEqual(["USDC", "WBTC", "ETH", "USDT", "DAI"]);
    expect(result.WBTC).toEqual(["BTC", "USDT", "USDC", "DAI", "ETH"]);
    expect(result.USDT).toEqual(["WBTC", "DAI", "BTC", "USDC"]);
    expect(result.DAI).toEqual(["USDT", "WBTC", "BTC"]);
  });
});
