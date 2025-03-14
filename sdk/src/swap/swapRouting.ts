import { MarketsInfoData } from "types/markets";
import { MarketEdge, NaiveSwapEstimator, SwapEstimator, SwapRoute, SwapRoutes } from "types/trade";
import { PRECISION, PRECISION_DECIMALS, bigintToNumber } from "utils/numbers";
import { REACHABLE_TOKENS, SWAP_ROUTES } from "../prebuilt";
import { getMaxSwapPathLiquidity, getSwapStats } from "./swapStats";
import { DEFAULT_NAIVE_TOP_PATHS_COUNT } from "./constants";

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

export function getBestSwapPath(routes: SwapRoute[], usdIn: bigint, estimator: SwapEstimator): string[] | undefined {
  if (routes.length === 0) {
    return undefined;
  }

  let bestPath = routes[0].path;
  let bestUsdOut = 0n;

  for (const route of routes) {
    try {
      const pathUsdOut = route.edges.reduce((prevUsdOut, edge) => {
        const { usdOut } = estimator(edge, prevUsdOut);
        return usdOut;
      }, usdIn);

      if (pathUsdOut > bestUsdOut) {
        bestPath = route.path;
        bestUsdOut = pathUsdOut;
      }
    } catch (e) {
      continue;
    }
  }

  return bestPath;
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

export function findAllPaths({
  marketsInfoData,
  from,
  to,
  chainId,
  overrideSwapRoutes,
  overrideDisabledMarkets,
  overrideDisabledPaths,
}: {
  marketsInfoData: MarketsInfoData;
  from: string;
  to: string;
  chainId: number;
  /**
   * For testing purposes, override the swap routes
   */
  overrideSwapRoutes?: SwapRoutes;
  /**
   * For testing purposes, override the disabled markets
   */
  overrideDisabledMarkets?: string[];
  /**
   * For testing purposes, override the disabled paths
   */
  overrideDisabledPaths?: string[][];
}): SwapRoute[] | undefined {
  let routes: string[][] = [];

  const swapRoutes = overrideSwapRoutes ?? SWAP_ROUTES[chainId];

  const straightRoutes = swapRoutes[from]?.[to];

  if (straightRoutes?.length) {
    routes = straightRoutes;
  } else {
    const reversedRoutes = swapRoutes[to]?.[from];

    if (!reversedRoutes?.length) {
      return undefined;
    }

    routes = reversedRoutes.map((route) => [...route].reverse());
  }

  if (overrideDisabledMarkets?.length || overrideDisabledPaths?.length) {
    routes = applyDebugSettings({ routes, overrideDisabledMarkets, overrideDisabledPaths });
  }

  return routes.map(
    (route): SwapRoute => ({
      path: route,
      edges: marketRouteToMarketEdges(route, from, marketsInfoData),
      liquidity: getMaxSwapPathLiquidity({ marketsInfoData, swapPath: route, initialCollateralAddress: from }),
    })
  );
}

function marketRouteToMarketEdges(marketPath: string[], from: string, marketsInfoData: MarketsInfoData): MarketEdge[] {
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

function applyDebugSettings({
  routes,
  overrideDisabledMarkets,
  overrideDisabledPaths,
}: {
  routes: string[][];
  overrideDisabledMarkets?: string[];
  overrideDisabledPaths?: string[][];
}): string[][] {
  return routes.filter((route) => {
    let match = true;

    if (overrideDisabledMarkets?.length) {
      const hasDisabledMarkets = route.some((marketAddress) => overrideDisabledMarkets.includes(marketAddress));
      match = match && !hasDisabledMarkets;
    }

    if (overrideDisabledPaths?.length) {
      const hasDisabledPath = overrideDisabledPaths.some((path) => route.toString() === path.toString());
      match = match && !hasDisabledPath;
    }

    return match;
  });
}

export function findAllReachableTokens(chainId: number, from: string): string[] {
  return REACHABLE_TOKENS[chainId][from];
}
