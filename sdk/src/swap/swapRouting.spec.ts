import { describe, it, expect } from "vitest";
import {
  getMaxLiquidityMarketForTokenEdge,
  getBestMarketForTokenEdge,
  getNaiveBestMarketSwapPathsFromTokenSwapPaths,
  getBestSwapPath,
} from "./swapRouting";
import { buildMarketsAdjacencyGraph } from "./buildMarketsAdjacencyGraph";
import type { MarketConfig } from "configs/markets";
import { USD_DECIMALS } from "configs/factors";

const dollar = 10n ** BigInt(USD_DECIMALS);

describe("getMaxLiquidityMarketForTokenEdge", () => {
  it("should return market with highest liquidity", () => {
    const result = getMaxLiquidityMarketForTokenEdge({
      markets: ["ETH [ETH-USDC]", "ETH [ETH-USDC-2]"],
      tokenInAddress: "ETH",
      tokenOutAddress: "USDC",
      getLiquidity: (marketAddress) => {
        if (marketAddress === "ETH [ETH-USDC]") return 1_000_000n * dollar;
        if (marketAddress === "ETH [ETH-USDC-2]") return 500_000n * dollar;
        return 0n;
      },
    });

    expect(result).toEqual({
      marketAddress: "ETH [ETH-USDC]",
      liquidity: 1_000_000n * dollar,
    });
  });

  it("should return first market if all have zero liquidity", () => {
    const result = getMaxLiquidityMarketForTokenEdge({
      markets: ["ETH [ETH-USDC]", "ETH [ETH-USDC-2]"],
      tokenInAddress: "ETH",
      tokenOutAddress: "USDC",
      getLiquidity: () => 0n,
    });

    expect(result).toEqual({
      marketAddress: "ETH [ETH-USDC]",
      liquidity: 0n,
    });
  });

  it("should return first market if all have same liquidity", () => {
    const result = getMaxLiquidityMarketForTokenEdge({
      markets: ["ETH [ETH-USDC]", "ETH [ETH-USDC-2]"],
      tokenInAddress: "ETH",
      tokenOutAddress: "USDC",
      getLiquidity: () => 1_000_000n * dollar,
    });

    expect(result).toEqual({
      marketAddress: "ETH [ETH-USDC]",
      liquidity: 1_000_000n * dollar,
    });
  });

  it("should pass correct tokens to getLiquidity function", () => {
    let calledWithMarket: string | undefined;
    let calledWithTokenIn: string | undefined;
    let calledWithTokenOut: string | undefined;

    getMaxLiquidityMarketForTokenEdge({
      markets: ["ETH [ETH-USDC]"],
      tokenInAddress: "ETH",
      tokenOutAddress: "USDC",
      getLiquidity: (market, tokenIn, tokenOut) => {
        calledWithMarket = market;
        calledWithTokenIn = tokenIn;
        calledWithTokenOut = tokenOut;
        return 0n;
      },
    });

    expect(calledWithMarket).toBe("ETH [ETH-USDC]");
    expect(calledWithTokenIn).toBe("ETH");
    expect(calledWithTokenOut).toBe("USDC");
  });
});

describe("getBestMarketForTokenEdge", () => {
  it("should return market with highest swap yield", () => {
    const result = getBestMarketForTokenEdge({
      marketAddresses: ["ETH [ETH-USDC]", "ETH [ETH-USDC-2]"],
      usdIn: 1_000_000n * dollar,
      tokenInAddress: "ETH",
      tokenOutAddress: "USDC",
      estimator: (edge) => {
        if (edge.marketAddress === "ETH [ETH-USDC]") return { swapYield: 0.98 };
        if (edge.marketAddress === "ETH [ETH-USDC-2]") return { swapYield: 0.96 };
        return { swapYield: 0 };
      },
    });

    expect(result).toEqual({
      marketAddress: "ETH [ETH-USDC]",
      swapYield: 0.98,
    });
  });

  it("should return first market if all have zero yield", () => {
    const result = getBestMarketForTokenEdge({
      marketAddresses: ["ETH [ETH-USDC]", "ETH [ETH-USDC-2]"],
      usdIn: 1_000_000n * dollar,
      tokenInAddress: "ETH",
      tokenOutAddress: "USDC",
      estimator: () => ({ swapYield: 0 }),
    });

    expect(result).toEqual({
      marketAddress: "ETH [ETH-USDC]",
      swapYield: 0,
    });
  });

  it("should pass correct parameters to estimator", () => {
    let calledWithEdge: any = undefined;
    let calledWithUsdIn: bigint | undefined;

    getBestMarketForTokenEdge({
      marketAddresses: ["ETH [ETH-USDC]"],
      usdIn: 1_000_000n * dollar,
      tokenInAddress: "ETH",
      tokenOutAddress: "USDC",
      estimator: (edge, usdIn) => {
        calledWithEdge = edge;
        calledWithUsdIn = usdIn;
        return { swapYield: 0 };
      },
    });

    expect(calledWithEdge).toEqual({
      marketAddress: "ETH [ETH-USDC]",
      from: "ETH",
      to: "USDC",
    });
    expect(calledWithUsdIn).toBe(1_000_000n * dollar);
  });
});

describe("getNaiveBestMarketSwapPathsFromTokenSwapPaths", () => {
  const createTestGraph = () => {
    const marketsMap: Record<string, MarketConfig> = {
      "ETH [ETH-USDC]": {
        marketTokenAddress: "ETH [ETH-USDC]",
        longTokenAddress: "ETH",
        shortTokenAddress: "USDC",
        indexTokenAddress: "ETH",
      },
      "BTC [BTC-USDC]": {
        marketTokenAddress: "BTC [BTC-USDC]",
        longTokenAddress: "BTC",
        shortTokenAddress: "USDC",
        indexTokenAddress: "BTC",
      },
      "BTC [BTC-ETH]": {
        marketTokenAddress: "BTC [BTC-ETH]",
        longTokenAddress: "BTC",
        shortTokenAddress: "ETH",
        indexTokenAddress: "BTC",
      },
      "SOL [ETH-USDC]": {
        marketTokenAddress: "SOL [ETH-USDC]",
        longTokenAddress: "ETH",
        shortTokenAddress: "USDC",
        indexTokenAddress: "SOL",
      },
    };
    return buildMarketsAdjacencyGraph(marketsMap);
  };

  it("should handle direct path with no intermediate tokens", () => {
    const graph = createTestGraph();
    const tokenSwapPaths = [[]]; // ETH -> USDC direct path, no intermediate tokens

    const result = getNaiveBestMarketSwapPathsFromTokenSwapPaths({
      graph,
      tokenSwapPaths,
      usdIn: 100n * dollar,
      tokenInAddress: "ETH",
      tokenOutAddress: "USDC",
      estimator: (edge) => ({
        swapYield: edge.marketAddress === "ETH [ETH-USDC]" ? 0.98 : 0.96,
      }),
    });

    expect(result).toEqual([["ETH [ETH-USDC]"]]);
  });

  it("should find best path for multi-hop swap", () => {
    const graph = createTestGraph();
    const tokenSwapPaths = [["BTC"]]; // ETH -> BTC -> USDC path

    const result = getNaiveBestMarketSwapPathsFromTokenSwapPaths({
      graph,
      tokenSwapPaths,
      usdIn: 100n * dollar,
      tokenInAddress: "ETH",
      tokenOutAddress: "USDC",
      estimator: (edge) => ({
        swapYield: edge.marketAddress === "BTC [BTC-ETH]" ? 0.98 : 0.97,
      }),
    });

    expect(result).toEqual([["BTC [BTC-ETH]", "BTC [BTC-USDC]"]]);
  });

  it("should handle multiple possible paths", () => {
    const graph = createTestGraph();
    const tokenSwapPaths = [
      [], // direct path with no intermediate tokens
      ["BTC"], // path through BTC
    ];

    const result = getNaiveBestMarketSwapPathsFromTokenSwapPaths({
      graph,
      tokenSwapPaths,
      usdIn: 100n * dollar,
      tokenInAddress: "ETH",
      tokenOutAddress: "USDC",
      estimator: (edge) => ({
        // Make indirect path more profitable
        swapYield:
          {
            "ETH [ETH-USDC]": 0.5,
            "BTC [BTC-ETH]": 1,
            "BTC [BTC-USDC]": 1,
          }[edge.marketAddress] || 0,
      }),
      topPathsCount: 1,
    });

    expect(result).toEqual([["BTC [BTC-ETH]", "BTC [BTC-USDC]"]]);
  });

  it("should skip paths with no available markets", () => {
    const graph = createTestGraph();
    const tokenSwapPaths = [
      ["DAI"], // non-existent path
      ["BTC"], // existing path
    ];

    const result = getNaiveBestMarketSwapPathsFromTokenSwapPaths({
      graph,
      tokenSwapPaths,
      usdIn: 100n * dollar,
      tokenInAddress: "ETH",
      tokenOutAddress: "USDC",
      estimator: () => ({ swapYield: 0.98 }),
    });

    expect(result).toEqual([["BTC [BTC-ETH]", "BTC [BTC-USDC]"]]);
  });
});

describe("getBestSwapPath", () => {
  const createTestRoutes = () => {
    return [
      [{ from: "ETH", to: "USDC", marketAddress: "ETH [ETH-USDC]" }],
      [
        { from: "ETH", to: "BTC", marketAddress: "BTC [BTC-ETH]" },
        { from: "BTC", to: "USDC", marketAddress: "BTC [BTC-USDC]" },
      ],
    ];
  };

  it("should return undefined for empty routes", () => {
    const result = getBestSwapPath([], 100n * dollar, () => ({ usdOut: 0n }));
    expect(result).toBeUndefined();
  });

  it("should return route with highest usdOut", () => {
    const routes = createTestRoutes();
    const result = getBestSwapPath(routes, 100n * dollar, (edge, usdIn) => {
      if (edge.marketAddress === "ETH [ETH-USDC]") {
        return { usdOut: 980000n }; // 98% output
      }
      // Multi-hop path: 0.99 * 0.99 = 0.9801 = 98.01% output
      return { usdOut: BigInt(Math.floor(Number(usdIn) * 0.99)) };
    });

    expect(result).toEqual([
      { from: "ETH", to: "BTC", marketAddress: "BTC [BTC-ETH]" },
      { from: "BTC", to: "USDC", marketAddress: "BTC [BTC-USDC]" },
    ]);
  });

  it("should handle routes with zero output", () => {
    const routes = createTestRoutes();
    const result = getBestSwapPath(routes, 100n * dollar, () => ({ usdOut: 0n }));

    expect(result).toEqual(routes[0]);
  });

  it("should skip routes that throw errors", () => {
    const routes = createTestRoutes();
    const result = getBestSwapPath(routes, 100n * dollar, (edge) => {
      if (edge.marketAddress === "ETH [ETH-USDC]") {
        return { usdOut: 980000n };
      }
      throw new Error("Estimation failed");
    });

    expect(result).toEqual([{ from: "ETH", to: "USDC", marketAddress: "ETH [ETH-USDC]" }]);
  });

  it("should correctly propagate usdIn through multi-hop path", () => {
    const routes = createTestRoutes();
    const capturedUsdIn: bigint[] = [];

    getBestSwapPath(routes, 100n * dollar, (edge, usdIn) => {
      capturedUsdIn.push(usdIn);
      return { usdOut: usdIn / 2n };
    });

    expect(capturedUsdIn).toEqual([
      100n * dollar, // First route, single hop
      100n * dollar, // Second route, first hop
      50n * dollar, // Second route, second hop
    ]);
  });
});
