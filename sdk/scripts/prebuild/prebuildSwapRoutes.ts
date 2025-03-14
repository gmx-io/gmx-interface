import fs from "fs";
import { resolve } from "path";

import { MARKETS } from "configs/markets";
import { getSwapRoutes } from "swap/buildSwapRoutes";
import type { SwapRoutes } from "types/trade";

type ChainsSwapRoutes = Record<number, SwapRoutes>;

export function prebuildSwapRoutes(outputDir: string) {
  const chainSwapRoutes: ChainsSwapRoutes = {};

  for (const chainId in MARKETS) {
    const markets = MARKETS[chainId];
    const chainGraph = getSwapRoutes(markets);

    chainSwapRoutes[chainId] = chainGraph.nonRepeatingTokensSwapRoutes;
  }

  fs.writeFileSync(resolve(outputDir, `swapRoutes.json`), JSON.stringify(chainSwapRoutes, null, 2));
}
