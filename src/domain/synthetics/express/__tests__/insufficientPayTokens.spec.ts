import { describe, expect, it } from "vitest";

import type { TokensData } from "domain/synthetics/tokens";
import { TokenBalanceType } from "domain/tokens";

import { getPossiblyInsufficientPayTokens } from "../insufficientPayTokens";

const USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const WETH = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";

function tokensData(balances: { [tokenAddress: string]: { wallet?: bigint; gmxAccount?: bigint } }): TokensData {
  return Object.fromEntries(
    Object.entries(balances).map(([address, { wallet, gmxAccount }]) => [
      address,
      { address, walletBalance: wallet, gmxAccountBalance: gmxAccount } as TokensData[string],
    ])
  );
}

describe("getPossiblyInsufficientPayTokens", () => {
  it("names the token whose balance is below the pulled amount when nothing was deducted yet", () => {
    expect(
      getPossiblyInsufficientPayTokens({
        payAmounts: { [USDC]: 100n, [WETH]: 2n },
        tokensData: tokensData({ [USDC]: { wallet: 50n }, [WETH]: { wallet: 10n } }),
        optimisticUpdates: {},
        websocketUpdates: {},
        balanceType: TokenBalanceType.Wallet,
      })
    ).toEqual([USDC]);
  });

  it("clears a token whose deducted balance still shows a positive remainder", () => {
    expect(
      getPossiblyInsufficientPayTokens({
        payAmounts: { [USDC]: 100n, [WETH]: 2n },
        tokensData: tokensData({ [USDC]: { wallet: 0n }, [WETH]: { wallet: 8n } }),
        optimisticUpdates: {
          [USDC]: { balanceType: TokenBalanceType.Wallet, diff: -100n, isPending: true },
          [WETH]: { balanceType: TokenBalanceType.Wallet, diff: -2n, isPending: true },
        },
        websocketUpdates: {},
        balanceType: TokenBalanceType.Wallet,
      })
    ).toEqual([USDC]);
  });

  it("keeps a token whose deducted balance is clamped at zero even after the pending flag expired", () => {
    expect(
      getPossiblyInsufficientPayTokens({
        payAmounts: { [USDC]: 100n },
        tokensData: tokensData({ [USDC]: { wallet: 0n } }),
        optimisticUpdates: { [USDC]: { balanceType: TokenBalanceType.Wallet, diff: -100n, isPending: false } },
        websocketUpdates: {},
        balanceType: TokenBalanceType.Wallet,
      })
    ).toEqual([USDC]);
  });

  it("compares the shown balance directly when a websocket update overrides the deduction", () => {
    expect(
      getPossiblyInsufficientPayTokens({
        payAmounts: { [USDC]: 100n },
        tokensData: tokensData({ [USDC]: { wallet: 100n } }),
        optimisticUpdates: { [USDC]: { balanceType: TokenBalanceType.Wallet, diff: -100n, isPending: true } },
        websocketUpdates: { [USDC]: { balanceType: TokenBalanceType.Wallet, diff: -20n } },
        balanceType: TokenBalanceType.Wallet,
      })
    ).toEqual([]);
  });

  it("ignores deductions of the other balance source and reads the GMX Account balance", () => {
    expect(
      getPossiblyInsufficientPayTokens({
        payAmounts: { [USDC]: 100n },
        tokensData: tokensData({ [USDC]: { wallet: 0n, gmxAccount: 40n } }),
        optimisticUpdates: { [USDC]: { balanceType: TokenBalanceType.Wallet, diff: -100n, isPending: true } },
        websocketUpdates: {},
        balanceType: TokenBalanceType.GmxAccount,
      })
    ).toEqual([USDC]);
  });

  it("never blames a token whose balance is unknown", () => {
    expect(
      getPossiblyInsufficientPayTokens({
        payAmounts: { [USDC]: 100n },
        tokensData: tokensData({ [USDC]: {} }),
        optimisticUpdates: {},
        websocketUpdates: {},
        balanceType: TokenBalanceType.Wallet,
      })
    ).toEqual([]);

    expect(
      getPossiblyInsufficientPayTokens({
        payAmounts: { [USDC]: 100n },
        tokensData: undefined,
        optimisticUpdates: {},
        websocketUpdates: {},
        balanceType: TokenBalanceType.Wallet,
      })
    ).toEqual([]);
  });
});
