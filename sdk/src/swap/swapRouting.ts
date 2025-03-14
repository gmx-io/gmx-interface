import { MarketsInfoData } from "types/markets";
import { MarketEdge, NaiveSwapEstimator, SwapEstimator, SwapRoute } from "types/trade";
import { bigMath } from "utils/bigmath";
import { PRECISION, PRECISION_DECIMALS, bigintToNumber } from "utils/numbers";
import { maxUint256 } from "viem";
import { MARKETS_ADJACENCY_GRAPH, REACHABLE_TOKENS, SWAP_ROUTES } from "../prebuilt";
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

export function getNaiveBestSwapRoutes(
  routes: SwapRoute[],
  usdIn: bigint,
  estimator: NaiveSwapEstimator
): SwapRoute[] | undefined {
  if (routes.length === 0) {
    return undefined;
  }

  const cachedYields: Record<string, number> = {};

  const topPaths: {
    path: string[];
    yield: number;
    route: SwapRoute;
  }[] = [];

  for (const route of routes) {
    let pathYield = 0;

    try {
      let aggSwapYield = 1;

      for (const edge of route.edges) {
        const cachedYield = cachedYields[edge.marketAddress];
        if (cachedYield !== undefined) {
          aggSwapYield *= cachedYield;
        } else {
          const { swapYield } = estimator(edge, usdIn);
          cachedYields[edge.marketAddress] = swapYield;
          aggSwapYield *= swapYield;
        }

        if (aggSwapYield === 0) {
          break;
        }
      }

      pathYield = aggSwapYield;
    } catch (e) {
      continue;
    }

    if (pathYield === 0) {
      continue;
    }

    if (topPaths.length < DEFAULT_NAIVE_TOP_PATHS_COUNT) {
      topPaths.push({ path: route.path, yield: pathYield, route });
    } else {
      //  if yield is greater than any of the top paths, replace the one with the lowest yield
      let minYield = topPaths[0].yield;
      let minYieldIndex = 0;
      for (let i = 1; i < topPaths.length; i++) {
        if (topPaths[i].yield < minYield) {
          minYield = topPaths[i].yield;
          minYieldIndex = i;
        }
      }
      if (pathYield > minYield) {
        topPaths[minYieldIndex] = { path: route.path, yield: pathYield, route };
      }
    }
  }

  return topPaths.map((p) => p.route);
}

export function getNaiveBestMarketSwapPathFromTokenSwapPaths(
  chainId: number,
  tokenSwapPaths: string[][],
  usdIn: bigint,
  tokenInAddress: string,
  tokenOutAddress: string,
  estimator: NaiveSwapEstimator
): string[] | undefined {
  // go through all edges and find best yield market for it

  const start = performance.now();

  const cachedBestMarketForTokenEdge: Record<
    string,
    Record<
      string,
      {
        address: string;
        yield: number;
      }
    >
  > = {};

  let bestPath: string[] | undefined;
  let bestYield = 0;

  for (const pathType of tokenSwapPaths) {
    let aggSwapYield = 1;
    let bad = false;

    for (let hopIndex = 0; hopIndex <= pathType.length; hopIndex++) {
      const tokenFromAddress = hopIndex === 0 ? tokenInAddress : pathType[hopIndex - 1];
      const tokenToAddress = hopIndex === pathType.length ? tokenOutAddress : pathType[hopIndex];

      // prevTokenAddress -> tokenAddress
      // get all markets for prevTokenAddress -> tokenAddress
      const markets = getMarketsForTokenPair(chainId, tokenFromAddress, tokenToAddress);

      if (markets.length === 0) {
        bad = true;
        break;
      }

      let bestMarketInfo:
        | {
            address: string;
            yield: number;
          }
        | undefined = cachedBestMarketForTokenEdge[tokenFromAddress]?.[tokenToAddress];

      if (!bestMarketInfo) {
        bestMarketInfo = getBestMarketForTokenEdge({
          chainId,
          markets,
          usdIn,
          tokenInAddress: tokenFromAddress,
          tokenOutAddress: tokenToAddress,
          estimator,
        });

        cachedBestMarketForTokenEdge[tokenFromAddress] = cachedBestMarketForTokenEdge[tokenFromAddress] || {};
        cachedBestMarketForTokenEdge[tokenFromAddress][tokenToAddress] = bestMarketInfo;
      }

      aggSwapYield *= bestMarketInfo.yield;
    }

    if (bad) {
      continue;
    }

    if (aggSwapYield > bestYield) {
      bestYield = aggSwapYield;
      bestPath = pathType;
    }
  }

  const end = performance.now();
  const duration = end - start;
  if (duration > 10) {
    console.log(`getNaiveBestMarketSwapPathFromTokenSwapPaths took ${duration}ms`);
  }

  return bestPath;
}

export function getNaiveBestMarketSwapPathsFromTokenSwapPaths({
  chainId,
  tokenSwapPaths,
  usdIn,
  tokenInAddress,
  tokenOutAddress,
  estimator,
}: {
  chainId: number;
  tokenSwapPaths: string[][];
  usdIn: bigint;
  tokenInAddress: string;
  tokenOutAddress: string;
  estimator: NaiveSwapEstimator;
}): string[][] | undefined {
  // go through all edges and find best yield market for it

  const start = performance.now();

  const cachedBestMarketForTokenEdge: Record<
    string,
    Record<
      string,
      {
        address: string;
        yield: number;
      }
    >
  > = {};

  const topPaths: {
    path: string[];
    yield: number;
  }[] = [];

  for (const pathType of tokenSwapPaths) {
    const marketPath: string[] = [];
    let aggSwapYield = 1;
    let bad = false;

    for (let hopIndex = 0; hopIndex <= pathType.length; hopIndex++) {
      const tokenFromAddress = hopIndex === 0 ? tokenInAddress : pathType[hopIndex - 1];
      const tokenToAddress = hopIndex === pathType.length ? tokenOutAddress : pathType[hopIndex];

      // prevTokenAddress -> tokenAddress
      // get all markets for prevTokenAddress -> tokenAddress
      const markets = getMarketsForTokenPair(chainId, tokenFromAddress, tokenToAddress);

      if (markets.length === 0) {
        bad = true;
        break;
      }

      let bestMarketInfo:
        | {
            address: string;
            yield: number;
          }
        | undefined = cachedBestMarketForTokenEdge[tokenFromAddress]?.[tokenToAddress];

      if (!bestMarketInfo) {
        bestMarketInfo = getBestMarketForTokenEdge({
          chainId,
          markets,
          usdIn,
          tokenInAddress: tokenFromAddress,
          tokenOutAddress: tokenToAddress,
          estimator,
        });

        cachedBestMarketForTokenEdge[tokenFromAddress] = cachedBestMarketForTokenEdge[tokenFromAddress] || {};
        cachedBestMarketForTokenEdge[tokenFromAddress][tokenToAddress] = bestMarketInfo;
      }

      aggSwapYield *= bestMarketInfo.yield;
      marketPath.push(bestMarketInfo.address);
    }

    if (bad) {
      continue;
    }

    if (topPaths.length < DEFAULT_NAIVE_TOP_PATHS_COUNT) {
      topPaths.push({ path: marketPath, yield: aggSwapYield });
    } else {
      //  if yield is greater than any of the top paths, replace the one with the lowest yield
      let minYield = topPaths[0].yield;
      let minYieldIndex = 0;
      for (let i = 1; i < topPaths.length; i++) {
        if (topPaths[i].yield < minYield) {
          minYield = topPaths[i].yield;
          minYieldIndex = i;
        }
      }
      if (aggSwapYield > minYield) {
        topPaths[minYieldIndex] = { path: marketPath, yield: aggSwapYield };
      }
    }
  }

  const end = performance.now();
  const duration = end - start;
  if (duration > 10) {
    console.log(`getNaiveBestMarketSwapPathsFromTokenSwapPaths took ${duration}ms`);
  }

  return topPaths.map((p) => p.path);
}

export function getMarketsForTokenPair(chainId: number, tokenAAddress: string, tokenBAddress: string): string[] {
  const markets = MARKETS_ADJACENCY_GRAPH[chainId];

  if (markets[tokenAAddress]?.[tokenBAddress]) {
    return markets[tokenAAddress][tokenBAddress];
  }

  if (markets[tokenBAddress]?.[tokenAAddress]) {
    return markets[tokenBAddress][tokenAAddress];
  }

  return [];
}

function getBestMarketForTokenEdge({
  markets,
  usdIn,
  tokenInAddress,
  tokenOutAddress,
  estimator,
}: {
  chainId: number;
  markets: string[];
  usdIn: bigint;
  tokenInAddress: string;
  tokenOutAddress: string;
  estimator: NaiveSwapEstimator;
}): {
  address: string;
  yield: number;
} {
  const start = performance.now();
  let bestMarket = markets[0];
  let bestYield = 0;

  for (const market of markets) {
    const { swapYield } = estimator(
      {
        from: tokenInAddress,
        to: tokenOutAddress,
        marketAddress: market,
      },
      usdIn
    );

    if (swapYield > bestYield) {
      bestYield = swapYield;
      bestMarket = market;
    }
  }

  const end = performance.now();
  const duration = end - start;
  if (duration > 10) {
    console.log(`getBestMarketForTokenEdge took ${duration}ms`);
  }

  return {
    address: bestMarket,
    yield: bestYield,
  };
}

// export function findAllPaths({
//   marketsInfoData,
//   from,
//   to,
//   chainId,
//   overrideSwapRoutes,
//   overrideDisabledMarkets,
//   overrideDisabledPaths,
// }: {
//   marketsInfoData: MarketsInfoData;
//   from: string;
//   to: string;
//   chainId: number;
//   /**
//    * For testing purposes, override the swap routes
//    */
//   overrideSwapRoutes?: SwapRoutes;
//   /**
//    * For testing purposes, override the disabled markets
//    */
//   overrideDisabledMarkets?: string[];
//   /**
//    * For testing purposes, override the disabled paths
//    */
//   overrideDisabledPaths?: string[][];
// }): SwapRoute[] | undefined {
//   let routes: string[][] = [];

//   const swapRoutes = overrideSwapRoutes ?? SWAP_ROUTES[chainId];

//   const straightRoutes = swapRoutes[from]?.[to];

//   if (straightRoutes?.length) {
//     routes = straightRoutes;
//   } else {
//     const reversedRoutes = swapRoutes[to]?.[from];

//     if (!reversedRoutes?.length) {
//       return undefined;
//     }

//     routes = reversedRoutes.map((route) => [...route].reverse());
//   }

//   if (overrideDisabledMarkets?.length || overrideDisabledPaths?.length) {
//     routes = applyDebugSettings({ routes, overrideDisabledMarkets, overrideDisabledPaths });
//   }

//   return routes.map(
//     (route): SwapRoute => ({
//       path: route,
//       edges: marketRouteToMarketEdges(route, from, marketsInfoData),
//       liquidity: getMaxSwapPathLiquidity({ marketsInfoData, swapPath: route, initialCollateralAddress: from }),
//     })
//   );
// }

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

// function applyDebugSettings({
//   routes,
//   overrideDisabledMarkets,
//   overrideDisabledPaths,
// }: {
//   routes: string[][];
//   overrideDisabledMarkets?: string[];
//   overrideDisabledPaths?: string[][];
// }): string[][] {
//   return routes.filter((route) => {
//     let match = true;

//     if (overrideDisabledMarkets?.length) {
//       const hasDisabledMarkets = route.some((marketAddress) => overrideDisabledMarkets.includes(marketAddress));
//       match = match && !hasDisabledMarkets;
//     }

//     if (overrideDisabledPaths?.length) {
//       const hasDisabledPath = overrideDisabledPaths.some((path) => route.toString() === path.toString());
//       match = match && !hasDisabledPath;
//     }

//     return match;
//   });
// }

export function getTokenSwapRoutes(chainId: number, from: string, to: string): string[][] {
  if (SWAP_ROUTES[chainId]?.[from]?.[to]) {
    return SWAP_ROUTES[chainId][from][to];
  }

  if (SWAP_ROUTES[chainId]?.[to]?.[from]) {
    return SWAP_ROUTES[chainId][to][from].map((route) => [...route].reverse());
  }

  return [];
}

export function findAllReachableTokens(chainId: number, from: string): string[] {
  return REACHABLE_TOKENS[chainId][from];
}

export function getMaxLiquidityMarketSwapPathFromTokenSwapPaths({
  chainId,
  tokenSwapPaths,
  tokenInAddress,
  tokenOutAddress,
  getLiquidity,
}: {
  chainId: number;
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
        address: string;
        liquidity: bigint;
      }
    >
  > = {};

  let bestPath: string[] | undefined;
  let bestLiquidity = 0n;

  for (const pathType of tokenSwapPaths) {
    let bad = false;
    let pathTypeBestLiquidity = maxUint256;

    for (let hopIndex = 0; hopIndex <= pathType.length; hopIndex++) {
      const tokenFromAddress = hopIndex === 0 ? tokenInAddress : pathType[hopIndex - 1];
      const tokenToAddress = hopIndex === pathType.length ? tokenOutAddress : pathType[hopIndex];

      // prevTokenAddress -> tokenAddress
      // get all markets for prevTokenAddress -> tokenAddress
      const markets = getMarketsForTokenPair(chainId, tokenFromAddress, tokenToAddress);

      if (markets.length === 0) {
        bad = true;
        break;
      }

      let bestMarketInfo:
        | {
            address: string;
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

      pathTypeBestLiquidity = bigMath.min(pathTypeBestLiquidity, bestMarketInfo.liquidity);

      // if current path is alrweady worse than the best path, skip the rest of the path
      if (pathTypeBestLiquidity < bestLiquidity) {
        break;
      }
    }

    if (bad) {
      continue;
    }

    if (pathTypeBestLiquidity > bestLiquidity) {
      bestLiquidity = pathTypeBestLiquidity;
      bestPath = pathType;
    }
  }

  return bestPath ? { path: bestPath, liquidity: bestLiquidity } : undefined;
}

function getMaxLiquidityMarketForTokenEdge({
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
  address: string;
  liquidity: bigint;
} {
  let bestMarket = markets[0];
  let bestLiquidity = 0n;

  for (const market of markets) {
    const liquidity = getLiquidity(market, tokenInAddress, tokenOutAddress);

    if (liquidity > bestLiquidity) {
      bestLiquidity = liquidity;
      bestMarket = market;
    }
  }

  return {
    address: bestMarket,
    liquidity: bestLiquidity,
  };
}
