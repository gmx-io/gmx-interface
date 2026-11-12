import { ARBITRUM, AVALANCHE } from "config/chains";

/**
 * GMX v1 totals, frozen from the gmx-arbitrum-stats / gmx-avalanche-stats subgraphs on 2026-11-09
 * (Arbitrum block 522626546, Avalanche block 99836299); those subgraphs are no longer queried.
 *
 */

export const V1_TOTAL_FEES_USD: Record<typeof ARBITRUM | typeof AVALANCHE, bigint> = {
  [ARBITRUM]: 231425003056608648595487223300654011019n,
  [AVALANCHE]: 72321145067626682736034096078051493049n,
};

export const V1_UNIQUE_USERS: Record<typeof ARBITRUM | typeof AVALANCHE, number> = {
  [ARBITRUM]: 368755,
  [AVALANCHE]: 66206,
};
