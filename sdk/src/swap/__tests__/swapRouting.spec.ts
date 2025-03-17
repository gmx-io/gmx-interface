import { USD_DECIMALS } from "configs/factors";
import type { MarketConfig } from "configs/markets";
import { NaiveSwapEstimator, SwapPaths } from "types/trade";
import { convertToTokenAmount, getMidPrice } from "utils/tokens";
import { describe, expect, it, vi } from "vitest";
import { mockMarketsInfoData, mockTokensData } from "../../test/mock";
import { MarketsGraph, buildMarketsAdjacencyGraph } from "../buildMarketsAdjacencyGraph";
import {
  getBestMarketForTokenEdge,
  getBestSwapPath,
  getMaxLiquidityMarketForTokenEdge,
  getNaiveBestMarketSwapPathsFromTokenSwapPaths,
  getNextMarketInfoAfterEncounters,
} from "../swapRouting";

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

  describe("cycles", () => {
    const graph: MarketsGraph = {
      ETH: {
        USDC: ["ETH [ETH-USDC]", "PEPE [ETH-USDC]"],
      },
      USDC: {
        ETH: ["ETH [ETH-USDC]", "PEPE [ETH-USDC]"],
      },
    };

    const swapPaths: SwapPaths = { USDC: { ETH: [[], ["ETH", "USDC"]] } };
    const tokenSwapPaths = swapPaths["USDC"]["ETH"];

    /*
    https://dreampuf.github.io/GraphvizOnline/

  digraph G {
    USDC_1->ETH_1[label=<ETH [<sup>ETH</sup>-<sub>USDC</sub>] <br/><br/> imbalance reduction>]
    USDC_1[label=USDC]
    ETH_1[label=ETH]
    ETH_1 -> USDC_2[label=<PEPE [<sub>ETH</sub>-<sup>USDC</sup>] <br/><br/> imbalance reduction>]
    USDC_2[label=USDC]
    USDC_2->ETH_2[label=<ETH [ETH-USDC] <br/><br/> imbalance worsening. but is it worth it?>]
    ETH_2[label=ETH]
}
     */

    it("should not pick cycle even if the first step is profitable but the latter step punishment is greater than the profit", () => {
      const estimatorSpy = vi.fn<NaiveSwapEstimator>((edge, usdIn, encounters) => {
        if (edge.marketAddress === "ETH [ETH-USDC]") {
          if (edge.from === "USDC") {
            if (encounters === 0) {
              // First encounter, profit
              return { swapYield: 1.2 };
            } else if (encounters > 0) {
              // Punish hard for worsening imbalance
              return { swapYield: 0.1 };
            } else if (encounters < 0) {
              // Means that we have performed opposite operation in the past
              // So now we are even
              return { swapYield: 0.83 };
            }
          } else if (edge.from === "ETH") {
            if (encounters === 0) {
              // First encounter, punish for worsening imbalance
              return { swapYield: 0.1 };
            } else if (encounters > 0) {
              // Punish for worsening imbalance
              return { swapYield: 0.1 };
            } else if (encounters < 0) {
              // Means that we have performed opposite operation in the past
              // So now we are even
              return { swapYield: 0.83 };
            }
          }
        } else if (edge.marketAddress === "PEPE [ETH-USDC]") {
          if (edge.from === "USDC") {
            if (encounters === 0) {
              // First encounter, punish for worsening imbalance
              return { swapYield: 0.1 };
            } else if (encounters > 0) {
              // Punish for worsening imbalance
              return { swapYield: 0.1 };
            } else if (encounters < 0) {
              // Means that we have performed opposite operation in the past
              // So now we are even BUT for the sake of test punish
              return { swapYield: 0.1 };
            }
          } else if (edge.from === "ETH") {
            if (encounters === 0) {
              // First encounter, profit
              return { swapYield: 1.1 };
            } else if (encounters > 0) {
              // Punish for worsening imbalance
              return { swapYield: 0.1 };
            } else if (encounters < 0) {
              // Means that we have performed opposite operation in the past
              // So now we are even
              return { swapYield: 0.83 };
            }
          }
        }

        return { swapYield: 0.99 };
      });

      const result = getNaiveBestMarketSwapPathsFromTokenSwapPaths({
        topPathsCount: 1,
        graph,
        tokenSwapPaths: tokenSwapPaths,
        tokenInAddress: "USDC",
        tokenOutAddress: "ETH",
        usdIn: 50n * dollar,
        estimator: estimatorSpy,
      });

      const topPath = result![0];
      expect(topPath).toEqual(["ETH [ETH-USDC]"]);

      // capture the order and arguments of estimatorSpy
      // expect(estimatorSpy).toHaveBeenCalledTimes(8);
      // First route type (direct)
      // expect(estimatorSpy).toHaveBeenNthCalledWith(
      //   1,
      //   {
      //     marketAddress: "ETH [ETH-USDC]",
      //     from: "USDC",
      //     to: "ETH",
      //   },
      //   50n * dollar,
      //   0
      // );
      // expect(estimatorSpy).toHaveBeenNthCalledWith(
      //   2,
      //   {
      //     marketAddress: "PEPE [ETH-USDC]",
      //     from: "USDC",
      //     to: "ETH",
      //   },
      //   50n * dollar,
      //   0
      // );
      // // Second route type (cycle)
      // expect(estimatorSpy).toHaveBeenNthCalledWith(
      //   3,
      //   {
      //     marketAddress: "ETH [ETH-USDC]",
      //     from: "USDC",
      //     to: "ETH",
      //   },
      //   50n * dollar,
      //   0
      // );
      // expect(estimatorSpy).toHaveBeenNthCalledWith(
      //   4,
      //   {
      //     marketAddress: "PEPE [ETH-USDC]",
      //     from: "USDC",
      //     to: "ETH",
      //   },
      //   50n * dollar,
      //   0
      // );
      // expect(estimatorSpy).toHaveBeenNthCalledWith(
      //   5,
      //   {
      //     marketAddress: "ETH [ETH-USDC]",
      //     from: "ETH",
      //     to: "USDC",
      //   },
      //   50n * dollar,
      //   -1
      // );
      // expect(estimatorSpy).toHaveBeenNthCalledWith(
      //   6,
      //   {
      //     marketAddress: "PEPE [ETH-USDC]",
      //     from: "ETH",
      //     to: "USDC",
      //   },
      //   50n * dollar,
      //   0
      // );
      // expect(estimatorSpy).toHaveBeenNthCalledWith(
      //   7,
      //   {
      //     marketAddress: "ETH [ETH-USDC]",
      //     from: "USDC",
      //     to: "ETH",
      //   },
      //   50n * dollar,
      //   1
      // );
      // expect(estimatorSpy).toHaveBeenNthCalledWith(
      //   8,
      //   {
      //     marketAddress: "PEPE [ETH-USDC]",
      //     from: "USDC",
      //     to: "ETH",
      //   },
      //   50n * dollar,
      //   -1
      // );
    });

    it("should pick cycle over direct path 2", () => {
      const estimatorSpy = vi.fn<NaiveSwapEstimator>((edge, usdIn, encounters) => {
        if (edge.marketAddress === "ETH [ETH-USDC]") {
          if (edge.from === "USDC") {
            if (encounters === 0) {
              // First encounter, profit
              return { swapYield: 1.2 };
            } else if (encounters === 1) {
              // Simulate the case when the market can still be profitable even if we have performed the same operation in the past
              return { swapYield: 1 };
            } else if (encounters === -1) {
              // Means that we have performed opposite operation in the past
              // So now we are even
              return { swapYield: 1.0 };
            }
          } else if (edge.from === "ETH") {
            if (encounters === 0) {
              // First encounter, punish for worsening imbalance
              return { swapYield: 0.6 };
            } else if (encounters === 1) {
              // Punish for worsening imbalance
              return { swapYield: 0.6 };
            } else if (encounters === -1) {
              // Means that we have performed opposite operation in the past
              // So now we are even
              return { swapYield: 1.0 };
            }
          }
        } else if (edge.marketAddress === "PEPE [ETH-USDC]") {
          if (edge.from === "USDC") {
            if (encounters === 0) {
              // First encounter, punish for worsening imbalance
              return { swapYield: 0.6 };
            } else if (encounters === 1) {
              // Punish for worsening imbalance
              return { swapYield: 0.6 };
            } else if (encounters === -1) {
              // Means that we have performed opposite operation in the past
              // So now we are even BUT for the sake of test punish
              return { swapYield: 0.6 };
            }
          } else if (edge.from === "ETH") {
            if (encounters === 0) {
              // First encounter, profit
              return { swapYield: 1.2 };
            } else if (encounters === 1) {
              // Punish for worsening imbalance
              return { swapYield: 0.6 };
            } else if (encounters === -1) {
              // Means that we have performed opposite operation in the past
              // So now we are even BUT for the sake of test punish
              return { swapYield: 0.6 };
            }
          }
        }

        return { swapYield: 0.99 };
      });

      const result = getNaiveBestMarketSwapPathsFromTokenSwapPaths({
        topPathsCount: 1,
        graph,
        tokenSwapPaths: tokenSwapPaths,
        tokenInAddress: "USDC",
        tokenOutAddress: "ETH",
        usdIn: 50n * dollar,
        estimator: estimatorSpy,
      });

      const topPath = result![0];
      expect(topPath).toEqual(["ETH [ETH-USDC]", "PEPE [ETH-USDC]", "ETH [ETH-USDC]"]);
    });
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

describe("getNextMarketInfoAfterEncounters", () => {
  const marketKeys = ["ETH-ETH-USDC"];

  const tokensData = mockTokensData();
  const longToken = tokensData.ETH;
  const shortToken = tokensData.USDC;

  const marketsInfoData = mockMarketsInfoData(tokensData, marketKeys, {
    "ETH-ETH-USDC": {
      longPoolAmount: 100_000n * 10n ** BigInt(longToken.decimals),
      shortPoolAmount: 100_000n * 10n ** BigInt(shortToken.decimals),
    },
  });

  const baseMarketInfo = marketsInfoData["ETH-ETH-USDC"];

  it("should not modify market info for zero encounters", () => {
    const marketInfo = {
      ...baseMarketInfo,
    };
    const edge = {
      marketAddress: "ETH [ETH-USDC]",
      from: "ETH",
      to: "USDC",
    };
    const usdIn = 50_000n * dollar;

    const result = getNextMarketInfoAfterEncounters(marketInfo, edge, usdIn, 0);

    expect(result.longPoolAmount).toEqual(marketInfo.longPoolAmount);
    expect(result.shortPoolAmount).toEqual(marketInfo.shortPoolAmount);
  });

  it("should adjust pool amounts for positive encounters when swapping from long to short", () => {
    const marketInfo = { ...baseMarketInfo };
    const edge = {
      marketAddress: "ETH [ETH-USDC]",
      from: "ETH",
      to: "USDC",
    };
    const usdIn = 50_000n * dollar;
    const encounters = 2;

    const expectedLongPoolAmount =
      convertToTokenAmount(usdIn * 2n, longToken.decimals, getMidPrice(longToken.prices))! + marketInfo.longPoolAmount;
    const expectedShortPoolAmount =
      marketInfo.shortPoolAmount -
      convertToTokenAmount(usdIn * 2n, shortToken.decimals, getMidPrice(shortToken.prices))!;

    const result = getNextMarketInfoAfterEncounters(marketInfo, edge, usdIn, encounters);

    // For 2 encounters of 50,000 USD worth of ETH to USDC swaps:
    // - Long pool should increase by equivalent of 100,000 USD worth of ETH
    // - Short pool should decrease by equivalent of 100,000 USD worth of USDC
    expect(result.longPoolAmount).toEqual(expectedLongPoolAmount);
    expect(result.shortPoolAmount).toEqual(expectedShortPoolAmount);
  });

  it("should adjust pool amounts for positive encounters when swapping from short to long", () => {
    const marketInfo = { ...baseMarketInfo };
    const edge = {
      marketAddress: "ETH [ETH-USDC]",
      from: "USDC",
      to: "ETH",
    };
    const usdIn = 50_000n * dollar;
    const encounters = 2;
    const expectedShortPoolAmount =
      convertToTokenAmount(usdIn * 2n, shortToken.decimals, getMidPrice(shortToken.prices))! +
      marketInfo.shortPoolAmount;
    const expectedLongPoolAmount =
      marketInfo.longPoolAmount - convertToTokenAmount(usdIn * 2n, longToken.decimals, getMidPrice(longToken.prices))!;

    const result = getNextMarketInfoAfterEncounters(marketInfo, edge, usdIn, encounters);

    // For 2 encounters of 50,000 USD worth of USDC to ETH swaps:
    // - Short pool should increase by equivalent of 100,000 USD worth of USDC
    // - Long pool should decrease by equivalent of 100,000 USD worth of ETH
    expect(result.shortPoolAmount).toEqual(expectedShortPoolAmount);
    expect(result.longPoolAmount).toEqual(expectedLongPoolAmount);
  });

  it("should handle negative encounters", () => {
    const marketInfo = { ...baseMarketInfo };
    const edge = {
      marketAddress: "ETH [ETH-USDC]",
      from: "ETH",
      to: "USDC",
    };
    const usdIn = 50_000n * dollar;
    const encounters = -1;

    const expectedLongPoolAmount =
      marketInfo.longPoolAmount - convertToTokenAmount(usdIn, longToken.decimals, getMidPrice(longToken.prices))!;
    const expectedShortPoolAmount =
      convertToTokenAmount(usdIn, shortToken.decimals, getMidPrice(shortToken.prices))! + marketInfo.shortPoolAmount;

    const result = getNextMarketInfoAfterEncounters(marketInfo, edge, usdIn, encounters);

    // For -1 encounters, the effect should be opposite to a positive encounter
    // - Long pool should decrease
    // - Short pool should increase
    expect(result.longPoolAmount).toEqual(expectedLongPoolAmount);
    expect(result.shortPoolAmount).toEqual(expectedShortPoolAmount);
  });

  it("should preserve original market info object", () => {
    const marketInfo = { ...baseMarketInfo };
    const originalLongPoolAmount = marketInfo.longPoolAmount;
    const originalShortPoolAmount = marketInfo.shortPoolAmount;

    const edge = {
      marketAddress: "ETH [ETH-USDC]",
      from: "ETH",
      to: "USDC",
    };
    const usdIn = 50_000n * dollar;
    const encounters = 1;

    getNextMarketInfoAfterEncounters(marketInfo, edge, usdIn, encounters);

    // Original market info should not be modified
    expect(marketInfo.longPoolAmount).toBe(originalLongPoolAmount);
    expect(marketInfo.shortPoolAmount).toBe(originalShortPoolAmount);
  });
});
