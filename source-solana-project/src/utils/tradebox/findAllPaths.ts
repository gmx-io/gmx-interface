import { MarketsInfo } from '@/selectors/market/types';
import { MarketEdge, MarketsGraph, SwapRoute } from '@/selectors/trade/types';
import { getSwapPathOfMaxLiquidity } from '@/utils/tradebox/getSwapPathOfMaxLiquidity';

export function findAllPaths(
  marketsInfo: MarketsInfo,
  graph: MarketsGraph,
  from: string,
  to: string,
  maxDepth = 3
): SwapRoute[] | undefined {
  const routes: SwapRoute[] = [];

  const edges = graph.abjacencyList[from];

  if (!edges?.length) return undefined;

  for (const e of edges) {
    dfs(e, [], [], {});
  }

  function dfs(
    edge: MarketEdge,
    path: string[],
    pathEdges: MarketEdge[],
    visited: { [edgeId: string]: boolean }
  ) {
    if (path.length >= maxDepth || visited[edge.marketAddress]) return;

    visited[edge.marketAddress] = true;
    pathEdges.push(edge);
    path.push(edge.marketAddress);

    if (edge.to === to) {
      routes.push({
        edged: pathEdges,
        path,
        liquidity: getSwapPathOfMaxLiquidity({
          marketsInfo,
          swapPath: path,
          initialCollateralAddress: from,
        }),
      });
      return;
    }

    const nextEdges = graph.abjacencyList[edge.to];

    if (!nextEdges?.length) return;

    for (const nextEdge of nextEdges) {
      dfs(nextEdge, [...path], [...pathEdges], { ...visited });
    }
  }

  return routes;
}
