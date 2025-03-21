import { describe, it, expect } from "vitest";

import { SUPPORTED_CHAIN_IDS_DEV } from "configs/chains";
import { MARKETS } from "configs/markets";

import { getOracleKeeperUrlByChain } from "./oracleKeeperUrlByChain";

type KeeperMarket = {
  marketToken: string;
  indexToken: string;
  longToken: string;
  shortToken: string;
};

const getKeeperMarkets = async (
  chainId: number
): Promise<{ markets: KeeperMarket[] }> => {
  const res = await fetch(`${getOracleKeeperUrlByChain(chainId)}/markets`);
  const data = (await res.json()) as {
    markets: KeeperMarket[];
  };

  return data;
};

describe("markets config", () => {
  SUPPORTED_CHAIN_IDS_DEV.forEach(async (chainId) => {
    it(`markets should be consistent with keeper for ${chainId}`, async () => {
      const keeperMarkets = await getKeeperMarkets(chainId);

      Object.entries(MARKETS[chainId]).forEach(async ([marketAddress, market]) => {
        expect(marketAddress).toBe(market.marketTokenAddress);

        const keeperMarket = keeperMarkets.markets.find((m) => m.marketToken === marketAddress);
        
        expect(keeperMarket).toBeDefined();
        expect(keeperMarket?.indexToken).toBe(market.indexTokenAddress);
        expect(keeperMarket?.longToken).toBe(market.longTokenAddress);
        expect(keeperMarket?.shortToken).toBe(market.shortTokenAddress);
        expect(keeperMarket?.marketToken).toBe(marketAddress);
      });
    });
  });
});
