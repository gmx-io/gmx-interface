import fs from "fs";
import { resolve } from "path";

import { MARKETS } from "configs/markets";
import { buildReachableTokens } from "swap/buildReachableTokens";

type ChainsReachableTokens = Record<number, Record<string, string[]>>;

export function prebuildReachableTokens(outputDir: string) {
  const reachableTokens: ChainsReachableTokens = {};

  for (const chainId in MARKETS) {
    const markets = MARKETS[chainId];
    const chainGraph = buildReachableTokens(markets);

    reachableTokens[chainId] = chainGraph;
  }

  fs.writeFileSync(resolve(outputDir, `reachableTokens.json`), JSON.stringify(reachableTokens, null, 2));
}
