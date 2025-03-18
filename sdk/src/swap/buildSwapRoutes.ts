import type { SwapPaths } from "types/trade";
import type { MarketsGraph } from "./buildMarketsAdjacencyGraph";
import { MAX_EDGE_PATH_LENGTH } from "./constants";

export function findSwapPathsBetweenTokens(graph: MarketsGraph): SwapPaths {
  const swapRoutes: SwapPaths = {};

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
        nodePath: string[];
      };

      const queue: SearchHead[] = [
        {
          node: tokenAAddress,
          nodePath: [tokenAAddress],
        },
      ];

      while (queue.length > 0) {
        const { node, nodePath } = queue.shift()!;

        if (nodePath.length >= 3) {
          const lastNode = nodePath[nodePath.length - 1];
          const secondLastNode = nodePath[nodePath.length - 2];
          const thirdLastNode = nodePath[nodePath.length - 3];
          if (lastNode === thirdLastNode) {
            const lastEdge = graph[lastNode]?.[secondLastNode];
            if (lastEdge && lastEdge.length === 1) {
              continue;
            }
          }
        }

        if (node === tokenBAddress) {
          const intermediateNodePath = nodePath.slice(1, -1);
          const key = intermediateNodePath.join(",");
          if (!result[key]) {
            result[key] = intermediateNodePath;
          }
        }

        if (nodePath.length >= MAX_EDGE_PATH_LENGTH + 1) {
          continue;
        }

        for (const sibling in graph[node]) {
          queue.push({ node: sibling, nodePath: [...nodePath, sibling] });
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
