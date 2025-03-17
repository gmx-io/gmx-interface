import fs from "fs";
import { resolve } from "path";

import { MARKETS } from "configs/markets";
import { getSwapPaths } from "swap/buildSwapRoutes";
import type { SwapPaths } from "types/trade";

type ChainsSwapPaths = Record<number, SwapPaths>;

export function prebuildSwapPaths(outputDir: string) {
  const chainSwapPaths: ChainsSwapPaths = {};

  for (const chainId in MARKETS) {
    const markets = MARKETS[chainId];
    const chainGraph = getSwapPaths(markets);

    chainSwapPaths[chainId] = chainGraph;
  }

  fs.writeFileSync(resolve(outputDir, `swapPaths.json`), JSON.stringify(chainSwapPaths, null, 2));
}
