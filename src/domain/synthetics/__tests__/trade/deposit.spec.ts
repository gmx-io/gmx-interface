import { describe, expect, it } from "vitest";

import { convertToUsd, type TokenData } from "domain/synthetics/tokens";
import { expandDecimals } from "lib/numbers";
import { mockMarketsInfoData, mockTokensData } from "sdk/test/mock";
import { bigMath } from "sdk/utils/bigmath";
import type { FindSwapPath, SwapPathStats } from "sdk/utils/trade/types";

import { getDepositAmounts } from "../../trade/utils/deposit";

const USD = expandDecimals(1, 30);
const tokensData = mockTokensData();
const collateralToken = tokensData.DAI;
const initialShortToken = tokensData.USDC;
const marketInfo = mockMarketsInfoData(tokensData, ["ETH-DAI-DAI"])["ETH-DAI-DAI"];

const marketToken = {
  decimals: 18,
  totalSupply: expandDecimals(2000, 18),
  prices: { minPrice: USD, maxPrice: USD },
} as TokenData;

const SWAP_FEE_BPS = 10n;

const findSwapPath: FindSwapPath = (usdIn) => {
  const feeUsd = (usdIn * SWAP_FEE_BPS) / 10_000n;
  const usdOut = usdIn - feeUsd;

  return {
    swapPath: ["0xpool"],
    swapSteps: [],
    usdOut: usdIn,
    amountOut: usdIn / expandDecimals(1, 30 - collateralToken.decimals),
    totalFeesDeltaUsd: 0n,
    tokenInAddress: initialShortToken.address,
    tokenOutAddress: collateralToken.address,
  } as unknown as SwapPathStats;
};

const PAID_USD = 10n * USD;
const SWAPPED_USD = PAID_USD - (PAID_USD * SWAP_FEE_BPS) / 10_000n;
const swappedShortTokenAmount = SWAPPED_USD / expandDecimals(1, 30 - collateralToken.decimals);

function getAmounts(p: { strategy: "byCollaterals" | "byMarketToken"; findSwapPath?: FindSwapPath }) {
  return getDepositAmounts({
    marketInfo,
    marketToken,
    longToken: collateralToken,
    shortToken: collateralToken,
    longTokenAmount: 0n,
    shortTokenAmount: 0n,
    marketTokenAmount: expandDecimals(10, 18),
    strategy: p.strategy,
    includeLongToken: false,
    includeShortToken: true,
    uiFeeFactor: 0n,
    isMarketTokenDeposit: false,
    initialShortToken,
    initialShortTokenAmount: expandDecimals(10, initialShortToken.decimals),
    findSwapPath: p.findSwapPath,
  });
}

describe("getDepositAmounts with an initial short token", () => {
  it("deposits the swap output and keeps the paid amount by collaterals", () => {
    const amounts = getAmounts({ strategy: "byCollaterals", findSwapPath });

    expect(amounts.shortTokenSwapPathStats?.usdOut).toBe(10n * USD);
    expect(amounts.shortTokenAmount).toBe(expandDecimals(10, collateralToken.decimals));
    expect(amounts.longTokenAmount).toBe(0n);
  });

  it("gives the same GM as depositing the swap output directly", () => {
    const swapped = getAmounts({ strategy: "byCollaterals", findSwapPath });
    const direct = getDepositAmounts({
      marketInfo,
      marketToken,
      longToken: collateralToken,
      shortToken: collateralToken,
      longTokenAmount: 0n,
      shortTokenAmount: swappedShortTokenAmount,
      marketTokenAmount: 0n,
      strategy: "byCollaterals",
      includeLongToken: false,
      includeShortToken: true,
      uiFeeFactor: 0n,
      isMarketTokenDeposit: false,
    });

    expect(swapped.marketTokenAmount).toBe(direct.marketTokenAmount);
    expect(swapped.marketTokenAmount).toBeGreaterThan(0n);
  });

  it("estimates the short token by price without a route", () => {
    const amounts = getAmounts({ strategy: "byCollaterals" });

    expect(amounts.shortTokenSwapPathStats).toBeUndefined();
    expect(amounts.shortTokenUsd > 0n).toBe(true);
    expect(amounts.longTokenAmount).toBe(0n);
  });

  it("asks for enough of the paid token to cover the swap fee by market token", () => {
    const amounts = getAmounts({ strategy: "byMarketToken", findSwapPath });
    const paidUsd = convertToUsd(
      amounts.initialShortTokenAmount!,
      initialShortToken.decimals,
      initialShortToken.prices.minPrice
    )!;
    const swappedUsd = findSwapPath(paidUsd)!.usdOut;
    const paidTokenUnitUsd = expandDecimals(1, 30 - initialShortToken.decimals);

    expect(amounts.shortTokenSwapPathStats?.usdOut).toBe(amounts.shortTokenUsd);
    expect(amounts.longTokenUsd).toBe(0n);
  });
});
