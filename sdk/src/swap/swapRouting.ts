import { maxUint256 } from "viem";

import { MarketsInfoData } from "types/markets";
import { MarketEdge, NaiveSwapEstimator, SwapEstimator } from "types/trade";
import { PRECISION, PRECISION_DECIMALS, bigintToNumber } from "utils/numbers";
import { MARKETS_ADJACENCY_GRAPH, REACHABLE_TOKENS, TOKEN_SWAP_PATHS } from "../prebuilt";
import { MarketsGraph } from "./buildMarketsAdjacencyGraph";
import { DEFAULT_NAIVE_TOP_PATHS_COUNT } from "./constants";
import { getSwapStats } from "./swapStats";

export const createSwapEstimator = (marketsInfoData: MarketsInfoData): SwapEstimator => {
  return (e: MarketEdge, usdIn: bigint) => {
    const marketInfo = marketsInfoData[e.marketAddress];

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

export const createNaiveSwapEstimator = (marketsInfoData: MarketsInfoData): NaiveSwapEstimator => {
  return (e: MarketEdge, usdIn: bigint) => {
    const marketInfo = marketsInfoData[e.marketAddress];

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

export function getBestSwapPath(
  routes: MarketEdge[][],
  usdIn: bigint,
  estimator: SwapEstimator
): MarketEdge[] | undefined {
  if (routes.length === 0) {
    return undefined;
  }

  let bestRoute = routes[0];
  let bestUsdOut = 0n;

  for (const route of routes) {
    try {
      const pathUsdOut = route.reduce((prevUsdOut, edge) => {
        const { usdOut } = estimator(edge, prevUsdOut);
        return usdOut;
      }, usdIn);

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
}: {
  graph: MarketsGraph;
  tokenSwapPaths: string[][];
  usdIn: bigint;
  tokenInAddress: string;
  tokenOutAddress: string;
  estimator: NaiveSwapEstimator;
  topPathsCount?: number;
}): string[][] | undefined {
  // go through all edges and find best yield market for it

  const cachedBestMarketForTokenEdge: Record<
    string,
    Record<
      string,
      {
        marketAddress: string;
        swapYield: number;
      }
    >
  > = {};

  const topPaths: {
    marketPath: string[];
    swapYield: number;
  }[] = [];

  for (const pathType of tokenSwapPaths) {
    const marketPath: string[] = [];
    let pathTypeSwapYield = 1;
    let bad = false;

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

      let bestMarketInfo:
        | {
            marketAddress: string;
            swapYield: number;
          }
        | undefined = cachedBestMarketForTokenEdge[tokenHopFromAddress]?.[tokenHopToAddress];

      if (!bestMarketInfo) {
        bestMarketInfo = getBestMarketForTokenEdge({
          marketAddresses,
          usdIn,
          tokenInAddress: tokenHopFromAddress,
          tokenOutAddress: tokenHopToAddress,
          estimator,
        });

        cachedBestMarketForTokenEdge[tokenHopFromAddress] = cachedBestMarketForTokenEdge[tokenHopFromAddress] || {};
        cachedBestMarketForTokenEdge[tokenHopFromAddress][tokenHopToAddress] = bestMarketInfo;
      }

      pathTypeSwapYield *= bestMarketInfo.swapYield;
      marketPath.push(bestMarketInfo.marketAddress);
    }

    if (bad) {
      continue;
    }

    if (topPaths.length < topPathsCount) {
      topPaths.push({ marketPath: marketPath, swapYield: pathTypeSwapYield });
    } else {
      //  if yield is greater than any of the top paths, replace the one with the lowest yield
      let minSwapYield = topPaths[0].swapYield;
      let minSwapYieldIndex = 0;
      for (let i = 1; i < topPaths.length; i++) {
        if (topPaths[i].swapYield < minSwapYield) {
          minSwapYield = topPaths[i].swapYield;
          minSwapYieldIndex = i;
        }
      }
      if (pathTypeSwapYield > minSwapYield) {
        topPaths[minSwapYieldIndex] = { marketPath: marketPath, swapYield: pathTypeSwapYield };
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
}: {
  marketAddresses: string[];
  usdIn: bigint;
  tokenInAddress: string;
  tokenOutAddress: string;
  estimator: NaiveSwapEstimator;
}): {
  marketAddress: string;
  swapYield: number;
} {
  let bestMarketAddress = marketAddresses[0];
  let bestYield = 0;

  for (const marketAddress of marketAddresses) {
    const { swapYield } = estimator(
      {
        from: tokenInAddress,
        to: tokenOutAddress,
        marketAddress,
      },
      usdIn
    );

    if (swapYield > bestYield) {
      bestYield = swapYield;
      bestMarketAddress = marketAddress;
    }
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

export function getTokenSwapPaths(chainId: number, from: string, to: string): string[][] {
  if (TOKEN_SWAP_PATHS[chainId]?.[from]?.[to]) {
    return TOKEN_SWAP_PATHS[chainId][from][to];
  }

  if (TOKEN_SWAP_PATHS[chainId]?.[to]?.[from]) {
    // TODO: maybe cache reverses paths in the TOKEN_SWAP_PATHS itself.
    // Its not like it would harm anything
    // But the vibe of mutating global object is bad
    return TOKEN_SWAP_PATHS[chainId][to][from].map((route) => [...route].reverse());
  }

  return [];
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
  getLiquidity: (marketAddress: string, tokenInAddress: string, tokenOutAddress: string) => bigint;
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

      if (bestMarketInfo.liquidity < pathTypeBestLiquidity) {
        pathTypeBestLiquidity = bestMarketInfo.liquidity;
        bestMarketPathForPathType.push(bestMarketInfo.marketAddress);
      }

      // if current path is alrweady worse than the best path, skip the rest of the path
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
  getLiquidity: (marketAddress: string, tokenInAddress: string, tokenOutAddress: string) => bigint;
}): {
  marketAddress: string;
  liquidity: bigint;
} {
  let bestMarketAddress = markets[0];
  let bestLiquidity = 0n;

  for (const market of markets) {
    const liquidity = getLiquidity(market, tokenInAddress, tokenOutAddress);

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
