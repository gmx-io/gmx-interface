import { describe, expect, it } from "vitest";

import type { AnyChainId } from "config/chains";
import type { MultichainMarketTokenBalances } from "domain/multichain/types";
import { ARBITRUM, SOURCE_BASE_MAINNET } from "sdk/configs/chainIds";
import { GMX_ACCOUNT_PSEUDO_CHAIN_ID } from "sdk/configs/chains";

import { getHasBalanceOutsideWallet } from "./getHasBalanceOutsideWallet";

function multichainBalances(balancesByChain: Record<number, bigint>): MultichainMarketTokenBalances {
  const result: MultichainMarketTokenBalances = { totalBalance: 0n, totalBalanceUsd: 0n, balances: {} };

  for (const [chainId, balance] of Object.entries(balancesByChain)) {
    result.balances[Number(chainId) as AnyChainId] = { balance, balanceUsd: balance };
    result.totalBalance += balance;
    result.totalBalanceUsd += balance;
  }

  return result;
}

describe("getHasBalanceOutsideWallet", () => {
  it("is false without balances data", () => {
    expect(getHasBalanceOutsideWallet(undefined, ARBITRUM)).toBe(false);
  });

  it("is false for an empty balance", () => {
    const balances = multichainBalances({ [ARBITRUM]: 0n, [GMX_ACCOUNT_PSEUDO_CHAIN_ID]: 0n });

    expect(getHasBalanceOutsideWallet(balances, ARBITRUM)).toBe(false);
  });

  it("is false when the whole balance sits in the settlement chain wallet", () => {
    const balances = multichainBalances({ [ARBITRUM]: 5n, [GMX_ACCOUNT_PSEUDO_CHAIN_ID]: 0n });

    expect(getHasBalanceOutsideWallet(balances, ARBITRUM)).toBe(false);
  });

  it("is true when the whole balance sits in the GMX Account", () => {
    const balances = multichainBalances({ [ARBITRUM]: 0n, [GMX_ACCOUNT_PSEUDO_CHAIN_ID]: 5n });

    expect(getHasBalanceOutsideWallet(balances, ARBITRUM)).toBe(true);
  });

  it("is true when part of the balance sits on a source chain", () => {
    const balances = multichainBalances({
      [ARBITRUM]: 5n,
      [GMX_ACCOUNT_PSEUDO_CHAIN_ID]: 0n,
      [SOURCE_BASE_MAINNET]: 1n,
    });

    expect(getHasBalanceOutsideWallet(balances, ARBITRUM)).toBe(true);
  });
});
