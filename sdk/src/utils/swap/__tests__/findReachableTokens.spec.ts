import { describe, it, expect } from "vitest";

import type { MarketsGraph } from "../buildMarketsAdjacencyGraph";
import { findReachableTokens } from "../findReachableTokens";

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
      ETH: ["ETH", "USDC"],
      USDC: ["USDC", "ETH"],
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
      ETH: ["ETH", "USDC", "BTC"],
      USDC: ["USDC", "ETH", "BTC"],
      BTC: ["BTC", "ETH", "USDC"],
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
      ETH: ["ETH", "USDC"],
      USDC: ["USDC", "ETH"],
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
      ETH: ["ETH"],
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
      ETH: ["ETH"],
      USDC: ["USDC"],
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

    expect(result.ETH).toEqual(["ETH", "USDC", "BTC", "WBTC"]);
    expect(result.USDC).toEqual(["USDC", "ETH", "BTC", "WBTC", "USDT"]);
    expect(result.BTC).toEqual(["BTC", "USDC", "WBTC", "ETH", "USDT", "DAI"]);
    expect(result.WBTC).toEqual(["WBTC", "BTC", "USDT", "USDC", "DAI", "ETH"]);
    expect(result.USDT).toEqual(["USDT", "WBTC", "DAI", "BTC", "USDC"]);
    expect(result.DAI).toEqual(["DAI", "USDT", "WBTC", "BTC"]);
  });
});
