import { MarketEdge, MarketsGraph } from '@/selectors/trade/types';

export function findAllReachableTokens(
  graph: MarketsGraph,
  from: string,
  maxDepth = 4
): string[] {
  const edges = graph.abjacencyList[from];

  if (!edges?.length) return [from];

  const visited: { [edgeId: string]: boolean } = {};
  const visitedTokenAddresses = new Set<string>();
  visitedTokenAddresses.add(from);

  for (const e of edges) {
    dfs(e, 0);
  }

  function dfs(edge: MarketEdge, depth: number) {
    if (depth >= maxDepth || visited[edge.marketAddress]) return;

    visited[edge.marketAddress] = true;
    visitedTokenAddresses.add(edge.marketInfo.longTokenAddress.toBase58());
    visitedTokenAddresses.add(edge.marketInfo.shortTokenAddress.toBase58());

    const nextEdges = graph.abjacencyList[edge.to];

    if (!nextEdges?.length) return;

    for (const nextEdge of nextEdges) {
      dfs(nextEdge, depth + 1);
    }
  }

  return Array.from(visitedTokenAddresses);
}
