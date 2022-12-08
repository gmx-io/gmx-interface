import { MarketConfig } from "domain/synthetics/markets/types";
import { AVALANCHE_FUJI, SUPPORTED_CHAIN_IDS } from "./chains";

const MARKETS: { [chainId: number]: MarketConfig[] } = {
  [AVALANCHE_FUJI]: [
    {
      marketTokenAddress: "0xFaD1967a5216271b8c60F399D6dF391be99E53f4",
      perp: "USD",
    },
    {
      marketTokenAddress: "0x8952fA89904eDE63E7Fe0dB4fA6b3CE4b7a74F0D",
      perp: "USD",
    },
    {
      marketTokenAddress: "0x030BbB36a91d530efFB46e15093d956b7c5D205e",
      perp: "USD",
    },
  ],
};

const MARKETS_MAP: { [chainId: number]: { [marketAddress: string]: MarketConfig } } = {};

for (const chainId of SUPPORTED_CHAIN_IDS) {
  if (!(chainId in MARKETS)) continue;

  MARKETS_MAP[chainId] = MARKETS[chainId].reduce((acc, conf) => {
    acc[conf.marketTokenAddress] = conf;

    return acc;
  }, {} as { [marketAddress: string]: MarketConfig });
}

export function getMarketConfig(chainId: number, marketTokenAddress?: string): MarketConfig | undefined {
  if (!marketTokenAddress) return undefined;

  return MARKETS_MAP[chainId][marketTokenAddress];
}
