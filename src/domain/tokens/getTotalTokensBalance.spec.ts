import { describe, expect, it } from "vitest";

import type { AnyChainId } from "config/chains";
import { USD_DECIMALS } from "config/factors";
import type { MultichainMarketTokenBalances, MultichainMarketTokensBalances } from "domain/multichain/types";
import type { TokenData, TokensData } from "domain/tokens";
import { numberToBigint } from "lib/numbers";
import { ARBITRUM } from "sdk/configs/chainIds";
import { GMX_ACCOUNT_PSEUDO_CHAIN_ID } from "sdk/configs/chains";

import { getTotalTokensBalance } from "./getTotalTokensBalance";

const GM_A = "0x00000000000000000000000000000000000000a1";
const GM_B = "0x00000000000000000000000000000000000000b2";
const GLV_C = "0x00000000000000000000000000000000000000c3";

const TOKEN_DECIMALS = 18;
const TOKEN_PRICE_USD = 2;

function token(address: string, symbol: string): TokenData {
  return { address, symbol, decimals: TOKEN_DECIMALS } as TokenData;
}

const TOKENS_DATA: TokensData = {
  [GM_A]: token(GM_A, "GM"),
  [GM_B]: token(GM_B, "GM"),
  [GLV_C]: token(GLV_C, "GLV"),
};

function amount(value: number): bigint {
  return numberToBigint(value, TOKEN_DECIMALS);
}

function usd(value: number): bigint {
  return numberToBigint(value, USD_DECIMALS);
}

function multichainBalances(balancesByChain: Record<number, number>): MultichainMarketTokenBalances {
  const result: MultichainMarketTokenBalances = { totalBalance: 0n, totalBalanceUsd: 0n, balances: {} };

  for (const [chainId, balance] of Object.entries(balancesByChain)) {
    const chainBalance = { balance: amount(balance), balanceUsd: usd(balance * TOKEN_PRICE_USD) };
    result.balances[Number(chainId) as AnyChainId] = chainBalance;
    result.totalBalance += chainBalance.balance;
    result.totalBalanceUsd += chainBalance.balanceUsd;
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
      [GM_A]: multichainBalances({ [ARBITRUM]: 3 }),
      [GM_B]: multichainBalances({ [ARBITRUM]: 4 }),
      [GLV_C]: multichainBalances({ [ARBITRUM]: 100 }),
    };

    expect(
      getTotalTokensBalance({
        tokensData: TOKENS_DATA,
        tokenSymbols: ["GM"],
        multichainMarketTokensBalances: balances,
        chainId: ARBITRUM,
      })
    ).toEqual({ balance: amount(7), balanceUsd: usd(14), hasBalanceOutsideWallet: false });
  });

  it("flags a balance outside the wallet only for the requested symbols", () => {
    const balances: MultichainMarketTokensBalances = {
      [GM_A]: multichainBalances({ [ARBITRUM]: 3 }),
      [GM_B]: multichainBalances({ [ARBITRUM]: 4 }),
      [GLV_C]: multichainBalances({ [ARBITRUM]: 0, [GMX_ACCOUNT_PSEUDO_CHAIN_ID]: 100 }),
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
    expect(glv).toEqual({ balance: amount(100), balanceUsd: usd(200), hasBalanceOutsideWallet: true });
  });

  it("flags a balance outside the wallet when any requested token holds part of it there", () => {
    const balances: MultichainMarketTokensBalances = {
      [GM_A]: multichainBalances({ [ARBITRUM]: 3 }),
      [GM_B]: multichainBalances({ [ARBITRUM]: 4, [GMX_ACCOUNT_PSEUDO_CHAIN_ID]: 1 }),
    };

    expect(
      getTotalTokensBalance({
        tokensData: TOKENS_DATA,
        tokenSymbols: ["GM"],
        multichainMarketTokensBalances: balances,
        chainId: ARBITRUM,
      })
    ).toEqual({ balance: amount(8), balanceUsd: usd(16), hasBalanceOutsideWallet: true });
  });

  it("keeps dust outside the wallet in the total without flagging it", () => {
    const dust = 0.000000637048833203;
    const balances: MultichainMarketTokensBalances = {
      [GM_A]: multichainBalances({ [ARBITRUM]: 3 }),
      [GM_B]: multichainBalances({ [ARBITRUM]: 4, [GMX_ACCOUNT_PSEUDO_CHAIN_ID]: dust }),
    };

    expect(
      getTotalTokensBalance({
        tokensData: TOKENS_DATA,
        tokenSymbols: ["GM"],
        multichainMarketTokensBalances: balances,
        chainId: ARBITRUM,
      })
    ).toEqual({
      balance: amount(7) + amount(dust),
      balanceUsd: usd(14) + usd(dust * TOKEN_PRICE_USD),
      hasBalanceOutsideWallet: false,
    });
  });
});
