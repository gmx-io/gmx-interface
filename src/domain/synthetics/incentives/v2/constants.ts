import { ARBITRUM } from "config/chains";

export const ES_GMX_DECIMALS = 18;
export const GT_DECIMALS = 7;

export function isIncentivesEnabled(chainId: number) {
  return chainId === ARBITRUM;
}
