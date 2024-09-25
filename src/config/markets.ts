import mapValues from "lodash/mapValues";

import { isDevelopment } from "config/env";
import { ARBITRUM, ARBITRUM_GOERLI, AVALANCHE, AVALANCHE_FUJI } from "./chains";

import { MARKETS, DEFAULT_LISTING } from "./static/markets";
export * from "./static/markets";

export const ENOUGH_DAYS_SINCE_LISTING_FOR_APY = 8;

export const MARKETS_INDEX: Record<number, Record<string, boolean>> = mapValues(MARKETS, (markets) =>
  mapValues(markets, (market) => Boolean(market.enabled))
);

export function isMarketEnabled(chainId: number, marketAddress: string) {
  if (isDevelopment()) return true;

  return MARKETS_INDEX[chainId]?.[marketAddress] ?? false;
}

/**
 * @returns Date when token was listed on the platform. If the date was not specified in config, returns 01 Jan 1970.
 */
export function getMarketListingDate(chainId: number, marketAddress: string): Date {
  const market = MARKETS[chainId]?.[marketAddress];

  if (!market?.listingDate) {
    return DEFAULT_LISTING;
  }

  return market.listingDate;
}

export const GLV_MARKETS: {
  [chainId: number]: Record<string, { name: string | undefined; subtitle: string; shortening: string }>;
} = {
  [ARBITRUM]: {
    "0x528A5bac7E746C9A509A1f4F6dF58A03d44279F9": {
      name: undefined,
      subtitle: "GMX Liquidity Vault",
      shortening: "GLV",
    },
    "0xdF03EEd325b82bC1d4Db8b49c30ecc9E05104b96": {
      name: undefined,
      subtitle: "GMX Liquidity Vault",
      shortening: "GLV",
    },
  },
  [ARBITRUM_GOERLI]: {},
  [AVALANCHE]: {},
  [AVALANCHE_FUJI]: {
    "0xc519a5b8e5e93D3ec85D62231C1681c44952689d": {
      name: "High Caps",
      subtitle: "Core ETH Markets Vault",
      shortening: "HC",
    },
  },
};
