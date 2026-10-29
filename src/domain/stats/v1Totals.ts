import { ARBITRUM, AVALANCHE } from "config/chains";

/**
 * GMX v1 totals, frozen from the gmx-arbitrum-stats / gmx-avalanche-stats subgraphs on 2026-10-26
 * (Arbitrum block 518398678, Avalanche block 98591767); those subgraphs are no longer queried.
 *
 */

export const V1_TOTAL_FEES_USD: Record<typeof ARBITRUM | typeof AVALANCHE, bigint> = {
  [ARBITRUM]: 231424297960859356707767223300654011019n,
  [AVALANCHE]: 72321145067626682736034096078051493049n,
};

export const V1_UNIQUE_USERS: Record<typeof ARBITRUM | typeof AVALANCHE, number> = {
  [ARBITRUM]: 368717,
  [AVALANCHE]: 66168,
};
