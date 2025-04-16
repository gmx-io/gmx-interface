import { withRetry } from "viem";
import { describe, expect, it } from "vitest";

import { SUPPORTED_CHAIN_IDS_DEV } from "configs/chains";
import { MARKETS } from "configs/markets";
import { getOracleKeeperUrl } from "configs/oracleKeeper";

type KeeperMarket = {
  marketToken: string;
  indexToken: string;
  longToken: string;
  shortToken: string;
};

const getKeeperMarkets = async (chainId: number): Promise<{ markets: KeeperMarket[] }> => {
  const res = await fetch(`${getOracleKeeperUrl(chainId, 0)}/markets`);
  const data = (await res.json()) as {
    markets: KeeperMarket[];
  };

  if (!data || !data.markets || data.markets.length === 0) throw Error("No markets in response");

  return data;
};

describe("markets config", () => {
  SUPPORTED_CHAIN_IDS_DEV.forEach(async (chainId) => {
    it(`markets should be consistent with keeper for ${chainId}`, async () => {
      const keeperMarkets = await withRetry(() => getKeeperMarkets(chainId), {
        retryCount: 2,
      });

      Object.entries(MARKETS[chainId]).forEach(([marketAddress, market]) => {
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
