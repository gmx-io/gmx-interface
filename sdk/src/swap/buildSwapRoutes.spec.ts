import { describe, it, expect } from "vitest";
import { findSwapPathsBetweenTokens } from "./buildSwapRoutes";
import type { MarketsGraph } from "./buildMarketsAdjacencyGraph";

describe("findSwapPathsBetweenTokens", () => {
  it("should find direct swap routes between tokens", () => {
    const graph: MarketsGraph = {
      ETH: {
        USDC: ["ETH [ETH-USDC]"],
      },
      USDC: {
        ETH: ["ETH [ETH-USDC]"],
      },
    };

    const result = findSwapPathsBetweenTokens(graph);

    expect(result).toEqual({
      ETH: {
        USDC: [["ETH [ETH-USDC]"]],
      },
    });
  });

  it("should find multi-hop swap routes", () => {
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

    const result = findSwapPathsBetweenTokens(graph);

    expect(result).toEqual({
      ETH: {
        USDC: [["ETH [ETH-USDC]"], ["BTC [BTC-ETH]", "BTC [BTC-USDC]"]],
        BTC: [["BTC [BTC-ETH]"], ["ETH [ETH-USDC]", "BTC [BTC-USDC]"]],
      },
      USDC: {
        BTC: [["BTC [BTC-USDC]"], ["ETH [ETH-USDC]", "BTC [BTC-ETH]"]],
      },
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

    const result = findSwapPathsBetweenTokens(graph);

    expect(result).toEqual({
      ETH: {
        USDC: [["ETH [ETH-USDC]"], ["ETH [ETH-USDC-2]"]],
      },
    });
  });

  it("should not include self-loops", () => {
    const graph: MarketsGraph = {
      ETH: {
        ETH: ["ETH [ETH-ETH]"],
      },
    };

    const result = findSwapPathsBetweenTokens(graph);

    expect(result).toEqual({});
  });

  it("should handle empty graph", () => {
    const graph: MarketsGraph = {};
    const result = findSwapPathsBetweenTokens(graph);
    expect(result).toEqual({});
  });

  it("should handle isolated tokens", () => {
    const graph: MarketsGraph = {
      ETH: {},
      USDC: {},
    };

    const result = findSwapPathsBetweenTokens(graph);

    expect(result).toEqual({});
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

    const result = findSwapPathsBetweenTokens(graph);

    // Assuming MAX_EDGE_PATH_LENGTH is 3, we shouldn't see paths longer than 3 hops
    for (const tokenA in result) {
      for (const tokenB in result[tokenA]) {
        for (const path of result[tokenA][tokenB]) {
          expect(path.length).toBeLessThanOrEqual(3);
        }
      }
    }
  });
});
