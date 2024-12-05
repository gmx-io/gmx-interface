import { getAvailableUsdLiquidityForCollateral, MarketInfo, MarketsInfoData } from "domain/synthetics/markets";
import { MarketEdge, MarketsGraph, SwapEstimator, SwapRoute } from "../types";
import { getMaxSwapPathLiquidity, getSwapStats } from "./swapStats";

const MAX_MARKETS_PER_TOKEN = 5;

export function getMarketsGraph(markets: MarketInfo[]): MarketsGraph {
  const graph: MarketsGraph = {
    abjacencyList: {},
    edges: [],
  };

  const sortedMarkets = markets.sort((a, b) => {
    const liquidityA = getAvailableUsdLiquidityForCollateral(a, true) + getAvailableUsdLiquidityForCollateral(a, false);
    const liquidityB = getAvailableUsdLiquidityForCollateral(b, true) + getAvailableUsdLiquidityForCollateral(b, false);

    return Number(liquidityB) - Number(liquidityA);
  });

  const sortedMarketsByTokens: { [token: string]: MarketInfo[] } = {};

  for (const market of sortedMarkets) {
    const { longTokenAddress, shortTokenAddress } = market;

    sortedMarketsByTokens[longTokenAddress] = sortedMarketsByTokens[longTokenAddress] || [];

    if (sortedMarketsByTokens[longTokenAddress].length < MAX_MARKETS_PER_TOKEN) {
      sortedMarketsByTokens[longTokenAddress].push(market);
    }

    sortedMarketsByTokens[shortTokenAddress] = sortedMarketsByTokens[shortTokenAddress] || [];

    if (sortedMarketsByTokens[shortTokenAddress].length < MAX_MARKETS_PER_TOKEN) {
      sortedMarketsByTokens[shortTokenAddress].push(market);
    }
  }

  const marketsForGraph = Object.values(sortedMarketsByTokens).flat();

  for (const market of marketsForGraph) {
    const { longTokenAddress, shortTokenAddress, marketTokenAddress, isSameCollaterals, isDisabled } = market;

    if (isSameCollaterals || isDisabled) {
      continue;
    }

    const longShortEdge: MarketEdge = {
      marketInfo: market,
      marketAddress: marketTokenAddress,
      from: longTokenAddress,
      to: shortTokenAddress,
    };

    const shortLongEdge: MarketEdge = {
      marketInfo: market,
      marketAddress: marketTokenAddress,
      from: shortTokenAddress,
      to: longTokenAddress,
    };

    graph.abjacencyList[longTokenAddress] = graph.abjacencyList[longTokenAddress] || [];
    graph.abjacencyList[longTokenAddress].push(longShortEdge);
    graph.abjacencyList[shortTokenAddress] = graph.abjacencyList[shortTokenAddress] || [];
    graph.abjacencyList[shortTokenAddress].push(shortLongEdge);

    graph.edges.push(longShortEdge, shortLongEdge);
  }

  return graph;
}

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
    const usdOut = swapStats?.usdOut;

    if (usdOut === undefined || isOutLiquidity) {
      return {
        usdOut: 0n,
      };
    }

    return {
      usdOut,
    };
  };
};

export function getBestSwapPath(routes: SwapRoute[], usdIn: bigint, estimator: SwapEstimator) {
  if (routes.length === 0) {
    return undefined;
  }

  let bestPath = routes[0].path;
  let bestUsdOut = 0n;

  for (const route of routes) {
    try {
      const pathUsdOut = route.edged.reduce((prevUsdOut, edge) => {
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

export function findAllPaths(
  marketsInfoData: MarketsInfoData,
  graph: MarketsGraph,
  from: string,
  to: string,
  maxDepth = 3
): SwapRoute[] | undefined {
  const routes: SwapRoute[] = [];

  const edges = graph.abjacencyList[from];

  if (!edges?.length) {
    return undefined;
  }

  for (const e of edges) {
    dfs(e, [], [], {});
  }

  function dfs(edge: MarketEdge, path: string[], pathEdges: MarketEdge[], visited: { [edgeId: string]: boolean }) {
    // avoid too deep paths and cycles
    if (path.length >= maxDepth || visited[edge.marketAddress]) {
      return;
    }

    visited[edge.marketAddress] = true;
    pathEdges.push(edge);
    path.push(edge.marketAddress);

    if (edge.to === to) {
      routes.push({
        edged: pathEdges,
        path: path,
        liquidity: getMaxSwapPathLiquidity({ marketsInfoData, swapPath: path, initialCollateralAddress: from }),
      });
      return;
    }

    const edges = graph.abjacencyList[edge.to];

    if (!edges?.length) {
      return;
    }

    for (const e of edges) {
      dfs(e, [...path], [...pathEdges], { ...visited });
    }
  }

  return routes;
}

export function findAllReachableTokens(graph: MarketsGraph, from: string, maxDepth = 4): string[] {
  const edges = graph.abjacencyList[from];

  if (!edges?.length) {
    return [from];
  }

  let visited: { [edgeId: string]: boolean } = {};
  const visitedTokenAddresses = new Set<string>();
  visitedTokenAddresses.add(from);

  for (const e of edges) {
    dfs(e, 0);
  }

  function dfs(edge: MarketEdge, depth: number) {
    // avoid too deep paths and cycles
    if (depth >= maxDepth || visited[edge.marketAddress]) {
      return;
    }

    visited[edge.marketAddress] = true;
    visitedTokenAddresses.add(edge.marketInfo.longTokenAddress);
    visitedTokenAddresses.add(edge.marketInfo.shortTokenAddress);

    const edges = graph.abjacencyList[edge.to];

    if (!edges?.length) {
      return;
    }

    for (const e of edges) {
      dfs(e, depth + 1);
    }
  }

  return Array.from(visitedTokenAddresses);
}
