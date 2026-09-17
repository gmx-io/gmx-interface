import { describe, expect, it } from "vitest";

import type { MarketInfo } from "domain/synthetics/markets";
import type { TokenData } from "domain/synthetics/tokens";
import type { ERC20Address } from "domain/tokens";
import { expandDecimals } from "lib/numbers";
import { mockTokensData } from "sdk/test/mock";
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

const findSwapPath: FindSwapPath = (usdIn) =>
  ({
    swapPath: ["0xpool"],
    swapSteps: [],
    usdOut: usdIn,
    amountOut: usdIn / expandDecimals(1, 30 - receiveToken.decimals),
    totalFeesDeltaUsd: 0n,
  }) as unknown as SwapPathStats;

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

    expect(amounts.longTokenSwapPathStats?.usdOut).toBe(5n * USD);
    expect(amounts.shortTokenSwapPathStats?.usdOut).toBe(5n * USD);
    expect(amounts.longTokenBeforeSwapAmount).toBe(expandDecimals(5, collateralToken.decimals));
  });

  it("swaps both halves by collateral", () => {
    const amounts = getAmounts({ findSwapPath, strategy: "byLongCollateral" });

    expect(amounts.longTokenSwapPathStats?.usdOut).toBe(5n * USD);
    expect(amounts.shortTokenSwapPathStats?.usdOut).toBe(5n * USD);
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
