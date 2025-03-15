import type { MarketConfig } from "configs/markets";
import type { SwapRoutes } from "types/trade";
import { MarketsGraph, buildMarketsAdjacencyGraph } from "./buildMarketsAdjacencyGraph";
import { MAX_EDGE_PATH_LENGTH } from "./constants";

export function getSwapRoutes(marketsMap: Record<string, MarketConfig>): SwapRoutes {
  const graph = buildMarketsAdjacencyGraph(marketsMap);

  const swapRoutes = findSwapPathsBetweenTokens(graph);

  return swapRoutes;
}

export function findSwapPathsBetweenTokens(graph: MarketsGraph): SwapRoutes {
  const swapRoutes: SwapRoutes = {};

  const allTokens = Array.from(new Set(Object.keys(graph).flatMap((token) => Object.keys(graph[token]).concat(token))));

  for (const tokenAAddress of allTokens) {
    swapRoutes[tokenAAddress] = {};

    let empty = true;
    for (const tokenBAddress of allTokens) {
      if (tokenAAddress === tokenBAddress || swapRoutes[tokenBAddress]?.[tokenAAddress]) {
        continue;
      }

      const result: Record<string, string[]> = {};

      type SearchHead = {
        node: string;
        edgePath: string[];
        nodePath: string[];
      };

      const queue: SearchHead[] = [
        {
          node: tokenAAddress,
          edgePath: [],
          nodePath: [],
        },
      ];

      while (queue.length > 0) {
        const { node, edgePath, nodePath } = queue.shift()!;

        const areTwoLastEdgesSame =
          edgePath.length >= 2 && edgePath[edgePath.length - 1] === edgePath[edgePath.length - 2];
        if (areTwoLastEdgesSame) {
          continue;
        }

        if (node === tokenBAddress) {
          const intermediateNodePath = nodePath.slice(0, -1);
          // trim last node from nodePath
          const key = intermediateNodePath.join(",");
          if (!result[key]) {
            result[key] = intermediateNodePath;
          }
        }

        if (edgePath.length >= MAX_EDGE_PATH_LENGTH) {
          continue;
        }

        for (const sibling in graph[node]) {
          const edges = graph[node][sibling];

          for (const edge of edges) {
            queue.push({ node: sibling, edgePath: [...edgePath, edge], nodePath: [...nodePath, sibling] });
          }
        }
      }

      if (Object.keys(result).length > 0) {
        empty = false;
        swapRoutes[tokenAAddress][tokenBAddress] = Object.values(result);
      }
    }

    if (empty) {
      delete swapRoutes[tokenAAddress];
    }
  }

  return swapRoutes;
}
