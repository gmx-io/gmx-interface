import { describe, expect, it, vi } from "vitest";

import { USD_DECIMALS } from "config/factors";
import { getPositionFee } from "domain/synthetics/fees";
import { expectEqualWithPrecision, mockPositionInfo } from "domain/synthetics/testUtils/mocks";
import { expandDecimals, getBasisPoints } from "lib/numbers";
import { mockMarketsInfoData, mockTokensData, usdToToken } from "sdk/test/mock";
import { convertToTokenAmount, convertToUsd } from "sdk/utils/tokens";

import { getExternalSwapInputsByFromValue, getExternalSwapInputsByLeverageSize } from "../../externalSwaps/utils";
import { leverageBySizeValues, SwapPathStats } from "../../trade";

const MOCK_ACCOUNT = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

describe("getExternalSwapInputsByFromValue", () => {
  const tokensData = mockTokensData();
  const usdIn = expandDecimals(50_000, USD_DECIMALS);
  const amountIn = usdToToken(50_000, tokensData.ETH);
  const usdOut = expandDecimals(49_000, USD_DECIMALS);
  const amountOut = usdToToken(49_000, tokensData.USDC);
  const uiFeeFactor = 30n;

  const mockSwapPathStats: SwapPathStats = {
    swapPath: [],
    swapSteps: [],
    tokenInAddress: tokensData.ETH.address,
    tokenOutAddress: tokensData.USDC.address,
    totalSwapFeeUsd: expandDecimals(500, USD_DECIMALS),
    totalSwapPriceImpactDeltaUsd: expandDecimals(-300, USD_DECIMALS),
    totalFeesDeltaUsd: expandDecimals(-800, USD_DECIMALS),
    usdOut,
    amountOut,
  };

  const mockFindSwapPath = vi.fn().mockImplementation(() => mockSwapPathStats);

  it("calculates swap inputs correctly", () => {
    const result = getExternalSwapInputsByFromValue({
      tokenIn: tokensData.ETH,
      tokenOut: tokensData.USDC,
      amountIn,
      findSwapPath: mockFindSwapPath,
      uiFeeFactor,
    });

    expect(result.strategy).toBe("byFromValue");
    expect(result.internalSwapTotalFeeItem).toEqual({
      deltaUsd: mockSwapPathStats.totalFeesDeltaUsd,
      bps: getBasisPoints(mockSwapPathStats.totalFeesDeltaUsd, usdIn),
      precisePercentage: expect.any(BigInt),
    });
    expect(result.internalSwapTotalFeesDeltaUsd).toBe(mockSwapPathStats.totalFeesDeltaUsd);
  });

  it("handles undefined swapPathStats", () => {
    const mockFindSwapPath = vi.fn().mockReturnValue(undefined);

    const result = getExternalSwapInputsByFromValue({
      tokenIn: tokensData.ETH,
      tokenOut: tokensData.USDC,
      amountIn: 1000000n,
      findSwapPath: mockFindSwapPath,
      uiFeeFactor: 30n,
    });

    expect(result.internalSwapTotalFeeItem).toEqual(undefined);
    expect(result.internalSwapTotalFeesDeltaUsd).toBe(undefined);
  });
});

describe("getExternalSwapInputsByLeverageSize", () => {
  const tokensData = mockTokensData();
  const marketsInfoData = mockMarketsInfoData(tokensData, ["ETH-ETH-USDC"]);
  const marketInfo = marketsInfoData["ETH-ETH-USDC"];

  const indexTokenAmount = usdToToken(50_000, tokensData.ETH);
  const sizeDeltaUsd = convertToUsd(indexTokenAmount, tokensData.ETH.decimals, marketInfo.indexToken.prices.minPrice)!;

  const leverage = 20000n; // 2x
  const positionFee = getPositionFee(marketInfo, sizeDeltaUsd, false, undefined);
  const positionFeeUsd = positionFee.positionFeeUsd;
  const uiFeeFactor = 0n;

  const { baseCollateralAmount } = leverageBySizeValues({
    collateralToken: tokensData.USDC,
    leverage,
    sizeDeltaUsd,
    collateralPrice: tokensData.USDC.prices.minPrice,
    uiFeeFactor,
    positionFeeUsd,
    fundingFeeUsd: 0n,
    borrowingFeeUsd: 0n,
    uiFeeUsd: 0n,
    swapUiFeeUsd: 0n,
  });

  const baseCollateralUsd = convertToUsd(
    baseCollateralAmount,
    tokensData.USDC.decimals,
    tokensData.USDC.prices.maxPrice
  )!;

  const baseAmountIn = convertToTokenAmount(
    baseCollateralUsd,
    tokensData.ETH.decimals,
    tokensData.ETH.prices.minPrice
  )!;

  // Calculate expected input values
  const swapFees = expandDecimals(500, USD_DECIMALS);
  const swapPriceImpactDeltaUsd = expandDecimals(-300, USD_DECIMALS);
  const totalSwapFeesDeltaUsd = -swapFees + swapPriceImpactDeltaUsd; // Both fees and price impact are negative

  const mockSwapPathStats: SwapPathStats = {
    swapPath: [],
    swapSteps: [],
    tokenInAddress: tokensData.ETH.address,
    tokenOutAddress: tokensData.USDC.address,
    totalSwapFeeUsd: swapFees,
    totalSwapPriceImpactDeltaUsd: swapPriceImpactDeltaUsd,
    totalFeesDeltaUsd: totalSwapFeesDeltaUsd,
    usdOut: baseCollateralUsd,
    amountOut: baseCollateralAmount,
  };

  const mockFindSwapPath = vi.fn().mockImplementation(() => mockSwapPathStats);

  it("calculates swap inputs correctly with fees", () => {
    const result = getExternalSwapInputsByLeverageSize({
      tokenIn: tokensData.ETH,
      collateralToken: tokensData.USDC,
      marketInfo,
      indexTokenAmount,
      leverage,
      findSwapPath: mockFindSwapPath,
      existingPosition: undefined,
      uiFeeFactor,
      isLong: true,
      userReferralInfo: undefined,
    });

    // Check input/output values
    expect(result.usdIn).toBe(baseCollateralUsd);
    expect(result.amountIn).toBe(baseAmountIn);
    expect(result.usdOut).toBe(baseCollateralUsd);
    expect(result.internalSwapAmounts.amountOut).toBe(baseCollateralAmount);

    // check fees
    expect(result.internalSwapTotalFeeItem?.deltaUsd).toBe(mockSwapPathStats.totalFeesDeltaUsd);
    expect(result.internalSwapTotalFeeItem?.bps).toBe(
      getBasisPoints(mockSwapPathStats.totalFeesDeltaUsd, baseCollateralUsd)
    );

    // Verify reverse swap gives same results
    const reverseResult = getExternalSwapInputsByFromValue({
      tokenIn: tokensData.ETH,
      tokenOut: tokensData.USDC,
      amountIn: result.amountIn,
      findSwapPath: mockFindSwapPath,
      uiFeeFactor,
    });

    expectEqualWithPrecision(reverseResult.usdIn, result.usdIn);
    expectEqualWithPrecision(reverseResult.usdOut, result.usdOut);

    // expect fees to be the same
    expect(reverseResult.internalSwapTotalFeesDeltaUsd).toBe(result.internalSwapTotalFeesDeltaUsd);
    expect(reverseResult.internalSwapTotalFeeItem?.deltaUsd).toBe(result.internalSwapTotalFeeItem?.deltaUsd);
    expect(reverseResult.internalSwapTotalFeeItem?.bps).toBe(result.internalSwapTotalFeeItem?.bps);
  });

  it("calculates swap inputs with existing position", () => {
    const existingPosition = mockPositionInfo(
      {
        marketInfo,
        collateralTokenAddress: tokensData.USDC.address,
        account: MOCK_ACCOUNT,
        isLong: true,
        sizeInUsd: expandDecimals(100_000, USD_DECIMALS),
        collateralUsd: expandDecimals(50_000, USD_DECIMALS),
      },
      {
        pendingBorrowingFeesUsd: expandDecimals(100, USD_DECIMALS),
        pendingFundingFeesUsd: expandDecimals(200, USD_DECIMALS),
      }
    );

    const { baseCollateralAmount: expectedBaseCollateralAmount } = leverageBySizeValues({
      collateralToken: tokensData.USDC,
      leverage,
      sizeDeltaUsd,
      collateralPrice: tokensData.USDC.prices.minPrice,
      uiFeeFactor,
      positionFeeUsd,
      fundingFeeUsd: existingPosition.pendingFundingFeesUsd,
      borrowingFeeUsd: existingPosition.pendingBorrowingFeesUsd,
      uiFeeUsd: 0n,
      swapUiFeeUsd: 0n,
    });

    const expectedBaseCollateralUsd = convertToUsd(
      expectedBaseCollateralAmount,
      tokensData.USDC.decimals,
      tokensData.USDC.prices.maxPrice
    )!;

    const expectedAmountIn = convertToTokenAmount(
      expectedBaseCollateralUsd,
      tokensData.ETH.decimals,
      tokensData.ETH.prices.minPrice
    )!;

    const mockSwapPathStats: SwapPathStats = {
      swapPath: [],
      swapSteps: [],
      tokenInAddress: tokensData.ETH.address,
      tokenOutAddress: tokensData.USDC.address,
      totalSwapFeeUsd: swapFees,
      totalSwapPriceImpactDeltaUsd: swapPriceImpactDeltaUsd,
      totalFeesDeltaUsd: totalSwapFeesDeltaUsd,
      usdOut: expectedBaseCollateralUsd,
      amountOut: expectedBaseCollateralAmount,
    };

    const mockFindSwapPath = vi.fn().mockImplementation(() => ({
      ...mockSwapPathStats,
      usdOut: expectedBaseCollateralUsd,
      amountOut: expectedBaseCollateralAmount,
    }));

    const result = getExternalSwapInputsByLeverageSize({
      tokenIn: tokensData.ETH,
      collateralToken: tokensData.USDC,
      marketInfo,
      indexTokenAmount,
      leverage,
      findSwapPath: mockFindSwapPath,
      existingPosition,
      uiFeeFactor,
      isLong: true,
      userReferralInfo: undefined,
    });

    // Check input/output values
    expect(result.usdIn).toBe(expectedBaseCollateralUsd);
    expect(result.amountIn).toBe(expectedAmountIn);
    expect(result.usdOut).toBe(expectedBaseCollateralUsd);
    expect(result.internalSwapAmounts.amountOut).toBe(expectedBaseCollateralAmount);

    // check fees
    expect(result.internalSwapTotalFeeItem?.deltaUsd).toBe(mockSwapPathStats.totalFeesDeltaUsd);
    expectEqualWithPrecision(
      result.internalSwapTotalFeeItem?.bps || 0n,
      getBasisPoints(mockSwapPathStats.totalFeesDeltaUsd, expectedBaseCollateralUsd)
    );

    // Verify reverse swap gives same results
    const reverseResult = getExternalSwapInputsByFromValue({
      tokenIn: tokensData.ETH,
      tokenOut: tokensData.USDC,
      amountIn: result.amountIn,
      findSwapPath: mockFindSwapPath,
      uiFeeFactor,
    });

    expectEqualWithPrecision(reverseResult.usdIn, result.usdIn);
    expectEqualWithPrecision(reverseResult.usdOut, result.usdOut);

    // expect fees to be the same
    expect(reverseResult.internalSwapTotalFeesDeltaUsd).toBe(result.internalSwapTotalFeesDeltaUsd);
    expect(reverseResult.internalSwapTotalFeeItem?.deltaUsd).toBe(result.internalSwapTotalFeeItem?.deltaUsd);
    expectEqualWithPrecision(
      reverseResult.internalSwapTotalFeeItem?.bps || 0n,
      result.internalSwapTotalFeeItem?.bps || 0n
    );
  });

  it("handles undefined swapPathStats", () => {
    const mockFindSwapPath = vi.fn().mockReturnValue(undefined);

    const result = getExternalSwapInputsByLeverageSize({
      tokenIn: tokensData.ETH,
      collateralToken: tokensData.USDC,
      marketInfo,
      indexTokenAmount,
      leverage,
      findSwapPath: mockFindSwapPath,
      uiFeeFactor,
      isLong: true,
      userReferralInfo: undefined,
    });

    expectEqualWithPrecision(result.amountIn, baseAmountIn);
    expectEqualWithPrecision(result.usdIn, baseCollateralUsd);
    expect(result.internalSwapTotalFeeItem).toEqual(undefined);
    expect(result.internalSwapTotalFeesDeltaUsd).toBe(undefined);
  });

  it("handles zero indexTokenAmount", () => {
    const result = getExternalSwapInputsByLeverageSize({
      tokenIn: tokensData.ETH,
      collateralToken: tokensData.USDC,
      marketInfo,
      indexTokenAmount: 0n,
      leverage,
      findSwapPath: mockFindSwapPath,
      uiFeeFactor,
      isLong: true,
      userReferralInfo: undefined,
    });

    expect(result.amountIn).toBe(0n);
    expect(result.usdIn).toBe(0n);
  });
});
