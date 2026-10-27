import { withRetry } from "viem";
import { describe, expect, it } from "vitest";

import { CONTRACTS_CHAIN_IDS_DEV, isTestnetChain } from "configs/chains";
import { MARKETS } from "configs/markets";
import { getOracleKeeperUrl } from "configs/oracleKeeper";

type KeeperMarket = {
  marketToken: string;
  indexToken: string;
  longToken: string;
  shortToken: string;
};

const SKIPPED_KEEPER_MARKETS: Partial<Record<number, Set<string>>> = {};

const getKeeperMarkets = async (chainId: number): Promise<{ markets: KeeperMarket[] }> => {
  const res = await fetch(`${getOracleKeeperUrl(chainId)}/markets`);
  if (!res.ok) throw Error(`Keeper responded with ${res.status}`);
  const data = (await res.json()) as {
    markets: KeeperMarket[];
  };

  if (!data || !data.markets || data.markets.length === 0) throw Error("No markets in response");

  return data;
};

describe("markets config", () => {
  CONTRACTS_CHAIN_IDS_DEV.forEach(async (chainId) => {
    it(`markets should be consistent with keeper for ${chainId}`, async ({ skip }) => {
      const keeperMarkets = await withRetry(() => getKeeperMarkets(chainId), {
        retryCount: 2,
      }).catch((error: Error) => {
        // A testnet keeper outage is not config drift; mainnet keepers must answer
        if (isTestnetChain(chainId)) skip(`Keeper is unavailable: ${error.message}`);
        throw error;
      });

      Object.entries(MARKETS[chainId]).forEach(([marketAddress, market]) => {
        if (SKIPPED_KEEPER_MARKETS[chainId]?.has(marketAddress)) {
          return;
        }

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
