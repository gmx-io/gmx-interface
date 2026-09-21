import { describe, expect, it } from "vitest";

import { mockMarketsInfoData, mockTokensData, usdToToken } from "test/mock";
import { getMaxAllowedLeverage } from "utils/markets";
import { applyFactor, BASIS_POINTS_DIVISOR_BIGINT, expandDecimals, USD_DECIMALS } from "utils/numbers";
import { DecreasePositionSwapType } from "utils/orders/types";
import { getLiquidationPrice } from "utils/positions";
import type { PositionInfoLoaded } from "utils/positions/types";

import { getMaxWithdrawAmount, getMinRequiredCollateralUsdForPosition } from "../decrease";
import { getDecreaseResultingPositionMarginState } from "../decreaseMarginCheck";
import { PositionMarginFailureReason } from "../increaseMarginCheck";

describe("getMaxWithdrawAmount", () => {
  const LOSING_ETH_PRICE = expandDecimals(11952, 29); // $1195.20
  const PROFITABLE_ETH_PRICE = expandDecimals(1250, 30);
  const USDC_PRICE = expandDecimals(1, 30);

  function buildScenario({
    ethPrice = LOSING_ETH_PRICE,
    minCollateralFactorForLiquidation = expandDecimals(4, 27),
  }: { ethPrice?: bigint; minCollateralFactorForLiquidation?: bigint } = {}) {
    const tokensData = mockTokensData({
      ETH: { prices: { minPrice: ethPrice, maxPrice: ethPrice } },
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
        minCollateralFactorForLiquidation,
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
    const pnl = (sizeInTokens * ethPrice) / expandDecimals(1, ethToken.decimals) - sizeInUsd;

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
      pnl,
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
      markPrice: ethPrice,
      entryPrice: expandDecimals(1200, USD_DECIMALS),
      liquidationPrice: undefined,
      collateralUsd,
      remainingCollateralUsd: collateralUsd,
      remainingCollateralAmount: collateralAmount,
      hasLowCollateral: false,
      pnlPercentage: 0n,
      pnlAfterFees: pnl,
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

  it("max withdraw equals the collateral above the min required collateral where both factors are equal", () => {
    const { position, usdcToken } = buildScenario({ minCollateralFactorForLiquidation: expandDecimals(5, 27) });
    const minCollateralUsd = expandDecimals(1, USD_DECIMALS);
    const collateralPrice = usdcToken.prices.minPrice;

    const minRequiredCollateralUsd = getMinRequiredCollateralUsdForPosition({
      position,
      minCollateralUsd,
      userReferralInfo: undefined,
    });

    const maxWithdraw = getMaxWithdrawAmount({
      position,
      minCollateralUsd,
      collateralPrice,
      collateralDecimals: usdcToken.decimals,
      userReferralInfo: undefined,
    });

    const maxWithdrawUsd = (maxWithdraw * collateralPrice) / expandDecimals(1, usdcToken.decimals);
    const conversionLossUsd = position.collateralUsd - minRequiredCollateralUsd - maxWithdrawUsd;

    expect(minRequiredCollateralUsd).toBeGreaterThan(0n);
    expect(conversionLossUsd).toBeGreaterThanOrEqual(0n);
    expect(conversionLossUsd).toBeLessThan(expandDecimals(1, USD_DECIMALS - usdcToken.decimals));
  });

  it("min required collateral exceeds current collateral when pending fees turn the remaining margin negative", () => {
    const { position, usdcToken } = buildScenario();
    const minCollateralUsd = expandDecimals(1, USD_DECIMALS);

    const feeShortfallUsd = expandDecimals(100, USD_DECIMALS);
    const underwaterPosition = {
      ...position,
      pendingBorrowingFeesUsd: position.collateralUsd + feeShortfallUsd,
    };

    const minRequiredCollateralUsd = getMinRequiredCollateralUsdForPosition({
      position: underwaterPosition,
      minCollateralUsd,
      userReferralInfo: undefined,
    });

    expect(minRequiredCollateralUsd - underwaterPosition.collateralUsd).toBeGreaterThan(feeShortfallUsd);

    expect(
      getMaxWithdrawAmount({
        position: underwaterPosition,
        minCollateralUsd,
        collateralPrice: usdcToken.prices.minPrice,
        collateralDecimals: usdcToken.decimals,
        userReferralInfo: undefined,
      })
    ).toBe(0n);
  });

  it("reserves the regular-factor minimum where it is above the liquidation one", () => {
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

    const maxWithdrawUsd = (maxWithdraw * collateralPrice) / expandDecimals(1, usdcToken.decimals);
    const liquidationBasedMaxUsd =
      position.collateralUsd -
      getMinRequiredCollateralUsdForPosition({ position, minCollateralUsd, userReferralInfo: undefined });

    const factorGapUsd = applyFactor(
      position.sizeInUsd,
      position.marketInfo.minCollateralFactor - position.marketInfo.minCollateralFactorForLiquidation
    );
    const reservedOnTopUsd = liquidationBasedMaxUsd - maxWithdrawUsd;

    expect(factorGapUsd).toBe(expandDecimals(50, USD_DECIMALS));
    expect(reservedOnTopUsd).toBeGreaterThanOrEqual(factorGapUsd);
    expect(reservedOnTopUsd - factorGapUsd).toBeLessThan(expandDecimals(1, USD_DECIMALS - usdcToken.decimals));
  });

  it.each([
    ["losing", LOSING_ETH_PRICE],
    ["profitable", PROFITABLE_ETH_PRICE],
  ])("is the largest withdrawal the contract check accepts for a %s position", (_name, ethPrice) => {
    const { position, usdcToken } = buildScenario({ ethPrice });
    const minCollateralUsd = expandDecimals(1, USD_DECIMALS);

    const maxWithdraw = getMaxWithdrawAmount({
      position,
      minCollateralUsd,
      collateralPrice: usdcToken.prices.minPrice,
      collateralDecimals: usdcToken.decimals,
      userReferralInfo: undefined,
    });

    const getMarginState = (collateralDeltaAmount: bigint) =>
      getDecreaseResultingPositionMarginState({
        marketInfo: position.marketInfo,
        collateralToken: position.collateralToken,
        isLong: position.isLong,
        position,
        sizeDeltaUsd: 0n,
        sizeDeltaInTokens: 0n,
        collateralDeltaAmount,
        payedRemainingCollateralAmount: 0n,
        payedOutputUsd: 0n,
        swapProfitFeeUsd: 0n,
        swapUiFeeUsd: 0n,
        decreaseSwapType: DecreasePositionSwapType.NoSwap,
        minCollateralUsd,
        minPositionSizeUsd: expandDecimals(1, USD_DECIMALS),
        userReferralInfo: undefined,
      });

    expect(maxWithdraw).toBeGreaterThan(0n);
    expect(getMarginState(maxWithdraw)?.isLiquidatable).toBe(false);
  });

  it("stops at the contract check for a losing position", () => {
    const { position, usdcToken } = buildScenario();
    const minCollateralUsd = expandDecimals(1, USD_DECIMALS);

    const maxWithdraw = getMaxWithdrawAmount({
      position,
      minCollateralUsd,
      collateralPrice: usdcToken.prices.minPrice,
      collateralDecimals: usdcToken.decimals,
      userReferralInfo: undefined,
    });

    const marginState = getDecreaseResultingPositionMarginState({
      marketInfo: position.marketInfo,
      collateralToken: position.collateralToken,
      isLong: position.isLong,
      position,
      sizeDeltaUsd: 0n,
      sizeDeltaInTokens: 0n,
      collateralDeltaAmount: maxWithdraw + 1n,
      payedRemainingCollateralAmount: 0n,
      payedOutputUsd: 0n,
      swapProfitFeeUsd: 0n,
      swapUiFeeUsd: 0n,
      decreaseSwapType: DecreasePositionSwapType.NoSwap,
      minCollateralUsd,
      minPositionSizeUsd: expandDecimals(1, USD_DECIMALS),
      userReferralInfo: undefined,
    });

    expect(marginState?.reason).toBe(PositionMarginFailureReason.MinCollateralForLeverage);
  });

  it("stops at the max allowed leverage for a profitable position", () => {
    const { position, usdcToken } = buildScenario({ ethPrice: PROFITABLE_ETH_PRICE });
    const collateralPrice = usdcToken.prices.minPrice;

    const maxWithdraw = getMaxWithdrawAmount({
      position,
      minCollateralUsd: expandDecimals(1, USD_DECIMALS),
      collateralPrice,
      collateralDecimals: usdcToken.decimals,
      userReferralInfo: undefined,
    });

    const maxAllowedLeverage = BigInt(
      getMaxAllowedLeverage({
        marketAddress: position.marketInfo.marketTokenAddress,
        minCollateralFactor: position.marketInfo.minCollateralFactor,
        minCollateralFactorForLiquidation: position.marketInfo.minCollateralFactorForLiquidation,
        positionFeeFactorForBalanceWasNotImproved: position.marketInfo.positionFeeFactorForBalanceWasNotImproved,
      })
    );

    const getNextLeverage = (withdrawAmount: bigint) => {
      const withdrawUsd = (withdrawAmount * collateralPrice) / expandDecimals(1, usdcToken.decimals);

      return (position.sizeInUsd * BASIS_POINTS_DIVISOR_BIGINT) / (position.collateralUsd - withdrawUsd);
    };

    expect(getNextLeverage(maxWithdraw)).toBe(maxAllowedLeverage);
    expect(getNextLeverage(maxWithdraw + expandDecimals(1, usdcToken.decimals))).toBeGreaterThan(maxAllowedLeverage);
  });
});
