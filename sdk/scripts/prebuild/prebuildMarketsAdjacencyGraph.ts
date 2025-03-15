import fs from "fs";
import { resolve } from "path";

import { MARKETS } from "configs/markets";
import { buildMarketsAdjacencyGraph } from "swap/buildMarketsAdjacencyGraph";
import type { MarketsGraph } from "swap/buildMarketsAdjacencyGraph";

type ChainsMarketsGraph = Record<number, MarketsGraph>;

export function prebuildMarketsAdjacencyGraph(outputDir: string) {
  const chainMarketsGraph: ChainsMarketsGraph = {};

  for (const chainId in MARKETS) {
    const markets = MARKETS[chainId];
    const chainGraph = buildMarketsAdjacencyGraph(markets);

    chainMarketsGraph[chainId] = chainGraph;
  }

  fs.writeFileSync(resolve(outputDir, `marketsAdjacencyGraph.json`), JSON.stringify(chainMarketsGraph, null, 2));
}
