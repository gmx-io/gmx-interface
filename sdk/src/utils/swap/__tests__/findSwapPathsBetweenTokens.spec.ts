import { describe, it, expect } from "vitest";

import type { MarketsGraph } from "../buildMarketsAdjacencyGraph";
import { findSwapPathsBetweenTokens } from "../findSwapPathsBetweenTokens";

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
        USDC: [[]],
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
      BTC: {
        ETH: [[], ["USDC"]],
        USDC: [[], ["ETH"]],
      },
      ETH: {
        USDC: [[], ["BTC"]],
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
        USDC: [[], ["USDC", "ETH"]],
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
    // So node path length should be less than or equal to 2
    for (const tokenA in result) {
      for (const tokenB in result[tokenA]) {
        for (const path of result[tokenA][tokenB]) {
          expect(path.length).toBeLessThanOrEqual(2);
        }
      }
    }
  });

  it("should find swap routes through common node pairs", () => {
    // A - USDC - B
    //   ^
    //   |
    //   2 markets
    const graph: MarketsGraph = {
      A: {
        USDC: ["A [A-USDC]", "A2 [A-USDC]"],
      },
      B: {
        USDC: ["B [B-USDC]"],
      },
      USDC: {
        A: ["A [A-USDC]", "A2 [A-USDC]"],
        B: ["B [B-USDC]"],
      },
    };

    const result = findSwapPathsBetweenTokens(graph);

    expect(result).toEqual({
      A: {
        B: [["USDC"]],
        USDC: [[], ["USDC", "A"]],
      },
      B: {
        USDC: [[], ["USDC", "A"]],
      },
    });
  });
});
