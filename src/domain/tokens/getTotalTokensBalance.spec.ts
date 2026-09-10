import { describe, expect, it } from "vitest";

import type { AnyChainId } from "config/chains";
import type { MultichainMarketTokenBalances, MultichainMarketTokensBalances } from "domain/multichain/types";
import type { TokenData, TokensData } from "domain/tokens";
import { ARBITRUM } from "sdk/configs/chainIds";
import { GMX_ACCOUNT_PSEUDO_CHAIN_ID } from "sdk/configs/chains";

import { getTotalTokensBalance } from "./getTotalTokensBalance";

const GM_A = "0x00000000000000000000000000000000000000a1";
const GM_B = "0x00000000000000000000000000000000000000b2";
const GLV_C = "0x00000000000000000000000000000000000000c3";

function token(address: string, symbol: string): TokenData {
  return { address, symbol, decimals: 18 } as TokenData;
}

const TOKENS_DATA: TokensData = {
  [GM_A]: token(GM_A, "GM"),
  [GM_B]: token(GM_B, "GM"),
  [GLV_C]: token(GLV_C, "GLV"),
};

function multichainBalances(balancesByChain: Record<number, bigint>): MultichainMarketTokenBalances {
  const result: MultichainMarketTokenBalances = { totalBalance: 0n, totalBalanceUsd: 0n, balances: {} };

  for (const [chainId, balance] of Object.entries(balancesByChain)) {
    result.balances[Number(chainId) as AnyChainId] = { balance, balanceUsd: balance * 2n };
    result.totalBalance += balance;
    result.totalBalanceUsd += balance * 2n;
  }

  return result;
}

describe("getTotalTokensBalance", () => {
  it("returns an empty total without tokens data", () => {
    expect(
      getTotalTokensBalance({
        tokensData: undefined,
        tokenSymbols: ["GM"],
        multichainMarketTokensBalances: undefined,
        chainId: ARBITRUM,
      })
    ).toEqual({ balance: 0n, balanceUsd: 0n, hasBalanceOutsideWallet: false });
  });

  it("sums the balances of the requested symbols only", () => {
    const balances: MultichainMarketTokensBalances = {
      [GM_A]: multichainBalances({ [ARBITRUM]: 3n }),
      [GM_B]: multichainBalances({ [ARBITRUM]: 4n }),
      [GLV_C]: multichainBalances({ [ARBITRUM]: 100n }),
    };

    expect(
      getTotalTokensBalance({
        tokensData: TOKENS_DATA,
        tokenSymbols: ["GM"],
        multichainMarketTokensBalances: balances,
        chainId: ARBITRUM,
      })
    ).toEqual({ balance: 7n, balanceUsd: 14n, hasBalanceOutsideWallet: false });
  });

  it("flags a balance outside the wallet only for the requested symbols", () => {
    const balances: MultichainMarketTokensBalances = {
      [GM_A]: multichainBalances({ [ARBITRUM]: 3n }),
      [GM_B]: multichainBalances({ [ARBITRUM]: 4n }),
      [GLV_C]: multichainBalances({ [ARBITRUM]: 0n, [GMX_ACCOUNT_PSEUDO_CHAIN_ID]: 100n }),
    };

    const gm = getTotalTokensBalance({
      tokensData: TOKENS_DATA,
      tokenSymbols: ["GM"],
      multichainMarketTokensBalances: balances,
      chainId: ARBITRUM,
    });
    const glv = getTotalTokensBalance({
      tokensData: TOKENS_DATA,
      tokenSymbols: ["GLV"],
      multichainMarketTokensBalances: balances,
      chainId: ARBITRUM,
    });

    expect(gm.hasBalanceOutsideWallet).toBe(false);
    expect(glv).toEqual({ balance: 100n, balanceUsd: 200n, hasBalanceOutsideWallet: true });
  });

  it("flags a balance outside the wallet when any requested token holds part of it there", () => {
    const balances: MultichainMarketTokensBalances = {
      [GM_A]: multichainBalances({ [ARBITRUM]: 3n }),
      [GM_B]: multichainBalances({ [ARBITRUM]: 4n, [GMX_ACCOUNT_PSEUDO_CHAIN_ID]: 1n }),
    };

    expect(
      getTotalTokensBalance({
        tokensData: TOKENS_DATA,
        tokenSymbols: ["GM"],
        multichainMarketTokensBalances: balances,
        chainId: ARBITRUM,
      })
    ).toEqual({ balance: 8n, balanceUsd: 16n, hasBalanceOutsideWallet: true });
  });
});
