import { describe, expect, it } from "vitest";

import { TokensData } from "domain/tokens";
import { expandDecimals } from "lib/numbers";
import { ARBITRUM } from "sdk/configs/chains";
import { getTokenBySymbol } from "sdk/configs/tokens";

import { getExternalSwapGasTokenToSwitchTo } from "../useAutoSwitchGasTokenForRequiredExternalSwap";

const usdc = getTokenBySymbol(ARBITRUM, "USDC");
const weth = getTokenBySymbol(ARBITRUM, "WETH");
const usdt = getTokenBySymbol(ARBITRUM, "USDT");

function buildTokensData(walletBalances: { [symbol: string]: bigint }): TokensData {
  const prices = { minPrice: expandDecimals(1, 30), maxPrice: expandDecimals(1, 30) };

  return Object.fromEntries(
    [usdc, weth, usdt].map((token) => [
      token.address,
      {
        ...token,
        prices,
        walletBalance: walletBalances[token.symbol],
        balance: walletBalances[token.symbol],
      },
    ])
  ) as TokensData;
}

const baseParams = {
  chainId: ARBITRUM,
  desirability: "required" as const,
  isOneClickActiveByUser: false,
  isBlockedByGasConflict: true,
  conflictTokenAddress: usdc.address,
  currentGasTokenAddress: usdc.address,
  isGmxAccount: false,
};

describe("getExternalSwapGasTokenToSwitchTo", () => {
  it("switches to the first non-conflicting gas token with a positive balance", () => {
    const tokensData = buildTokensData({ WETH: expandDecimals(1, 18), USDT: expandDecimals(100, 6) });

    expect(getExternalSwapGasTokenToSwitchTo({ ...baseParams, tokensData })).toBe(weth.address);
  });

  it("skips gas tokens with a zero or unknown balance", () => {
    const tokensData = buildTokensData({ WETH: 0n, USDT: expandDecimals(100, 6) });

    expect(getExternalSwapGasTokenToSwitchTo({ ...baseParams, tokensData })).toBe(usdt.address);
  });

  it("returns undefined when no non-conflicting gas token has a balance", () => {
    const tokensData = buildTokensData({ USDC: expandDecimals(100, 6) });

    expect(getExternalSwapGasTokenToSwitchTo({ ...baseParams, tokensData })).toBeUndefined();
  });

  it("never suggests the conflicting token even with a balance", () => {
    const tokensData = buildTokensData({ USDC: expandDecimals(100, 6), USDT: expandDecimals(100, 6) });

    expect(getExternalSwapGasTokenToSwitchTo({ ...baseParams, tokensData })).toBe(usdt.address);
  });

  it("does nothing when the external swap is optional", () => {
    const tokensData = buildTokensData({ WETH: expandDecimals(1, 18) });

    expect(getExternalSwapGasTokenToSwitchTo({ ...baseParams, tokensData, desirability: "optional" })).toBeUndefined();
  });

  it("does nothing while One-Click Trading is active", () => {
    const tokensData = buildTokensData({ WETH: expandDecimals(1, 18) });

    expect(
      getExternalSwapGasTokenToSwitchTo({ ...baseParams, tokensData, isOneClickActiveByUser: true })
    ).toBeUndefined();
  });

  it("does nothing when there is no gas token conflict", () => {
    const tokensData = buildTokensData({ WETH: expandDecimals(1, 18) });

    expect(
      getExternalSwapGasTokenToSwitchTo({ ...baseParams, tokensData, isBlockedByGasConflict: false })
    ).toBeUndefined();
  });

  it("uses gmx account balances when the pay token is in the gmx account", () => {
    const tokensData = buildTokensData({});
    (tokensData[weth.address] as any).gmxAccountBalance = expandDecimals(1, 18);

    expect(getExternalSwapGasTokenToSwitchTo({ ...baseParams, tokensData, isGmxAccount: true })).toBe(weth.address);
    expect(getExternalSwapGasTokenToSwitchTo({ ...baseParams, tokensData, isGmxAccount: false })).toBeUndefined();
  });
});
