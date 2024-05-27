import { MarketInfo, MarketsInfoData } from "domain/synthetics/markets";
import { MarketEdge, MarketsGraph, SwapEstimator, SwapRoute } from "../types";
import { getMaxSwapPathLiquidity, getSwapStats } from "./swapStats";

export function getMarketsGraph(markets: MarketInfo[]): MarketsGraph {
  const graph: MarketsGraph = {
    abjacencyList: {},
    edges: [],
  };

  for (const market of markets) {
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
) {
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
