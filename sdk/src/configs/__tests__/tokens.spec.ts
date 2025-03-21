import { describe, it, expect } from "vitest";
import { zeroAddress } from "viem";

import { SUPPORTED_CHAIN_IDS_DEV } from "configs/chains";
import { TOKENS } from "configs/tokens";

import { getOracleKeeperUrlByChain } from "./oracleKeeperUrlByChain";

type KeeperToken = {
  symbol: string;
  address: string;
  decimals: number;
  synthetic?: boolean;
};

const getKeeperTokens = async (chainId: number): Promise<{ tokens: KeeperToken[] }> => {
  const res = await fetch(`${getOracleKeeperUrlByChain(chainId)}/tokens`);
  const data = (await res.json()) as {
    tokens: KeeperToken[];
  };

  return data;
};

const FILTERED_TOKENS = ["ESGMX", "GLP", "GM", "GLV"];

describe("tokens config", () => {
  SUPPORTED_CHAIN_IDS_DEV.forEach(async (chainId) => {
    describe(`tokens should be consistent with keeper for ${chainId}`, async () => {
      const keeperTokens = await getKeeperTokens(chainId);

      TOKENS[chainId]
        .filter((token) => token.address !== zeroAddress)
        .filter((token) => !FILTERED_TOKENS.includes(token.symbol))
        .forEach(async (token) => {
          const keeperToken = keeperTokens.tokens.find((t) => t.address === token.address);
          it(`token ${token.symbol} should be defined`, () => {
            expect(keeperToken).toBeDefined();
            expect(keeperToken?.address).toBe(token.address);
            expect(keeperToken?.decimals).toBe(token.decimals);
            expect(Boolean(keeperToken?.synthetic)).toBe(Boolean(token.isSynthetic));
          });
        });
    });
  });
});
