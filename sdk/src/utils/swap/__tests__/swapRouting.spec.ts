import { describe, expect, it } from "vitest";

import { USD_DECIMALS } from "configs/factors";
import type { MarketConfig } from "configs/markets";
import { bigMath } from "utils/bigmath";

import { mockMarketsInfoData, mockTokensData } from "../../../test/mock";
import { buildMarketsAdjacencyGraph } from "../buildMarketsAdjacencyGraph";
import {
  createMarketEdgeLiquidityGetter,
  createNaiveSwapEstimator,
  createSwapEstimator,
  getBestMarketForTokenEdge,
  getBestSwapPath,
  getMaxLiquidityMarketForTokenEdge,
  getMaxLiquidityMarketSwapPathFromTokenSwapPaths,
  getNaiveBestMarketSwapPathsFromTokenSwapPaths,
} from "../swapRouting";

const dollar = 10n ** BigInt(USD_DECIMALS);

describe("getMaxLiquidityMarketForTokenEdge", () => {
  it("should return market with highest liquidity", () => {
    const result = getMaxLiquidityMarketForTokenEdge({
      markets: ["ETH [ETH-USDC]", "ETH [ETH-USDC-2]"],
      tokenInAddress: "ETH",
      tokenOutAddress: "USDC",
      getLiquidity: (edge) => {
        if (edge.marketAddress === "ETH [ETH-USDC]") return 1_000_000n * dollar;
        if (edge.marketAddress === "ETH [ETH-USDC-2]") return 500_000n * dollar;
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
      getLiquidity: (edge) => {
        calledWithMarket = edge.marketAddress;
        calledWithTokenIn = edge.from;
        calledWithTokenOut = edge.to;
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

  it("should return undefined if all have zero yield", () => {
    const result = getBestMarketForTokenEdge({
      marketAddresses: ["ETH [ETH-USDC]", "ETH [ETH-USDC-2]"],
      usdIn: 1_000_000n * dollar,
      tokenInAddress: "ETH",
      tokenOutAddress: "USDC",
      estimator: () => ({ swapYield: 0 }),
    });

    expect(result).toBeUndefined();
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

  it("returns single market path for direct token swap", () => {
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

  it("returns optimal two-hop path when swapping through intermediate token", () => {
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

  it("selects most profitable path when multiple routes exist", () => {
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

  it("ignores paths with non-existent markets", () => {
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

  it("prioritizes direct path with higher network yield over indirect path", () => {
    const graph = createTestGraph();
    // check direct path vs indirect path
    // of BTC to ETH swap
    //
    const tokenSwapPaths = [
      // Direct path
      [],
      // Indirect path
      ["USDC"],
    ];

    const result = getNaiveBestMarketSwapPathsFromTokenSwapPaths({
      topPathsCount: 1,
      graph,
      tokenSwapPaths,
      usdIn: 100n * dollar,
      tokenInAddress: "BTC",
      tokenOutAddress: "ETH",
      estimator: (edge) => {
        if (edge.marketAddress === "BTC [BTC-ETH]") {
          return { swapYield: 0.98 };
        }
        // make trick indirect path is more profitable without considering the network yield
        return { swapYield: 0.99 };
      },
      networkEstimator: (usdIn, swapCount) => {
        if (swapCount === 1) {
          return { networkYield: 0.99, usdOut: usdIn };
        } else if (swapCount === 2) {
          return { networkYield: 0.97, usdOut: usdIn };
        }
        return { networkYield: 0.95, usdOut: usdIn };
      },
    });

    expect(result).toEqual([["BTC [BTC-ETH]"]]);
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
    const result = getBestSwapPath({ routes: [], usdIn: 100n * dollar, estimator: () => ({ usdOut: 0n }) });
    expect(result).toBeUndefined();
  });

  it("should return route with highest usdOut", () => {
    const routes = createTestRoutes();
    const result = getBestSwapPath({
      routes,
      usdIn: 100n * dollar,
      estimator: (edge) => {
        if (edge.marketAddress === "ETH [ETH-USDC]") {
          return { usdOut: 98n * dollar };
        }

        return { usdOut: 100n * dollar };
      },
    });

    expect(result).toEqual([
      { from: "ETH", to: "BTC", marketAddress: "BTC [BTC-ETH]" },
      { from: "BTC", to: "USDC", marketAddress: "BTC [BTC-USDC]" },
    ]);
  });

  it("should handle routes with zero output", () => {
    const routes = createTestRoutes();
    const result = getBestSwapPath({ routes, usdIn: 100n * dollar, estimator: () => ({ usdOut: 0n }) });

    expect(result).toEqual(routes[0]);
  });

  it("should skip routes that throw errors", () => {
    const routes = createTestRoutes();
    const result = getBestSwapPath({
      routes,
      usdIn: 100n * dollar,
      estimator: (edge) => {
        if (edge.marketAddress === "ETH [ETH-USDC]") {
          return { usdOut: 98n * dollar };
        }
        throw new Error("Estimation failed");
      },
    });

    expect(result).toEqual([{ from: "ETH", to: "USDC", marketAddress: "ETH [ETH-USDC]" }]);
  });

  it("should correctly propagate usdIn through multi-hop path", () => {
    const routes = createTestRoutes();
    const capturedUsdIn: bigint[] = [];

    getBestSwapPath({
      routes,
      usdIn: 100n * dollar,
      estimator: (edge, usdIn) => {
        capturedUsdIn.push(usdIn);
        return { usdOut: usdIn / 2n };
      },
    });

    expect(capturedUsdIn).toEqual([
      100n * dollar, // First route, single hop
      100n * dollar, // Second route, first hop
      50n * dollar, // Second route, second hop
    ]);
  });

  it("should prefer shorter path when network costs outweigh yield benefits", () => {
    const routes = createTestRoutes();
    const result = getBestSwapPath({
      routes,
      usdIn: 100n * dollar,
      estimator: (edge) => {
        if (edge.marketAddress === "ETH [ETH-USDC]") {
          return { usdOut: 98n * dollar };
        }

        return { usdOut: 99n * dollar };
      },
      networkEstimator: (usdIn, swapCount) => {
        if (swapCount === 1) {
          return { networkYield: 0.99, usdOut: bigMath.mulDiv(usdIn, 99n, 100n) };
        } else if (swapCount === 2) {
          return { networkYield: 0.97, usdOut: bigMath.mulDiv(usdIn, 97n, 100n) };
        }
        return { networkYield: 0.95, usdOut: bigMath.mulDiv(usdIn, 95n, 100n) };
      },
    });

    expect(result).toEqual([{ from: "ETH", to: "USDC", marketAddress: "ETH [ETH-USDC]" }]);
  });

  it("should prefer multi-hop path when yield benefits outweigh network costs", () => {
    const routes = createTestRoutes();
    const result = getBestSwapPath({
      routes,
      usdIn: 100n * dollar,
      estimator: (edge) => {
        if (edge.marketAddress === "ETH [ETH-USDC]") {
          return { usdOut: 95n * dollar };
        }

        return { usdOut: 100n * dollar };
      },
      networkEstimator: (usdIn, swapCount) => {
        if (swapCount === 1) {
          return { networkYield: 0.99, usdOut: bigMath.mulDiv(usdIn, 99n, 100n) };
        } else if (swapCount === 2) {
          return { networkYield: 0.98, usdOut: bigMath.mulDiv(usdIn, 98n, 100n) };
        }
        return { networkYield: 0.97, usdOut: bigMath.mulDiv(usdIn, 97n, 100n) };
      },
    });

    expect(result).toEqual([
      { from: "ETH", to: "BTC", marketAddress: "BTC [BTC-ETH]" },
      { from: "BTC", to: "USDC", marketAddress: "BTC [BTC-USDC]" },
    ]);
  });

  it("should handle network estimator throwing errors", () => {
    const routes = createTestRoutes();
    const result = getBestSwapPath({
      routes,
      usdIn: 100n * dollar,
      estimator: (edge, usdIn) => {
        if (edge.marketAddress === "ETH [ETH-USDC]") {
          return { usdOut: 98n * dollar };
        }

        return { usdOut: bigMath.mulDiv(usdIn, 99n, 100n) };
      },
      networkEstimator: () => {
        throw new Error("Network estimation failed");
      },
    });

    expect(result).toEqual(routes[0]);
  });
});

describe("getMaxLiquidityMarketSwapPathFromTokenSwapPaths", () => {
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
    };
    return buildMarketsAdjacencyGraph(marketsMap);
  };

  it("returns direct path when it has highest liquidity", () => {
    const graph = createTestGraph();
    const tokenSwapPaths = [[]]; // ETH -> USDC direct path

    const result = getMaxLiquidityMarketSwapPathFromTokenSwapPaths({
      graph,
      tokenSwapPaths,
      tokenInAddress: "ETH",
      tokenOutAddress: "USDC",
      getLiquidity: (edge) => {
        if (edge.marketAddress === "ETH [ETH-USDC]") return 1_000_000n * dollar;
        return 500_000n * dollar;
      },
    });

    expect(result).toEqual({
      path: ["ETH [ETH-USDC]"],
      liquidity: 1_000_000n * dollar,
    });
  });

  it("returns multi-hop path when intermediate markets have higher liquidity", () => {
    const graph = createTestGraph();
    const tokenSwapPaths = [
      [], // direct ETH -> USDC
      ["BTC"], // ETH -> BTC -> USDC
    ];

    const result = getMaxLiquidityMarketSwapPathFromTokenSwapPaths({
      graph,
      tokenSwapPaths,
      tokenInAddress: "ETH",
      tokenOutAddress: "USDC",
      getLiquidity: (edge) => {
        if (edge.marketAddress === "ETH [ETH-USDC]") return 500_000n * dollar;
        return 1_000_000n * dollar; // Higher liquidity for BTC paths
      },
    });

    expect(result).toEqual({
      path: ["BTC [BTC-ETH]", "BTC [BTC-USDC]"],
      liquidity: 1_000_000n * dollar,
    });
  });

  it("returns undefined when no valid paths exist", () => {
    const graph = createTestGraph();
    const tokenSwapPaths = [["XRP"]]; // Non-existent path

    const result = getMaxLiquidityMarketSwapPathFromTokenSwapPaths({
      graph,
      tokenSwapPaths,
      tokenInAddress: "ETH",
      tokenOutAddress: "USDC",
      getLiquidity: () => 1_000_000n * dollar,
    });

    expect(result).toBeUndefined();
  });

  it("returns path with highest minimum liquidity across hops", () => {
    const graph = createTestGraph();
    const tokenSwapPaths = [
      [], // direct ETH -> USDC
      ["BTC"], // ETH -> BTC -> USDC
    ];

    const result = getMaxLiquidityMarketSwapPathFromTokenSwapPaths({
      graph,
      tokenSwapPaths,
      tokenInAddress: "ETH",
      tokenOutAddress: "USDC",
      getLiquidity: (edge) => {
        if (edge.marketAddress === "ETH [ETH-USDC]") return 800_000n * dollar;
        if (edge.marketAddress === "BTC [BTC-ETH]") return 1_000_000n * dollar;
        if (edge.marketAddress === "BTC [BTC-USDC]") return 600_000n * dollar; // Bottleneck in multi-hop path
        return 0n;
      },
    });

    // Should choose direct path because multi-hop path's minimum liquidity (600k) is less than direct path (800k)
    expect(result).toEqual({
      path: ["ETH [ETH-USDC]"],
      liquidity: 800_000n * dollar,
    });
  });

  it("returns first path when all paths have equal liquidity", () => {
    const graph = createTestGraph();
    const tokenSwapPaths = [
      [], // direct ETH -> USDC
      ["BTC"], // ETH -> BTC -> USDC
    ];

    const result = getMaxLiquidityMarketSwapPathFromTokenSwapPaths({
      graph,
      tokenSwapPaths,
      tokenInAddress: "ETH",
      tokenOutAddress: "USDC",
      getLiquidity: () => 1_000_000n * dollar,
    });

    expect(result).toEqual({
      path: ["ETH [ETH-USDC]"],
      liquidity: 1_000_000n * dollar,
    });
  });
});

describe("createSwapEstimator", () => {
  it("should return zero output for disabled markets", () => {
    const tokensData = mockTokensData();
    const marketKeys = ["ETH-ETH-USDC"];
    const marketsInfoData = mockMarketsInfoData(tokensData, marketKeys, {
      "ETH-ETH-USDC": {
        isDisabled: true,
      },
    });

    const estimator = createSwapEstimator(marketsInfoData, false);
    const result = estimator(
      {
        marketAddress: "ETH-ETH-USDC",
        from: "ETH",
        to: "USDC",
      },
      100n * dollar
    );

    expect(result).toEqual({
      usdOut: 0n,
    });
  });

  it("should return zero output for non-existent markets", () => {
    const tokensData = mockTokensData();
    const marketKeys = ["ETH-ETH-USDC"];
    const marketsInfoData = mockMarketsInfoData(tokensData, marketKeys);

    const estimator = createSwapEstimator(marketsInfoData, false);
    const result = estimator(
      {
        marketAddress: "NON-EXISTENT",
        from: "ETH",
        to: "USDC",
      },
      100n * dollar
    );

    expect(result).toEqual({
      usdOut: 0n,
    });
  });
});

describe("createMarketEdgeLiquidlyGetter", () => {
  it("should return zero liquidity for disabled markets", () => {
    const tokensData = mockTokensData();
    const marketKeys = ["ETH-ETH-USDC"];
    const marketsInfoData = mockMarketsInfoData(tokensData, marketKeys, {
      "ETH-ETH-USDC": {
        isDisabled: true,
      },
    });

    const getLiquidity = createMarketEdgeLiquidityGetter(marketsInfoData);
    const result = getLiquidity({
      marketAddress: "ETH-ETH-USDC",
      from: "ETH",
      to: "USDC",
    });

    expect(result).toBe(0n);
  });

  it("should return zero liquidity for non-existent markets", () => {
    const tokensData = mockTokensData();
    const marketKeys = ["ETH-ETH-USDC"];
    const marketsInfoData = mockMarketsInfoData(tokensData, marketKeys);

    const getLiquidity = createMarketEdgeLiquidityGetter(marketsInfoData);
    const result = getLiquidity({
      marketAddress: "NON-EXISTENT",
      from: "ETH",
      to: "USDC",
    });

    expect(result).toBe(0n);
  });
});

describe("createNaiveSwapEstimator", () => {
  it("should return zero yield for disabled markets", () => {
    const tokensData = mockTokensData();
    const marketKeys = ["ETH-ETH-USDC"];
    const marketsInfoData = mockMarketsInfoData(tokensData, marketKeys, {
      "ETH-ETH-USDC": {
        isDisabled: true,
      },
    });

    const estimator = createNaiveSwapEstimator(marketsInfoData, false);
    const result = estimator(
      {
        marketAddress: "ETH-ETH-USDC",
        from: "ETH",
        to: "USDC",
      },
      100n * dollar
    );

    expect(result).toEqual({
      swapYield: 0,
    });
  });

  it("should return zero yield for non-existent markets", () => {
    const tokensData = mockTokensData();
    const marketKeys = ["ETH-ETH-USDC"];
    const marketsInfoData = mockMarketsInfoData(tokensData, marketKeys);

    const estimator = createNaiveSwapEstimator(marketsInfoData, false);
    const result = estimator(
      {
        marketAddress: "NON-EXISTENT",
        from: "ETH",
        to: "USDC",
      },
      100n * dollar
    );

    expect(result).toEqual({
      swapYield: 0,
    });
  });
});
