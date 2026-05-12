import { describe, expect, it } from "vitest";

import type { TokenData, TokensData } from "domain/tokens";
import { ARBITRUM } from "sdk/configs/chainIds";
import { getTokenBySymbol } from "sdk/configs/tokens";

import { findNextGasPaymentToken } from "../useSwitchGasPaymentTokenIfRequired";

const USDC = getTokenBySymbol(ARBITRUM, "USDC");
const USDT = getTokenBySymbol(ARBITRUM, "USDT");
const WETH = getTokenBySymbol(ARBITRUM, "WETH");

// Token price in 30-decimal USD precision: convertToUsd does (amount * price) / 10^decimals.
const STABLE_PRICE = 10n ** 30n;
const ETH_PRICE = 3000n * 10n ** 30n;
const ONE_USDC = 1_000_000n;
const ONE_USDT = 1_000_000n;

function makeTokenData(
  base: { address: string; symbol: string; decimals: number },
  overrides: { walletBalance?: bigint; gmxAccountBalance?: bigint; price: bigint }
): TokenData {
  return {
    address: base.address,
    symbol: base.symbol,
    name: base.symbol,
    decimals: base.decimals,
    isStable: base.decimals === 6,
    prices: { minPrice: overrides.price, maxPrice: overrides.price },
    walletBalance: overrides.walletBalance,
    gmxAccountBalance: overrides.gmxAccountBalance,
  } as TokenData;
}

function buildTokensData({
  usdcBalance,
  usdtBalance,
  wethBalance,
}: {
  usdcBalance?: bigint;
  usdtBalance?: bigint;
  wethBalance?: bigint;
}): TokensData {
  return {
    [USDC.address]: makeTokenData(USDC, { walletBalance: usdcBalance, price: STABLE_PRICE }),
    [USDT.address]: makeTokenData(USDT, { walletBalance: usdtBalance, price: STABLE_PRICE }),
    [WETH.address]: makeTokenData(WETH, { walletBalance: wethBalance, price: ETH_PRICE }),
  };
}

describe("findNextGasPaymentToken", () => {
  it("rejects an overlap candidate when balance can't cover pay + buffered gas", () => {
    // Pay 3 USDC, gas≈$1, balances USDT=1.0/USDC=3.45.
    // Without the pay-overlap term in the predicate, USDC would be a false-positive switch
    // (balance 3.45 > 1.3·1) even though validation marks it out (3 + 1.3·1 = 4.3 > 3.45).
    const tokensData = buildTokensData({ usdcBalance: 3_450_000n, usdtBalance: ONE_USDT, wethBalance: 0n });
    const next = findNextGasPaymentToken({
      chainId: ARBITRUM,
      tokensData,
      gasPaymentToken: tokensData[USDT.address]!,
      gasPaymentTokenAmount: ONE_USDT,
      payAmounts: { [USDC.address]: 3_000_000n },
      isGmxAccount: false,
    });
    expect(next).toBeUndefined();
  });

  it("accepts an overlap candidate when balance comfortably covers pay + buffered gas", () => {
    const tokensData = buildTokensData({ usdcBalance: 100_000_000n, usdtBalance: 100_000n, wethBalance: 0n });
    const next = findNextGasPaymentToken({
      chainId: ARBITRUM,
      tokensData,
      gasPaymentToken: tokensData[USDT.address]!,
      gasPaymentTokenAmount: ONE_USDT,
      payAmounts: { [USDC.address]: 3_000_000n },
      isGmxAccount: false,
    });
    expect(next).toBe(USDC.address);
  });

  it("falls back to gas-only check when there is no pay overlap on the candidate", () => {
    const tokensData = buildTokensData({ usdcBalance: 2_000_000n, usdtBalance: 100_000n, wethBalance: 0n });
    const next = findNextGasPaymentToken({
      chainId: ARBITRUM,
      tokensData,
      gasPaymentToken: tokensData[USDT.address]!,
      gasPaymentTokenAmount: ONE_USDT,
      payAmounts: {},
      isGmxAccount: false,
    });
    expect(next).toBe(USDC.address);
  });

  it("skips the current gas-payment token", () => {
    const tokensData = buildTokensData({
      usdcBalance: 100_000_000n,
      usdtBalance: 100_000_000n,
      wethBalance: 0n,
    });
    const next = findNextGasPaymentToken({
      chainId: ARBITRUM,
      tokensData,
      gasPaymentToken: tokensData[USDC.address]!,
      gasPaymentTokenAmount: ONE_USDC,
      payAmounts: {},
      isGmxAccount: false,
    });
    expect(next).toBe(USDT.address);
  });

  it("uses gmxAccountBalance when isGmxAccount is true", () => {
    const tokensData: TokensData = {
      [USDC.address]: makeTokenData(USDC, { walletBalance: 0n, gmxAccountBalance: 100_000_000n, price: STABLE_PRICE }),
      [USDT.address]: makeTokenData(USDT, { walletBalance: 100_000_000n, price: STABLE_PRICE }),
      [WETH.address]: makeTokenData(WETH, { walletBalance: 0n, price: ETH_PRICE }),
    };
    const next = findNextGasPaymentToken({
      chainId: ARBITRUM,
      tokensData,
      gasPaymentToken: tokensData[USDT.address]!,
      gasPaymentTokenAmount: ONE_USDT,
      payAmounts: {},
      isGmxAccount: true,
    });
    expect(next).toBe(USDC.address);
  });
});
