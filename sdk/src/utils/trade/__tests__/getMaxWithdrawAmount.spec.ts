import { describe, expect, it } from "vitest";

import { mockMarketsInfoData, mockTokensData, usdToToken } from "test/mock";
import { applyFactor, expandDecimals, USD_DECIMALS } from "utils/numbers";
import { getLiquidationPrice } from "utils/positions";
import type { PositionInfoLoaded } from "utils/positions/types";

import { getMaxWithdrawAmount } from "../decrease";

describe("getMaxWithdrawAmount", () => {
  const ETH_PRICE = expandDecimals(11952, 29); // $1195.20
  const USDC_PRICE = expandDecimals(1, 30);

  function buildScenario() {
    const tokensData = mockTokensData({
      ETH: { prices: { minPrice: ETH_PRICE, maxPrice: ETH_PRICE } },
      USDC: { prices: { minPrice: USDC_PRICE, maxPrice: USDC_PRICE } },
    });

    const marketKey = "ETH-ETH-USDC";
    const marketsInfoData = mockMarketsInfoData(tokensData, [marketKey], {
      [marketKey]: {
        longInterestUsd: expandDecimals(100_000_000, USD_DECIMALS),
        shortInterestUsd: expandDecimals(100_000_000, USD_DECIMALS),
        longInterestInTokens: usdToToken(100_000_000, tokensData.ETH),
        shortInterestInTokens: usdToToken(100_000_000, tokensData.ETH),

        minCollateralFactor: expandDecimals(5, 27),
        minCollateralFactorForLiquidation: expandDecimals(4, 27),
        minCollateralFactorForOpenInterestLong: 0n,
        minCollateralFactorForOpenInterestShort: 0n,

        positionFeeFactorForBalanceWasNotImproved: expandDecimals(5, 26),
        positionFeeFactorForBalanceWasImproved: expandDecimals(5, 26),
        maxPositionImpactFactorForLiquidations: expandDecimals(1, 28),
      },
    });

    const marketInfo = marketsInfoData[marketKey];
    const usdcToken = tokensData.USDC;
    const ethToken = tokensData.ETH;

    const sizeInUsd = expandDecimals(50_000, USD_DECIMALS);
    const collateralUsd = expandDecimals(4_000, USD_DECIMALS);
    const sizeInTokens = (sizeInUsd * expandDecimals(1, ethToken.decimals)) / expandDecimals(1200, USD_DECIMALS);
    const collateralAmount = (collateralUsd * expandDecimals(1, usdcToken.decimals)) / USDC_PRICE;

    const position: PositionInfoLoaded = {
      key: "test-position",
      contractKey: "test-position",
      account: "0xtest",
      marketAddress: marketKey,
      collateralTokenAddress: usdcToken.address,
      sizeInUsd,
      sizeInTokens,
      collateralAmount,
      pendingBorrowingFeesUsd: 0n,
      increasedAtTime: 0n,
      decreasedAtTime: 0n,
      isLong: true,
      fundingFeeAmount: 0n,
      claimableLongTokenAmount: 0n,
      claimableShortTokenAmount: 0n,
      pnl: -expandDecimals(200, USD_DECIMALS),
      positionFeeAmount: 0n,
      traderDiscountAmount: 0n,
      uiFeeAmount: 0n,
      pendingImpactAmount: -expandDecimals(5, 16),
      data: "",

      marketInfo,
      market: marketInfo,
      indexToken: ethToken,
      longToken: ethToken,
      shortToken: usdcToken,
      indexName: "ETH",
      poolName: "USDC",
      collateralToken: usdcToken,
      pnlToken: usdcToken,
      markPrice: ETH_PRICE,
      entryPrice: expandDecimals(1200, USD_DECIMALS),
      liquidationPrice: undefined,
      collateralUsd,
      remainingCollateralUsd: collateralUsd,
      remainingCollateralAmount: collateralAmount,
      hasLowCollateral: false,
      pnlPercentage: 0n,
      pnlAfterFees: -expandDecimals(200, USD_DECIMALS),
      pnlAfterFeesPercentage: 0n,
      pendingFundingFeesUsd: 0n,
      pendingClaimableFundingFeesUsd: 0n,
    } as unknown as PositionInfoLoaded;

    return { position, usdcToken };
  }

  it("max-withdraw keeps nextLiqPrice on the safe side of markPrice", () => {
    const { position, usdcToken } = buildScenario();
    const minCollateralUsd = expandDecimals(1, USD_DECIMALS);
    const collateralPrice = usdcToken.prices.minPrice;

    const maxWithdraw = getMaxWithdrawAmount({
      position,
      minCollateralUsd,
      collateralPrice,
      collateralDecimals: usdcToken.decimals,
      userReferralInfo: undefined,
    });

    const withdrawUsd = (maxWithdraw * collateralPrice) / expandDecimals(1, usdcToken.decimals);
    const nextCollateralUsd = position.collateralUsd - withdrawUsd;
    const nextCollateralAmount = (nextCollateralUsd * expandDecimals(1, usdcToken.decimals)) / collateralPrice;

    const nextLiqPrice = getLiquidationPrice({
      sizeInUsd: position.sizeInUsd,
      sizeInTokens: position.sizeInTokens,
      collateralUsd: nextCollateralUsd,
      collateralAmount: nextCollateralAmount,
      collateralToken: position.collateralToken,
      marketInfo: position.marketInfo,
      pendingImpactAmount: position.pendingImpactAmount,
      userReferralInfo: undefined,
      pendingFundingFeesUsd: 0n,
      pendingBorrowingFeesUsd: 0n,
      isLong: position.isLong,
      minCollateralUsd,
    });

    expect(nextLiqPrice).toBeDefined();
    expect(nextLiqPrice!).toBeLessThanOrEqual(position.markPrice);
  });

  it("test factors don't collapse to zero under PRECISION=1e30", () => {
    const { position } = buildScenario();
    expect(applyFactor(position.sizeInUsd, position.marketInfo.minCollateralFactorForLiquidation)).toBeGreaterThan(0n);
    expect(applyFactor(position.sizeInUsd, position.marketInfo.minCollateralFactor)).toBeGreaterThan(0n);
  });
});
