import type { MarketsGraph } from "./buildMarketsAdjacencyGraph";
import { MAX_EDGE_PATH_LENGTH } from "./constants";
import { objectKeysDeep } from "utils/objects";

export function findReachableTokens(graph: MarketsGraph): Record<string, string[]> {
  const reachableTokens: Record<string, string[]> = {};

  const allTokens = objectKeysDeep(graph, 1).sort();

  for (const startToken of allTokens) {
    type TokenSearchState = {
      currentToken: string;
      pathLength: number;
    };

    const searchQueue: TokenSearchState[] = [
      {
        currentToken: startToken,
        pathLength: 0,
      },
    ];
    const visitedTokens = new Set<string>();

    while (searchQueue.length > 0) {
      const { currentToken, pathLength } = searchQueue.shift()!;

      if (visitedTokens.has(currentToken)) {
        continue;
      }

      visitedTokens.add(currentToken);

      if (pathLength >= MAX_EDGE_PATH_LENGTH) {
        continue;
      }

      for (const nextToken in graph[currentToken]) {
        searchQueue.push({
          currentToken: nextToken,
          pathLength: pathLength + 1,
        });
      }
    }

    visitedTokens.delete(startToken);

    reachableTokens[startToken] = Array.from(visitedTokens);
  }

  return reachableTokens;
}
