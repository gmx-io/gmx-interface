import { describe, expect, it } from "vitest";

import type { MarketInfo } from "domain/synthetics/markets";
import type { TokenData } from "domain/synthetics/tokens";
import type { ERC20Address } from "domain/tokens";
import { expandDecimals } from "lib/numbers";
import { mockTokensData } from "sdk/test/mock";
import { bigMath } from "sdk/utils/bigmath";
import type { FindSwapPath, SwapPathStats } from "sdk/utils/trade/types";

import { getWithdrawalAmounts } from "../../trade/utils/withdrawal";

const USD = expandDecimals(1, 30);
const tokensData = mockTokensData();
const collateralToken = tokensData.DAI;
const receiveToken = tokensData.USDC;

const marketInfo = {
  longToken: collateralToken,
  shortToken: collateralToken,
  longPoolAmount: expandDecimals(500, collateralToken.decimals),
  shortPoolAmount: expandDecimals(500, collateralToken.decimals),
  poolValueMax: 1000n * USD,
  swapFeeFactorForBalanceWasNotImproved: 0n,
} as unknown as MarketInfo;

const marketToken = {
  decimals: 18,
  totalSupply: expandDecimals(1000, 18),
  prices: { minPrice: USD, maxPrice: USD },
} as TokenData;

const SWAP_FEE_BPS = 10n;
const HALF_USD = 5n * USD;
const SWAPPED_HALF_USD = HALF_USD - (HALF_USD * SWAP_FEE_BPS) / 10_000n;

const findSwapPath: FindSwapPath = (usdIn) => {
  const feeUsd = (usdIn * SWAP_FEE_BPS) / 10_000n;
  const usdOut = usdIn - feeUsd;

  return {
    swapPath: ["0xpool"],
    swapSteps: [],
    usdOut,
    amountOut: usdOut / expandDecimals(1, 30 - receiveToken.decimals),
    totalFeesDeltaUsd: -feeUsd,
  } as unknown as SwapPathStats;
};

function getAmounts(p: { findSwapPath: FindSwapPath; strategy: "byMarketToken" | "byLongCollateral" }) {
  return getWithdrawalAmounts({
    marketInfo,
    marketToken,
    marketTokenAmount: expandDecimals(10, 18),
    longTokenAmount: expandDecimals(10, collateralToken.decimals),
    shortTokenAmount: expandDecimals(10, collateralToken.decimals),
    strategy: p.strategy,
    uiFeeFactor: 0n,
    findSwapPath: p.findSwapPath,
    wrappedReceiveTokenAddress: receiveToken.address as ERC20Address,
    isSameCollaterals: true,
  });
}

describe("getWithdrawalAmounts with a receive token outside a same-collateral pool", () => {
  it("swaps both halves by market token", () => {
    const amounts = getAmounts({ findSwapPath, strategy: "byMarketToken" });

    expect(amounts.longTokenSwapPathStats?.usdOut).toBe(SWAPPED_HALF_USD);
    expect(amounts.shortTokenSwapPathStats?.usdOut).toBe(SWAPPED_HALF_USD);
    expect(amounts.longTokenBeforeSwapAmount).toBe(expandDecimals(5, collateralToken.decimals));
  });

  it("swaps both halves by collateral", () => {
    const amounts = getAmounts({ findSwapPath, strategy: "byLongCollateral" });

    expect(amounts.longTokenSwapPathStats?.usdOut).toBe(SWAPPED_HALF_USD);
    expect(amounts.shortTokenSwapPathStats?.usdOut).toBe(SWAPPED_HALF_USD);
    expect(amounts.marketTokenAmount).toBe(expandDecimals(10, 18));
  });

  it("sells enough to receive the typed amount after the swap fee", () => {
    const amounts = getWithdrawalAmounts({
      marketInfo,
      marketToken,
      marketTokenAmount: 0n,
      longTokenAmount: 0n,
      shortTokenAmount: 0n,
      strategy: "byLongCollateral",
      uiFeeFactor: 0n,
      findSwapPath,
      wrappedReceiveTokenAddress: receiveToken.address as ERC20Address,
      receiveToken,
      receiveTokenAmount: expandDecimals(10, receiveToken.decimals),
      isSameCollaterals: true,
    });

    const receivedUsd = amounts.longTokenSwapPathStats!.usdOut + amounts.shortTokenSwapPathStats!.usdOut;
    const collateralUnitUsd = expandDecimals(1, 30 - collateralToken.decimals);

    expect(amounts.longTokenUsd + amounts.shortTokenUsd).toBeGreaterThan(10n * USD);
    expect(bigMath.abs(receivedUsd - 10n * USD)).toBeLessThanOrEqual(2n * collateralUnitUsd);
  });

  it("works out the payout from the typed receive token amount when the pool does not swap", () => {
    const amounts = getWithdrawalAmounts({
      marketInfo,
      marketToken,
      marketTokenAmount: 0n,
      longTokenAmount: 0n,
      shortTokenAmount: 0n,
      strategy: "byLongCollateral",
      uiFeeFactor: 0n,
      findSwapPath,
      wrappedReceiveTokenAddress: undefined,
      receiveToken,
      receiveTokenAmount: expandDecimals(10, receiveToken.decimals),
      isSameCollaterals: true,
    });

    expect(amounts.longTokenUsd + amounts.shortTokenUsd).toBe(10n * USD);
    expect(amounts.longTokenSwapPathStats).toBeUndefined();
    expect(amounts.marketTokenAmount).toBe(expandDecimals(10, 18));
  });

  it("leaves the outputs unswapped without a route", () => {
    for (const strategy of ["byMarketToken", "byLongCollateral"] as const) {
      const amounts = getAmounts({ findSwapPath: () => undefined, strategy });

      expect(amounts.longTokenSwapPathStats).toBeUndefined();
      expect(amounts.shortTokenSwapPathStats).toBeUndefined();
      expect(amounts.longTokenUsd + amounts.shortTokenUsd).toBe(10n * USD);
    }
  });
});
