import { maxUint256 } from "viem";

import { GasLimitsConfig } from "types/fees";
import { MarketsInfoData } from "types/markets";
import { TokensData } from "types/tokens";
import {
  MarketEdge,
  MarketEdgeLiquidityGetter,
  NaiveNetworkEstimator,
  NaiveSwapEstimator,
  SwapEstimator,
  SwapPaths,
} from "types/trade";
import { bigMath } from "utils/bigmath";
import { estimateOrderOraclePriceCount, getExecutionFee } from "utils/fees";
import { getNaiveEstimatedGasBySwapCount } from "utils/fees/getNaiveEstimatedGasBySwapCount";
import { getAvailableUsdLiquidityForCollateral, getTokenPoolType } from "utils/markets";
import { PRECISION, PRECISION_DECIMALS, bigintToNumber } from "utils/numbers";
import { getByKey } from "utils/objects";
import { MarketsGraph } from "utils/swap/buildMarketsAdjacencyGraph";
import { DEFAULT_NAIVE_TOP_PATHS_COUNT } from "utils/swap/constants";
import { MARKETS_ADJACENCY_GRAPH, REACHABLE_TOKENS, TOKEN_SWAP_PATHS } from "utils/swap/preparedSwapData";

import { getSwapStats } from "./swapStats";

export const createSwapEstimator = (marketsInfoData: MarketsInfoData): SwapEstimator => {
  return (e: MarketEdge, usdIn: bigint) => {
    const marketInfo = marketsInfoData[e.marketAddress];

    if (!marketInfo || marketInfo.isDisabled) {
      return {
        usdOut: 0n,
      };
    }

    const swapStats = getSwapStats({
      marketInfo,
      usdIn,
      tokenInAddress: e.from,
      tokenOutAddress: e.to,
      shouldApplyPriceImpact: true,
    });

    const isOutLiquidity = swapStats?.isOutLiquidity;
    const isOutCapacity = swapStats?.isOutCapacity;
    const usdOut = swapStats?.usdOut;

    if (usdOut === undefined || isOutLiquidity || isOutCapacity) {
      return {
        usdOut: 0n,
      };
    }

    return {
      usdOut,
    };
  };
};

export const createMarketEdgeLiquidityGetter = (marketsInfoData: MarketsInfoData): MarketEdgeLiquidityGetter => {
  return (e: MarketEdge) => {
    const marketInfo = getByKey(marketsInfoData, e.marketAddress);

    if (!marketInfo || marketInfo.isDisabled) {
      return 0n;
    }

    const isTokenOutLong = getTokenPoolType(marketInfo, e.to) === "long";
    const liquidity = getAvailableUsdLiquidityForCollateral(marketInfo, isTokenOutLong);

    return liquidity;
  };
};

export const createNaiveSwapEstimator = (marketsInfoData: MarketsInfoData): NaiveSwapEstimator => {
  return (e: MarketEdge, usdIn: bigint) => {
    let marketInfo = marketsInfoData[e.marketAddress];

    if (marketInfo === undefined || marketInfo.isDisabled) {
      return { swapYield: 0 };
    }

    const swapStats = getSwapStats({
      marketInfo,
      usdIn,
      tokenInAddress: e.from,
      tokenOutAddress: e.to,
      shouldApplyPriceImpact: true,
    });

    const usdOut = swapStats?.usdOut;

    if (usdOut === undefined || usdOut === 0n) {
      return { swapYield: 0 };
    }

    const swapYield = bigintToNumber((usdOut * PRECISION) / usdIn, PRECISION_DECIMALS);

    return { swapYield };
  };
};

export const createNaiveNetworkEstimator = ({
  gasLimits,
  tokensData,
  gasPrice,
  chainId,
}: {
  gasLimits: GasLimitsConfig;
  tokensData: TokensData;
  gasPrice: bigint;
  chainId: number;
}): NaiveNetworkEstimator => {
  return (usdIn: bigint, swapsCount: number) => {
    const estimatedGas = getNaiveEstimatedGasBySwapCount(gasLimits.singleSwap, swapsCount);
    if (estimatedGas === null || estimatedGas === undefined) return { networkYield: 1.0, usdOut: usdIn };

    const oraclePriceCount = estimateOrderOraclePriceCount(swapsCount);

    const feeUsd = getExecutionFee(chainId, gasLimits, tokensData, estimatedGas, gasPrice, oraclePriceCount)?.feeUsd;
    if (feeUsd === undefined) return { networkYield: 1.0, usdOut: usdIn };

    const networkYield = bigintToNumber(bigMath.mulDiv(usdIn, PRECISION, usdIn + feeUsd), PRECISION_DECIMALS);

    return { networkYield, usdOut: usdIn - feeUsd };
  };
};

export function getBestSwapPath({
  routes,
  usdIn,
  estimator,
  networkEstimator,
}: {
  routes: MarketEdge[][];
  usdIn: bigint;
  estimator: SwapEstimator;
  networkEstimator?: NaiveNetworkEstimator;
}): MarketEdge[] | undefined {
  if (routes.length === 0) {
    return undefined;
  }

  let bestRoute = routes[0];
  let bestUsdOut = 0n;

  for (const route of routes) {
    try {
      let pathUsdOut = route.reduce((prevUsdOut, edge) => {
        const { usdOut } = estimator(edge, prevUsdOut);
        return usdOut;
      }, usdIn);

      if (networkEstimator) {
        const { usdOut } = networkEstimator(pathUsdOut, route.length);
        pathUsdOut = usdOut;
      }

      if (pathUsdOut > bestUsdOut) {
        bestRoute = route;
        bestUsdOut = pathUsdOut;
      }
    } catch (e) {
      continue;
    }
  }

  return bestRoute;
}

export function getNaiveBestMarketSwapPathsFromTokenSwapPaths({
  graph,
  tokenSwapPaths,
  usdIn,
  tokenInAddress,
  tokenOutAddress,
  estimator,
  topPathsCount = DEFAULT_NAIVE_TOP_PATHS_COUNT,
  networkEstimator,
}: {
  graph: MarketsGraph;
  tokenSwapPaths: string[][];
  usdIn: bigint;
  tokenInAddress: string;
  tokenOutAddress: string;
  estimator: NaiveSwapEstimator;
  topPathsCount?: number;
  networkEstimator?: NaiveNetworkEstimator;
}): string[][] {
  // This seems to be true, because for any path if we have performed swaps to and from token
  // The best markets sequence is the same
  const cachedBestMarketForTokenEdge: Record<
    // Key: tokenHopFromAddress-tokenHopToAddress-count
    string,
    {
      marketAddress: string;
      swapYield: number;
    }
  > = {};

  const calculatedCache: Record<
    // From token address
    string,
    Record<
      // To token address
      string,
      Record<
        // Market address
        string,
        number
      >
    >
  > = {};

  const topPaths: {
    marketPath: string[];
    swapYield: number;
  }[] = [];

  const networkYieldCache: Record<number, number> = {};

  for (const pathType of tokenSwapPaths) {
    const marketPath: string[] = [];
    let pathTypeSwapYield = 1;
    let bad = false;

    // Just how many times we have swapped from token A to token B
    const tokenSwapCounter: Record<
      // From token address
      string,
      Record<
        // To token address
        string,
        number
      >
    > = {};

    for (let hopIndex = 0; hopIndex <= pathType.length; hopIndex++) {
      const tokenHopFromAddress = hopIndex === 0 ? tokenInAddress : pathType[hopIndex - 1];
      const tokenHopToAddress = hopIndex === pathType.length ? tokenOutAddress : pathType[hopIndex];

      // prevTokenAddress -> tokenAddress
      // get all markets for prevTokenAddress -> tokenAddress
      const marketAddresses = getMarketsForTokenPair(graph, tokenHopFromAddress, tokenHopToAddress);

      if (marketAddresses.length === 0) {
        bad = true;
        break;
      }

      const tokenSwapCount = tokenSwapCounter[tokenHopFromAddress]?.[tokenHopToAddress] || 0;

      const key = `${tokenHopFromAddress}-${tokenHopToAddress}-${tokenSwapCount}`;

      let bestMarketInfo:
        | {
            marketAddress: string;
            swapYield: number;
          }
        | undefined = cachedBestMarketForTokenEdge[key];

      if (!bestMarketInfo) {
        calculatedCache[tokenHopFromAddress] = calculatedCache[tokenHopFromAddress] || {};
        calculatedCache[tokenHopFromAddress][tokenHopToAddress] =
          calculatedCache[tokenHopFromAddress][tokenHopToAddress] || {};

        bestMarketInfo = getBestMarketForTokenEdge({
          marketAddresses,
          usdIn,
          tokenInAddress: tokenHopFromAddress,
          tokenOutAddress: tokenHopToAddress,
          estimator,
          marketPath,
          calculatedCache: calculatedCache[tokenHopFromAddress][tokenHopToAddress],
        });

        if (!bestMarketInfo) {
          bad = true;
          break;
        }

        cachedBestMarketForTokenEdge[key] = bestMarketInfo;
      }

      if (bestMarketInfo.swapYield === 0) {
        bad = true;
        break;
      }

      pathTypeSwapYield *= bestMarketInfo.swapYield;
      marketPath.push(bestMarketInfo.marketAddress);

      tokenSwapCounter[tokenHopFromAddress] = tokenSwapCounter[tokenHopFromAddress] || {};
      tokenSwapCounter[tokenHopFromAddress][tokenHopToAddress] =
        (tokenSwapCounter[tokenHopFromAddress][tokenHopToAddress] || 0) + 1;
    }

    if (bad) {
      continue;
    }

    if (topPaths.length < topPathsCount) {
      topPaths.push({ marketPath: marketPath, swapYield: pathTypeSwapYield });
    } else {
      let adjustedPathTypeSwapYield = pathTypeSwapYield;

      if (networkEstimator) {
        let networkYield = networkYieldCache[marketPath.length];

        if (networkYield === undefined) {
          networkYield = networkEstimator(usdIn, marketPath.length).networkYield;

          networkYieldCache[marketPath.length] = networkYield;
        }

        adjustedPathTypeSwapYield = adjustedPathTypeSwapYield * networkYield;
      }

      //  if yield is greater than any of the top paths, replace the one with the lowest yield
      let minSwapYield = topPaths[0].swapYield;
      let minSwapYieldIndex = 0;
      for (let i = 1; i < topPaths.length; i++) {
        if (topPaths[i].swapYield < minSwapYield) {
          minSwapYield = topPaths[i].swapYield;
          minSwapYieldIndex = i;
        }
      }
      if (adjustedPathTypeSwapYield > minSwapYield) {
        topPaths[minSwapYieldIndex] = { marketPath: marketPath, swapYield: adjustedPathTypeSwapYield };
      }
    }
  }

  return topPaths.map((p) => p.marketPath);
}

export function getMarketsForTokenPair(graph: MarketsGraph, tokenAAddress: string, tokenBAddress: string): string[] {
  if (graph[tokenAAddress]?.[tokenBAddress]) {
    return graph[tokenAAddress][tokenBAddress];
  }

  if (graph[tokenBAddress]?.[tokenAAddress]) {
    return graph[tokenBAddress][tokenAAddress];
  }

  return [];
}

export function getBestMarketForTokenEdge({
  marketAddresses,
  usdIn,
  tokenInAddress,
  tokenOutAddress,
  estimator,
  marketPath,
  calculatedCache,
}: {
  marketAddresses: string[];
  usdIn: bigint;
  tokenInAddress: string;
  tokenOutAddress: string;
  estimator: NaiveSwapEstimator;
  marketPath?: string[];
  calculatedCache?: Record<
    // Key: market address
    string,
    number
  >;
}):
  | {
      marketAddress: string;
      swapYield: number;
    }
  | undefined {
  let bestMarketAddress = marketAddresses[0];
  let bestYield = 0;
  let found = false;

  for (const marketAddress of marketAddresses) {
    if (marketPath && marketPath.includes(marketAddress)) {
      continue;
    }

    let swapYield: number | undefined = undefined;

    const key = marketAddress;
    if (calculatedCache) {
      swapYield = calculatedCache[key];
    }

    if (swapYield === undefined) {
      swapYield = estimator(
        {
          marketAddress,
          from: tokenInAddress,
          to: tokenOutAddress,
        },
        usdIn
      ).swapYield;

      if (calculatedCache) {
        calculatedCache[key] = swapYield;
      }
    }

    if (swapYield > bestYield) {
      bestYield = swapYield;
      bestMarketAddress = marketAddress;
      found = true;
    }
  }

  if (!found) {
    return undefined;
  }

  return {
    marketAddress: bestMarketAddress,
    swapYield: bestYield,
  };
}

export function marketRouteToMarketEdges(
  marketPath: string[],
  from: string,
  marketsInfoData: MarketsInfoData
): MarketEdge[] {
  let edges: MarketEdge[] = [];

  for (let i = 0; i < marketPath.length; i++) {
    const currentFrom = i === 0 ? from : edges[i - 1].to;
    const currentTo =
      marketsInfoData[marketPath[i]].longTokenAddress === currentFrom
        ? marketsInfoData[marketPath[i]].shortTokenAddress
        : marketsInfoData[marketPath[i]].longTokenAddress;

    edges.push({ from: currentFrom, to: currentTo, marketAddress: marketPath[i] });
  }

  return edges;
}

export function getTokenSwapPathsForTokenPair(
  tokenSwapPaths: SwapPaths,
  tokenAAddress: string,
  tokenBAddress: string
): string[][] {
  if (tokenSwapPaths[tokenAAddress]?.[tokenBAddress]) {
    return tokenSwapPaths[tokenAAddress][tokenBAddress];
  }

  if (tokenSwapPaths[tokenBAddress]?.[tokenAAddress]) {
    return tokenSwapPaths[tokenBAddress][tokenAAddress].map((route) => [...route].reverse());
  }

  return [];
}

export function getTokenSwapPathsForTokenPairPrebuilt(chainId: number, from: string, to: string): string[][] {
  return getTokenSwapPathsForTokenPair(TOKEN_SWAP_PATHS[chainId], from, to);
}

export function getMarketAdjacencyGraph(chainId: number): MarketsGraph {
  return MARKETS_ADJACENCY_GRAPH[chainId];
}

export function findAllReachableTokens(chainId: number, from: string): string[] {
  return REACHABLE_TOKENS[chainId][from];
}

export function getMaxLiquidityMarketSwapPathFromTokenSwapPaths({
  graph,
  tokenSwapPaths,
  tokenInAddress,
  tokenOutAddress,
  getLiquidity,
}: {
  graph: MarketsGraph;
  tokenSwapPaths: string[][];
  tokenInAddress: string;
  tokenOutAddress: string;
  getLiquidity: MarketEdgeLiquidityGetter;
}): { path: string[]; liquidity: bigint } | undefined {
  // go through all edges and find best yield market for it

  const cachedMaxLiquidityMarketForTokenEdge: Record<
    string,
    Record<
      string,
      {
        marketAddress: string;
        liquidity: bigint;
      }
    >
  > = {};

  let bestMarketPath: string[] | undefined = undefined;
  let bestLiquidity = 0n;

  for (const pathType of tokenSwapPaths) {
    let bad = false;
    let bestMarketPathForPathType: string[] = [];
    let pathTypeBestLiquidity = maxUint256;

    for (let hopIndex = 0; hopIndex <= pathType.length; hopIndex++) {
      const tokenFromAddress = hopIndex === 0 ? tokenInAddress : pathType[hopIndex - 1];
      const tokenToAddress = hopIndex === pathType.length ? tokenOutAddress : pathType[hopIndex];

      // prevTokenAddress -> tokenAddress
      // get all markets for prevTokenAddress -> tokenAddress
      const markets = getMarketsForTokenPair(graph, tokenFromAddress, tokenToAddress);

      if (markets.length === 0) {
        bad = true;
        break;
      }

      let bestMarketInfo:
        | {
            marketAddress: string;
            liquidity: bigint;
          }
        | undefined = cachedMaxLiquidityMarketForTokenEdge[tokenFromAddress]?.[tokenToAddress];

      if (!bestMarketInfo) {
        bestMarketInfo = getMaxLiquidityMarketForTokenEdge({
          markets,
          tokenInAddress,
          tokenOutAddress,
          getLiquidity,
        });

        cachedMaxLiquidityMarketForTokenEdge[tokenFromAddress] =
          cachedMaxLiquidityMarketForTokenEdge[tokenFromAddress] || {};
        cachedMaxLiquidityMarketForTokenEdge[tokenFromAddress][tokenToAddress] = bestMarketInfo;
      }

      bestMarketPathForPathType.push(bestMarketInfo.marketAddress);

      if (bestMarketInfo.liquidity < pathTypeBestLiquidity) {
        pathTypeBestLiquidity = bestMarketInfo.liquidity;
      }

      if (pathTypeBestLiquidity < bestLiquidity) {
        bad = true;
        break;
      }
    }

    if (bad) {
      continue;
    }

    if (pathTypeBestLiquidity > bestLiquidity) {
      bestLiquidity = pathTypeBestLiquidity;
      bestMarketPath = bestMarketPathForPathType;
    }
  }

  return bestMarketPath ? { path: bestMarketPath, liquidity: bestLiquidity } : undefined;
}

export function getMaxLiquidityMarketForTokenEdge({
  markets,
  tokenInAddress,
  tokenOutAddress,
  getLiquidity,
}: {
  markets: string[];
  tokenInAddress: string;
  tokenOutAddress: string;
  getLiquidity: MarketEdgeLiquidityGetter;
}): {
  marketAddress: string;
  liquidity: bigint;
} {
  let bestMarketAddress = markets[0];
  let bestLiquidity = 0n;

  for (const market of markets) {
    const liquidity = getLiquidity({
      marketAddress: market,
      from: tokenInAddress,
      to: tokenOutAddress,
    });

    if (liquidity > bestLiquidity) {
      bestLiquidity = liquidity;
      bestMarketAddress = market;
    }
  }

  return {
    marketAddress: bestMarketAddress,
    liquidity: bestLiquidity,
  };
}
