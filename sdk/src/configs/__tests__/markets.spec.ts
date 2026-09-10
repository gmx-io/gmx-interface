import { withRetry } from "viem";
import { describe, expect, it } from "vitest";

import { ARBITRUM, AVALANCHE, CONTRACTS_CHAIN_IDS_DEV } from "configs/chains";
import { MARKETS } from "configs/markets";
import { getOracleKeeperUrl } from "configs/oracleKeeper";

type KeeperMarket = {
  marketToken: string;
  indexToken: string;
  longToken: string;
  shortToken: string;
};

const SKIPPED_KEEPER_MARKETS: Partial<Record<number, Set<string>>> = {
  [ARBITRUM]: new Set([
    // OM/USD [WBTC-USDC]
    "0x89EB78679921499632fF16B1be3ee48295cfCD91",
    // WELL/USD [WETH-USDC]
    "0x2347EbB8645Cc2EA0Ba92D1EC59704031F2fCCf4",
    // AI16Z/USD [WBTC.e-USDC]
    "0xD60f1BA6a76979eFfE706BF090372Ebc0A5bF169",
    // SWAP-ONLY [USDC-DAI]
    "0xe2fEDb9e6139a182B98e7C2688ccFa3e9A53c665",
    // IP/USD [WBTC-USDC]
    "0x5ff52BE1968107D7886a8E9A64874A45c8F5D96a",
    // TON/USD [WETH-USDC]
    "0x15c6eBD4175ffF9EE3c2615c556fCf62D2d9499c",
    // MELANIA/USD [WETH-USDC]
    "0x12fD1A4BdB96219E637180Ff5293409502b2951D",
    // MKR/USD [WETH-USDC]
    "0x2aE5c5Cd4843cf588AA8D1289894318130acc823",
    // PI/USD [WBTC-USDC]
    "0x39AC3C494950A4363D739201BA5A0861265C9ae5",
    // KTA/USD [WETH-USDC]
    "0x970b730b5dD18de53A230eE8F4af088dBC3a6F8d",
  ]),
  [AVALANCHE]: new Set([
    // SWAP-ONLY [USDC-DAI.e]
    "0xDf8c9BD26e7C1A331902758Eb013548B2D22ab3b",
  ]),
};

const getKeeperMarkets = async (chainId: number): Promise<{ markets: KeeperMarket[] }> => {
  const res = await fetch(`${getOracleKeeperUrl(chainId)}/markets`);
  const data = (await res.json()) as {
    markets: KeeperMarket[];
  };

  if (!data || !data.markets || data.markets.length === 0) throw Error("No markets in response");

  return data;
};

describe("markets config", () => {
  CONTRACTS_CHAIN_IDS_DEV.forEach(async (chainId) => {
    it(`markets should be consistent with keeper for ${chainId}`, async () => {
      const keeperMarkets = await withRetry(() => getKeeperMarkets(chainId), {
        retryCount: 2,
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
