import { describe, expect, it } from "vitest";

import type { AnyChainId } from "config/chains";
import { USD_DECIMALS } from "config/factors";
import type { MultichainMarketTokenBalances } from "domain/multichain/types";
import { expandDecimals } from "lib/numbers";
import { ARBITRUM, SOURCE_BASE_MAINNET } from "sdk/configs/chainIds";
import { GMX_ACCOUNT_PSEUDO_CHAIN_ID } from "sdk/configs/chains";

import { getHasBalanceOutsideWallet } from "./getHasBalanceOutsideWallet";

const USD_PRECISION = expandDecimals(1, USD_DECIMALS);

function multichainBalances(
  balancesByChain: Record<number, bigint>,
  usdPerUnit = USD_PRECISION
): MultichainMarketTokenBalances {
  const result: MultichainMarketTokenBalances = { totalBalance: 0n, totalBalanceUsd: 0n, balances: {} };

  for (const [chainId, balance] of Object.entries(balancesByChain)) {
    const balanceUsd = balance * usdPerUnit;
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

  it("ignores the reported BTC GMX Account residual", () => {
    const balances = multichainBalances(
      { [ARBITRUM]: 4635366796663680468413n, [GMX_ACCOUNT_PSEUDO_CHAIN_ID]: 70206120109n },
      // Price the 18-decimal GM token at $2.
      2n * expandDecimals(1, USD_DECIMALS - 18)
    );

    expect(getHasBalanceOutsideWallet(balances, ARBITRUM)).toBe(false);
  });

  it.each([GMX_ACCOUNT_PSEUDO_CHAIN_ID, SOURCE_BASE_MAINNET])("ignores outside-wallet dust on chain %s", (chainId) => {
    const balances = multichainBalances({ [ARBITRUM]: 5000n, [chainId]: 9n }, USD_PRECISION / 1000n);

    expect(getHasBalanceOutsideWallet(balances, ARBITRUM)).toBe(false);
  });

  it.each([10n, 11n])("flags outside-wallet balances worth $0.01 or more (%s units)", (balance) => {
    const balances = multichainBalances(
      { [ARBITRUM]: 5000n, [GMX_ACCOUNT_PSEUDO_CHAIN_ID]: balance },
      USD_PRECISION / 1000n
    );

    expect(getHasBalanceOutsideWallet(balances, ARBITRUM)).toBe(true);
  });

  it("ignores dust when the whole balance is outside the wallet", () => {
    const balances = multichainBalances({ [GMX_ACCOUNT_PSEUDO_CHAIN_ID]: 9n }, USD_PRECISION / 1000n);

    expect(getHasBalanceOutsideWallet(balances, ARBITRUM)).toBe(false);
  });

  it("applies the dust threshold to the combined outside-wallet balance", () => {
    const balances = multichainBalances(
      { [ARBITRUM]: 5000n, [GMX_ACCOUNT_PSEUDO_CHAIN_ID]: 6n, [SOURCE_BASE_MAINNET]: 6n },
      USD_PRECISION / 1000n
    );

    expect(getHasBalanceOutsideWallet(balances, ARBITRUM)).toBe(true);
  });

  it("keeps outside-wallet balances flagged while prices are unavailable", () => {
    const balances = multichainBalances({ [ARBITRUM]: 5n, [GMX_ACCOUNT_PSEUDO_CHAIN_ID]: 1n }, 0n);

    expect(getHasBalanceOutsideWallet(balances, ARBITRUM)).toBe(true);
  });

  it("does not flag wallet-only balances while prices are unavailable", () => {
    const balances = multichainBalances({ [ARBITRUM]: 5n }, 0n);

    expect(getHasBalanceOutsideWallet(balances, ARBITRUM)).toBe(false);
  });
});
