import { describe, expect, it } from "vitest";

import { OrderType } from "domain/synthetics/orders";
import { mockMarketsInfoData, mockTokensData, usdToToken } from "sdk/test/mock";
import { bigMath } from "sdk/utils/bigmath";
import { applyFactor, expandDecimals } from "sdk/utils/numbers";
import { FindSwapPath } from "sdk/utils/trade/types";

import {
  getIncreasePositionAmounts,
  getIncreasePositionPrices,
  leverageBySizeValues,
} from "../../trade/utils/increase";

describe("getIncreasePositionPrices", () => {
  it("triggerPrice for limit order with ETH as initial collateral", () => {
    const tokensData = mockTokensData();
    const triggerPrice = 123n;

    const prices = getIncreasePositionPrices({
      triggerPrice,
      limitOrderType: OrderType.LimitIncrease,
      indexToken: tokensData.ETH,
      initialCollateralToken: tokensData.ETH,
      collateralToken: tokensData.USDC,
      isLong: true,
    });

    expect(prices.indexPrice).toBe(triggerPrice);
    expect(prices.initialCollateralPrice).toBe(tokensData.ETH.prices.minPrice);
    expect(prices.collateralPrice).toBe(tokensData.USDC.prices.minPrice);
  });

  it("triggerPrice for limit order with ETH as target collateral", () => {
    const tokensData = mockTokensData();
    const triggerPrice = 123n;

    const prices = getIncreasePositionPrices({
      triggerPrice,
      indexToken: tokensData.ETH,
      initialCollateralToken: tokensData.USDC,
      collateralToken: tokensData.ETH,
      isLong: true,
      limitOrderType: OrderType.LimitIncrease,
    });

    expect(prices.indexPrice).toBe(triggerPrice);
    expect(prices.initialCollateralPrice).toBe(tokensData.USDC.prices.minPrice);
    expect(prices.collateralPrice).toBe(tokensData.ETH.prices.minPrice);
  });

  it("markPrice for Long market order", () => {
    const tokensData = mockTokensData();

    const prices = getIncreasePositionPrices({
      indexToken: tokensData.ETH,
      collateralToken: tokensData.USDC,
      initialCollateralToken: tokensData.ETH,
      isLong: true,
    });

    expect(prices.indexPrice).toBe(tokensData.ETH.prices.maxPrice);
    expect(prices.initialCollateralPrice).toBe(tokensData.ETH.prices.minPrice);
    expect(prices.collateralPrice).toBe(tokensData.USDC.prices.minPrice);
  });

  it("markPrice for Short market order", () => {
    const tokensData = mockTokensData();

    const prices = getIncreasePositionPrices({
      indexToken: tokensData.BTC,
      collateralToken: tokensData.USDC,
      initialCollateralToken: tokensData.DAI,
      isLong: false,
    });

    expect(prices.indexPrice).toBe(tokensData.BTC.prices.minPrice); // minPrice for isLong = false
    expect(prices.initialCollateralPrice).toBe(tokensData.DAI.prices.minPrice);
    expect(prices.collateralPrice).toBe(tokensData.USDC.prices.minPrice);
  });
});

describe("leverageBySizeValues", () => {
  it("computes collateral and baseCollateralUsd properly for non-zero sizeDeltaUsd", () => {
    const tokensData = mockTokensData();
    const collateralPrice = tokensData.USDC.prices.minPrice;

    const result = leverageBySizeValues({
      collateralToken: tokensData.USDC,
      leverage: 20000n, // 2.0 in BPS
      sizeDeltaUsd: 1000n,
      collateralPrice,
      uiFeeFactor: 0n,
      positionFeeUsd: 10n,
      fundingFeeUsd: 5n,
      borrowingFeeUsd: 2n,
      uiFeeUsd: 3n,
      swapUiFeeUsd: 4n,
    });

    // collateralDeltaUsd = sizeDeltaUsd / leverage = 1000 / 2 = 500
    expect(result.collateralDeltaUsd).toBe(500n);
    // baseCollateralUsd = 500 + fees(10 + 5 + 2 + 3 + 4) = 524
    expect(result.baseCollateralUsd).toBe(524n);

    expect(result.collateralDeltaAmount).toBe(
      bigMath.mulDiv(500n, 10n ** BigInt(tokensData.USDC.decimals), collateralPrice)
    );
    expect(result.baseCollateralAmount).toBe(
      bigMath.mulDiv(524n, 10n ** BigInt(tokensData.USDC.decimals), collateralPrice)
    );
  });

  it("returns 0 for all values when sizeDeltaUsd is 0", () => {
    const tokensData = mockTokensData();

    const result = leverageBySizeValues({
      collateralToken: tokensData.SOL,
      leverage: 20000n,
      sizeDeltaUsd: 0n,
      collateralPrice: tokensData.SOL.prices.minPrice,
      uiFeeFactor: 0n,
      positionFeeUsd: 10n,
      fundingFeeUsd: 10n,
      borrowingFeeUsd: 10n,
      uiFeeUsd: 10n,
      swapUiFeeUsd: 10n,
    });

    expect(result.collateralDeltaUsd).toBe(0n);
    expect(result.collateralDeltaAmount).toBe(0n);
    expect(result.baseCollateralUsd).toBe(0n);
    expect(result.baseCollateralAmount).toBe(0n);
  });

  it("accounts for all fees in baseCollateralUsd calculation", () => {
    const tokensData = mockTokensData();
    const collateralPrice = tokensData.DAI.prices.minPrice;

    const result = leverageBySizeValues({
      collateralToken: tokensData.DAI,
      leverage: 25000n, // 2.5x
      sizeDeltaUsd: 5000n,
      collateralPrice,
      uiFeeFactor: 0n,
      positionFeeUsd: 100n,
      fundingFeeUsd: 50n,
      borrowingFeeUsd: 10n,
      uiFeeUsd: 20n,
      swapUiFeeUsd: 30n,
    });

    // collateralDeltaUsd = 5000 / 2.5 = 2000
    expect(result.collateralDeltaUsd).toBe(2000n);
    // baseCollateralUsd = 2000 + fees(100 + 50 + 10 + 20 + 30) = 2210
    expect(result.baseCollateralUsd).toBe(2210n);
  });
});

describe("getIncreasePositionAmounts", () => {
  it("deducts the swap UI fee once for collateral-based increases", () => {
    const tokensData = mockTokensData();
    const marketInfo = {
      ...mockMarketsInfoData(tokensData, ["ETH-ETH-USDC"])["ETH-ETH-USDC"],
      positionFeeFactorForBalanceWasImproved: 0n,
      positionFeeFactorForBalanceWasNotImproved: 0n,
    };
    const rawSwapUsdOut = expandDecimals(1000, 30);
    const rawSwapAmountOut = usdToToken(1000, tokensData.USDC);
    const uiFeeFactor = expandDecimals(1, 28);

    const findSwapPath: FindSwapPath = () => ({
      swapPath: [marketInfo.marketTokenAddress],
      swapSteps: [
        {
          marketAddress: marketInfo.marketTokenAddress,
          tokenInAddress: tokensData.ETH.address,
          tokenOutAddress: tokensData.USDC.address,
          isWrap: false,
          isUnwrap: false,
          swapFeeAmount: 0n,
          swapFeeUsd: 0n,
          priceImpactDeltaUsd: 0n,
          amountIn: usdToToken(1000, tokensData.ETH),
          amountInAfterFees: usdToToken(1000, tokensData.ETH),
          usdIn: rawSwapUsdOut,
          amountOut: rawSwapAmountOut,
          usdOut: rawSwapUsdOut,
        },
      ],
      totalSwapPriceImpactDeltaUsd: 0n,
      totalSwapFeeUsd: 0n,
      totalFeesDeltaUsd: 0n,
      tokenInAddress: tokensData.ETH.address,
      tokenOutAddress: tokensData.USDC.address,
      usdOut: rawSwapUsdOut,
      amountOut: rawSwapAmountOut,
    });

    const result = getIncreasePositionAmounts({
      marketInfo,
      indexToken: tokensData.ETH,
      initialCollateralToken: tokensData.ETH,
      collateralToken: tokensData.USDC,
      isLong: true,
      initialCollateralAmount: usdToToken(1000, tokensData.ETH),
      position: undefined,
      externalSwapQuote: undefined,
      indexTokenAmount: undefined,
      leverage: 10_000n,
      userReferralInfo: undefined,
      strategy: "leverageByCollateral",
      findSwapPath,
      uiFeeFactor,
      isSetAcceptablePriceImpactEnabled: false,
    });

    const swapUiFeeUsd = applyFactor(rawSwapUsdOut, uiFeeFactor);
    const netSwapUsdOut = rawSwapUsdOut - swapUiFeeUsd;
    const baseUiFeeUsd = applyFactor(netSwapUsdOut, uiFeeFactor);
    const expectedSizeDeltaUsd = netSwapUsdOut - baseUiFeeUsd;
    const expectedUiFeeUsd = applyFactor(expectedSizeDeltaUsd, uiFeeFactor);

    expect(result.swapUiFeeUsd).toBe(swapUiFeeUsd);
    expect(result.sizeDeltaUsd).toBe(expectedSizeDeltaUsd);
    expect(result.collateralDeltaUsd).toBe(netSwapUsdOut - expectedUiFeeUsd);
  });
});
