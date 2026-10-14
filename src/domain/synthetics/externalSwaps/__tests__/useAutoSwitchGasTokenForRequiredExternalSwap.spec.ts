import { describe, expect, it } from "vitest";

import { TokensData } from "domain/tokens";
import { expandDecimals } from "lib/numbers";
import { ARBITRUM } from "sdk/configs/chains";
import { getTokenBySymbol } from "sdk/configs/tokens";

import {
  getExternalSwapGasTokenCandidate,
  getExternalSwapGasTokenToSwitchTo,
} from "../useAutoSwitchGasTokenForRequiredExternalSwap";

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

describe("getExternalSwapGasTokenCandidate", () => {
  const usdPrices = (usd: number) => ({ minPrice: expandDecimals(usd, 30), maxPrice: expandDecimals(usd, 30) });

  function buildPricedTokensData(walletBalances: { [symbol: string]: bigint }): TokensData {
    const pricesBySymbol: Record<string, { minPrice: bigint; maxPrice: bigint }> = {
      USDC: usdPrices(1),
      WETH: usdPrices(2000),
      USDT: usdPrices(1),
    };

    return Object.fromEntries(
      [usdc, weth, usdt].map((token) => [
        token.address,
        {
          ...token,
          prices: pricesBySymbol[token.symbol],
          walletBalance: walletBalances[token.symbol],
          balance: walletBalances[token.symbol],
        },
      ])
    ) as TokensData;
  }

  // WETH -> USDC swap with USDC saved for gas
  const candidateParams = {
    chainId: ARBITRUM,
    conflictTokenAddress: usdc.address,
    savedGasTokenAddress: usdc.address,
    payAmounts: { [weth.address]: expandDecimals(1, 18) },
    isGmxAccount: false,
  };

  // $1 fee
  const wethFee = expandDecimals(5, 14);
  const usdcFee = expandDecimals(1, 6);

  describe("fee moved to the WETH pay token because USDC is not approved", () => {
    it("offers WETH, which already pays, so saving it keeps the fee there", () => {
      const tokensData = buildPricedTokensData({ WETH: expandDecimals(2, 18), USDT: expandDecimals(2, 6) });
      const gasPaymentParams = { gasPaymentToken: tokensData[weth.address], gasPaymentTokenAmount: wethFee };

      for (const desirability of ["optional", "required"] as const) {
        expect(
          getExternalSwapGasTokenCandidate({ ...candidateParams, tokensData, desirability, gasPaymentParams })
        ).toBe(weth.address);
      }
    });

    it("reads the fee amount in WETH and offers another token when WETH can't also cover the order", () => {
      const tokensData = buildPricedTokensData({ WETH: expandDecimals(1, 18), USDT: expandDecimals(2, 6) });
      const gasPaymentParams = { gasPaymentToken: tokensData[weth.address], gasPaymentTokenAmount: wethFee };

      expect(
        getExternalSwapGasTokenCandidate({
          ...candidateParams,
          tokensData,
          desirability: "optional",
          gasPaymentParams,
        })
      ).toBe(usdt.address);
      expect(
        getExternalSwapGasTokenCandidate({
          ...candidateParams,
          tokensData,
          desirability: "required",
          gasPaymentParams,
        })
      ).toBe(usdt.address);
    });

    it("skips a token that can't cover the fee converted from WETH", () => {
      const tokensData = buildPricedTokensData({ WETH: expandDecimals(1, 18), USDT: expandDecimals(5, 5) });

      expect(
        getExternalSwapGasTokenCandidate({
          ...candidateParams,
          tokensData,
          desirability: "optional",
          gasPaymentParams: { gasPaymentToken: tokensData[weth.address], gasPaymentTokenAmount: wethFee },
        })
      ).toBeUndefined();
    });
  });

  describe("fee paid with the saved USDC", () => {
    it("prefers WETH for an optional route", () => {
      const tokensData = buildPricedTokensData({
        USDC: expandDecimals(100, 6),
        WETH: expandDecimals(2, 18),
        USDT: expandDecimals(100, 6),
      });

      expect(
        getExternalSwapGasTokenCandidate({
          ...candidateParams,
          tokensData,
          desirability: "optional",
          gasPaymentParams: { gasPaymentToken: tokensData[usdc.address], gasPaymentTokenAmount: usdcFee },
        })
      ).toBe(weth.address);
    });

    it("leaves out the WETH already going into the order", () => {
      const tokensData = buildPricedTokensData({
        USDC: expandDecimals(100, 6),
        WETH: expandDecimals(1, 18),
        USDT: expandDecimals(100, 6),
      });

      expect(
        getExternalSwapGasTokenCandidate({
          ...candidateParams,
          tokensData,
          desirability: "optional",
          gasPaymentParams: { gasPaymentToken: tokensData[usdc.address], gasPaymentTokenAmount: usdcFee },
        })
      ).toBe(usdt.address);
    });
  });

  describe("without a fee estimate", () => {
    it("offers WETH with any balance for an optional route", () => {
      const tokensData = buildPricedTokensData({ WETH: 1n, USDT: expandDecimals(100, 6) });

      expect(
        getExternalSwapGasTokenCandidate({
          ...candidateParams,
          tokensData,
          desirability: "optional",
          gasPaymentParams: undefined,
        })
      ).toBe(weth.address);
    });

    it("offers the first other gas token with a balance for a required route", () => {
      const tokensData = buildPricedTokensData({ USDC: expandDecimals(100, 6), USDT: expandDecimals(100, 6) });

      expect(
        getExternalSwapGasTokenCandidate({
          ...candidateParams,
          tokensData,
          desirability: "required",
          gasPaymentParams: undefined,
        })
      ).toBe(usdt.address);
    });
  });
});
