import mapValues from "lodash/mapValues";

import { isDevelopment } from "config/env";
import { SETTLEMENT_CHAINS } from "config/multichain";
import { fixTokenSymbolFromMarketLabel } from "sdk/configs/markets";
import { getTokenBySymbol } from "sdk/configs/tokens";

import { ARBITRUM, ARBITRUM_SEPOLIA, AVALANCHE, AVALANCHE_FUJI, ContractsChainId, SettlementChainId } from "./chains";
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
  [chainId: number]: Record<
    string,
    {
      name: string | undefined;
      subtitle: string;
      shortening: string;
      marketTokenAddress: string;
      longTokenAddress: string;
      shortTokenAddress: string;
    }
  >;
} = {
  [ARBITRUM]: {
    "0x528A5bac7E746C9A509A1f4F6dF58A03d44279F9": {
      name: undefined,
      subtitle: "GMX Liquidity Vault",
      shortening: "GLV",
      marketTokenAddress: "0x528A5bac7E746C9A509A1f4F6dF58A03d44279F9",
      longTokenAddress: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f",
      shortTokenAddress: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    },
    "0xdF03EEd325b82bC1d4Db8b49c30ecc9E05104b96": {
      name: undefined,
      subtitle: "GMX Liquidity Vault",
      shortening: "GLV",
      marketTokenAddress: "0xdF03EEd325b82bC1d4Db8b49c30ecc9E05104b96",
      longTokenAddress: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
      shortTokenAddress: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    },
  },
  [AVALANCHE]: {
    "0x901eE57f7118A7be56ac079cbCDa7F22663A3874": {
      name: undefined,
      subtitle: "GMX Liquidity Vault",
      shortening: "GLV",
      marketTokenAddress: "0x901eE57f7118A7be56ac079cbCDa7F22663A3874",
      longTokenAddress: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
      shortTokenAddress: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
    },
  },
  [AVALANCHE_FUJI]: {
    "0xc519a5b8e5e93D3ec85D62231C1681c44952689d": {
      name: "High Caps",
      subtitle: "Core ETH Markets Vault",
      shortening: "HC",
      marketTokenAddress: "0xc519a5b8e5e93D3ec85D62231C1681c44952689d",
      longTokenAddress: "0x82F0b3695Ed2324e55bbD9A9554cB4192EC3a514",
      shortTokenAddress: "0x3321Fd36aEaB0d5CdfD26f4A3A93E2D2aAcCB99f",
    },
  },
  [ARBITRUM_SEPOLIA]: {
    "0xAb3567e55c205c62B141967145F37b7695a9F854": {
      name: "High Caps",
      subtitle: "Core ETH Markets Vault",
      shortening: "HC",
      marketTokenAddress: "0xAb3567e55c205c62B141967145F37b7695a9F854",
      longTokenAddress: "0x980B62Da83eFf3D4576C647993b0c1D7faf17c73",
      shortTokenAddress: "0x3253a335E7bFfB4790Aa4C25C4250d206E9b9773",
    },
  },
};

export type GlvLabel = `GLV [${string}-${string}]`;

export function getGlvByLabel(chainId: ContractsChainId, label: GlvLabel) {
  const glvMarkets = GLV_MARKETS[chainId];

  if (!glvMarkets) {
    throw new Error(`GLV markets not found for chainId ${chainId}`);
  }

  const labelMatch = label.match(/^GLV\s*\[([^\]]+)\]$/i);

  if (!labelMatch) {
    throw new Error(`Invalid GLV label ${label}`);
  }

  const [, tokensPart] = labelMatch;
  const separatorIndex = tokensPart.search(/[-/]/);

  if (separatorIndex === -1) {
    throw new Error(`Invalid GLV label ${label}`);
  }

  const longSymbolRaw = tokensPart.slice(0, separatorIndex).trim();
  const shortSymbolRaw = tokensPart.slice(separatorIndex + 1).trim();

  if (!longSymbolRaw || !shortSymbolRaw) {
    throw new Error(`Invalid GLV label ${label}`);
  }

  const longToken = getTokenBySymbol(chainId, fixTokenSymbolFromMarketLabel(chainId, longSymbolRaw), {
    isSynthetic: false,
  });
  const shortToken = getTokenBySymbol(chainId, fixTokenSymbolFromMarketLabel(chainId, shortSymbolRaw), {
    isSynthetic: false,
  });

  if (!longToken || !shortToken) {
    throw new Error(`Invalid GLV label ${label}`);
  }

  const glv = Object.values(glvMarkets).find(
    (glv) => glv.longTokenAddress === longToken.address && glv.shortTokenAddress === shortToken.address
  );

  if (!glv) {
    throw new Error(`GLV ${label} not found`);
  }

  return glv;
}

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
