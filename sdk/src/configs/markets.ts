/*
  This files is used to pre-build data during the build process.
  Avoid adding client-side code here, as it can break the build process.
*/
import { ARBITRUM, AVALANCHE, AVALANCHE_FUJI } from "./chains";

import arbitrumMarkets from "./source/markets/arbitrum.json";
import avalancheMarkets from "./source/markets/avalanche.json";
import avalancheFujiMarkets from "./source/markets/avalanche_fuji.json";

export const SWAP_GRAPH_MAX_MARKETS_PER_TOKEN = 5;

export type MarketConfig = {
  marketTokenAddress: string;
  indexTokenAddress: string;
  longTokenAddress: string;
  shortTokenAddress: string;
};

/*
  ATTENTION
  When adding new markets, please add them also to the end of the list in ./src/configs/static/sortedMarkets.ts
*/
export const MARKETS: Record<string, Record<string, MarketConfig>> = {
  [ARBITRUM]: arbitrumMarkets,
  [AVALANCHE]: avalancheMarkets,
  [AVALANCHE_FUJI]: avalancheFujiMarkets,
};
