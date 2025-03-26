import { withRetry, zeroAddress } from "viem";
import { describe, it, expect } from "vitest";

import { ARBITRUM, AVALANCHE, SUPPORTED_CHAIN_IDS } from "configs/chains";
import { getOracleKeeperUrl } from "configs/oracleKeeper";
import { TOKENS } from "configs/tokens";

type KeeperToken = {
  symbol: string;
  address: string;
  decimals: number;
  synthetic?: boolean;
};

const getKeeperTokens = async (chainId: number): Promise<{ tokens: KeeperToken[] }> => {
  const res = await fetch(`${getOracleKeeperUrl(chainId, 0)}/tokens`);
  const data = (await res.json()) as {
    tokens: KeeperToken[];
  };

  if (!data || !data.tokens || data.tokens.length === 0) throw Error("No tokens in response");

  return data;
};

const IGNORED_TOKENS = ["ESGMX", "GLP", "GM", "GLV"];

const getIgnoredTokensByChain = (chainId: number) => {
  return IGNORED_TOKENS.concat(
    {
      [ARBITRUM]: ["FRAX", "MIM"],
      [AVALANCHE]: ["MIM", "WBTC"],
    }[chainId] ?? []
  );
};

describe("tokens config", () => {
  SUPPORTED_CHAIN_IDS.forEach(async (chainId) => {
    it(`tokens should be consistent with keeper for ${chainId}`, async () => {
      const keeperTokens = await withRetry(() => getKeeperTokens(chainId), {
        retryCount: 2,
      });

      TOKENS[chainId]
        .filter((token) => token.address !== zeroAddress)
        .filter((token) => !getIgnoredTokensByChain(chainId).includes(token.symbol))
        .forEach((token) => {
          const keeperToken = keeperTokens.tokens.find((t) => t.address === token.address);

          expect(keeperToken).toBeDefined();
          expect(keeperToken?.address).toBe(token.address);
          expect(keeperToken?.decimals).toBe(token.decimals);
          expect(Boolean(keeperToken?.synthetic)).toBe(Boolean(token.isSynthetic));
        });
    });
  });
});
