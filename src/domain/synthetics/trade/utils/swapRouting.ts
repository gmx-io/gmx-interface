import { MarketEdge, MarketsGraph } from "sdk/types/trade";

export * from "sdk/utils/swap/swapRouting";

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
