import type { MarketConfig } from "configs/markets";

type FromTokenAddress = string;
type ToTokenAddress = string;
type MarketAddress = string;

export type MarketsGraph = {
  [from: FromTokenAddress]: {
    [to: ToTokenAddress]: MarketAddress[];
  };
};

export function buildMarketsAdjacencyGraph(marketsMap: Record<string, MarketConfig>): MarketsGraph {
  const graph: MarketsGraph = {};

  for (const marketTokenAddress in marketsMap) {
    const { longTokenAddress, shortTokenAddress } = marketsMap[marketTokenAddress];

    const isSameCollaterals = longTokenAddress === shortTokenAddress;

    if (isSameCollaterals) {
      continue;
    }

    graph[longTokenAddress] = graph[longTokenAddress] || {};
    graph[longTokenAddress][shortTokenAddress] = graph[longTokenAddress][shortTokenAddress] || [];
    graph[longTokenAddress][shortTokenAddress].push(marketTokenAddress);

    graph[shortTokenAddress] = graph[shortTokenAddress] || {};
    graph[shortTokenAddress][longTokenAddress] = graph[shortTokenAddress][longTokenAddress] || [];
    graph[shortTokenAddress][longTokenAddress].push(marketTokenAddress);
  }

  return graph;
}
