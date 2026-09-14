import { describe, expect, it } from "vitest";

import type { AnyChainId } from "config/chains";
import { USD_DECIMALS } from "config/factors";
import { PLATFORM_TOKEN_BALANCE_THRESHOLD_USD } from "domain/multichain/getPlatformTokenBalanceAfterThreshold";
import type { MultichainMarketTokenBalances } from "domain/multichain/types";
import { numberToBigint } from "lib/numbers";
import { ARBITRUM, SOURCE_BASE_MAINNET } from "sdk/configs/chainIds";
import { GMX_ACCOUNT_PSEUDO_CHAIN_ID } from "sdk/configs/chains";

import { getHasBalanceOutsideWallet } from "./getHasBalanceOutsideWallet";

const GM_DECIMALS = 18;

type ChainBalance = { balance: bigint; balanceUsd: bigint };

function gmAtOneUsd(amount: number): ChainBalance {
  return { balance: numberToBigint(amount, GM_DECIMALS), balanceUsd: numberToBigint(amount, USD_DECIMALS) };
}

function gmWorthUsd(balanceUsd: bigint): ChainBalance {
  return { balance: numberToBigint(0.000001, GM_DECIMALS), balanceUsd };
}

function multichainBalances(balancesByChain: Record<number, ChainBalance>): MultichainMarketTokenBalances {
  const result: MultichainMarketTokenBalances = { totalBalance: 0n, totalBalanceUsd: 0n, balances: {} };

  for (const [chainId, { balance, balanceUsd }] of Object.entries(balancesByChain)) {
    result.balances[Number(chainId) as AnyChainId] = { balance, balanceUsd };
    result.totalBalance += balance;
    result.totalBalanceUsd += balanceUsd;
  }

  return result;
}

describe("getHasBalanceOutsideWallet", () => {
  it("is false without balances data", () => {
    expect(getHasBalanceOutsideWallet(undefined, ARBITRUM)).toBe(false);
  });

  it("is false for an empty balance", () => {
    const balances = multichainBalances({ [ARBITRUM]: gmAtOneUsd(0), [GMX_ACCOUNT_PSEUDO_CHAIN_ID]: gmAtOneUsd(0) });

    expect(getHasBalanceOutsideWallet(balances, ARBITRUM)).toBe(false);
  });

  it("is false when the whole balance sits in the settlement chain wallet", () => {
    const balances = multichainBalances({ [ARBITRUM]: gmAtOneUsd(5), [GMX_ACCOUNT_PSEUDO_CHAIN_ID]: gmAtOneUsd(0) });

    expect(getHasBalanceOutsideWallet(balances, ARBITRUM)).toBe(false);
  });

  it("is true when the whole balance sits in the GMX Account", () => {
    const balances = multichainBalances({ [ARBITRUM]: gmAtOneUsd(0), [GMX_ACCOUNT_PSEUDO_CHAIN_ID]: gmAtOneUsd(5) });

    expect(getHasBalanceOutsideWallet(balances, ARBITRUM)).toBe(true);
  });

  it("is true when part of the balance sits on a source chain", () => {
    const balances = multichainBalances({
      [ARBITRUM]: gmAtOneUsd(5),
      [GMX_ACCOUNT_PSEUDO_CHAIN_ID]: gmAtOneUsd(0),
      [SOURCE_BASE_MAINNET]: gmAtOneUsd(1),
    });

    expect(getHasBalanceOutsideWallet(balances, ARBITRUM)).toBe(true);
  });

  it("is false when the balance outside the wallet is dust worth less than $0.01", () => {
    const balances = multichainBalances({
      [ARBITRUM]: gmAtOneUsd(1118.008),
      [GMX_ACCOUNT_PSEUDO_CHAIN_ID]: gmAtOneUsd(0.000000637048833203),
    });

    expect(getHasBalanceOutsideWallet(balances, ARBITRUM)).toBe(false);
  });

  it("is false when only dust is left outside the wallet and the wallet is empty", () => {
    const balances = multichainBalances({
      [ARBITRUM]: gmAtOneUsd(0),
      [GMX_ACCOUNT_PSEUDO_CHAIN_ID]: gmAtOneUsd(0.000000637048833203),
    });

    expect(getHasBalanceOutsideWallet(balances, ARBITRUM)).toBe(false);
  });

  it("is false one unit below the $0.01 threshold and true at the threshold", () => {
    const belowThreshold = multichainBalances({
      [ARBITRUM]: gmAtOneUsd(5),
      [GMX_ACCOUNT_PSEUDO_CHAIN_ID]: gmWorthUsd(PLATFORM_TOKEN_BALANCE_THRESHOLD_USD - 1n),
    });
    const atThreshold = multichainBalances({
      [ARBITRUM]: gmAtOneUsd(5),
      [GMX_ACCOUNT_PSEUDO_CHAIN_ID]: gmWorthUsd(PLATFORM_TOKEN_BALANCE_THRESHOLD_USD),
    });

    expect(getHasBalanceOutsideWallet(belowThreshold, ARBITRUM)).toBe(false);
    expect(getHasBalanceOutsideWallet(atThreshold, ARBITRUM)).toBe(true);
  });

  it("applies the threshold to the balance outside the wallet combined across the GMX Account and source chains", () => {
    const dustCombined = multichainBalances({
      [ARBITRUM]: gmAtOneUsd(5),
      [GMX_ACCOUNT_PSEUDO_CHAIN_ID]: gmAtOneUsd(0.004),
      [SOURCE_BASE_MAINNET]: gmAtOneUsd(0.004),
    });
    const thresholdCombined = multichainBalances({
      [ARBITRUM]: gmAtOneUsd(5),
      [GMX_ACCOUNT_PSEUDO_CHAIN_ID]: gmAtOneUsd(0.006),
      [SOURCE_BASE_MAINNET]: gmAtOneUsd(0.006),
    });

    expect(getHasBalanceOutsideWallet(dustCombined, ARBITRUM)).toBe(false);
    expect(getHasBalanceOutsideWallet(thresholdCombined, ARBITRUM)).toBe(true);
  });

  it("does not treat an unpriced balance outside the wallet as dust", () => {
    const balances = multichainBalances({
      [ARBITRUM]: { balance: numberToBigint(5, GM_DECIMALS), balanceUsd: 0n },
      [GMX_ACCOUNT_PSEUDO_CHAIN_ID]: { balance: 1n, balanceUsd: 0n },
    });

    expect(getHasBalanceOutsideWallet(balances, ARBITRUM)).toBe(true);
  });
});
