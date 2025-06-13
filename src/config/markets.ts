import mapValues from "lodash/mapValues";

import { isDevelopment } from "config/env";
import { SETTLEMENT_CHAINS } from "domain/multichain/config";

import { ARBITRUM, AVALANCHE, AVALANCHE_FUJI, SettlementChainId } from "./chains";
import { MARKETS } from "./static/markets";

export * from "./static/markets";

export const ENOUGH_DAYS_SINCE_LISTING_FOR_APY = 8;

export const MARKETS_INDEX: Record<number, Record<string, boolean>> = mapValues(MARKETS, (markets) =>
  mapValues(markets, (market) => Boolean(market.enabled))
);

export function isMarketEnabled(chainId: number, marketAddress: string) {
  if (isDevelopment()) return true;

  return MARKETS_INDEX[chainId]?.[marketAddress] ?? false;
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
  [AVALANCHE]: {
    "0x901eE57f7118A7be56ac079cbCDa7F22663A3874": {
      name: undefined,
      subtitle: "GMX Liquidity Vault",
      shortening: "GLV",
    },
  },
  [AVALANCHE_FUJI]: {
    "0xc519a5b8e5e93D3ec85D62231C1681c44952689d": {
      name: "High Caps",
      subtitle: "Core ETH Markets Vault",
      shortening: "HC",
    },
  },
};

export function getMarketUiConfig(chainId: number, marketAddress: string) {
  return MARKETS[chainId]?.[marketAddress];
}

const SETTLEMENT_CHAIN_TRADABLE_ASSETS_MAP: Record<SettlementChainId, string[]> = {} as any;

for (const chainId of SETTLEMENT_CHAINS) {
  const tradableTokenAddressesSet = new Set<string>();

  for (const marketAddress in MARKETS[chainId]) {
    const marketConfig = MARKETS[chainId][marketAddress];

    tradableTokenAddressesSet.add(marketConfig.longTokenAddress);
    tradableTokenAddressesSet.add(marketConfig.shortTokenAddress);
  }

  SETTLEMENT_CHAIN_TRADABLE_ASSETS_MAP[chainId] = Array.from(tradableTokenAddressesSet);
}

export function getSettlementChainTradableTokenAddresses(chainId: SettlementChainId) {
  return SETTLEMENT_CHAIN_TRADABLE_ASSETS_MAP[chainId];
}
