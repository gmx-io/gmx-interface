import { AVALANCHE } from "config/chains";
import { USD_DECIMALS } from "config/factors";
import { getPositionFee } from "domain/synthetics/fees";
import {
  expectBigNumberClose,
  MOCK_TXN_DATA,
  mockExternalSwapQuote,
  mockMarketsInfoData,
  mockPositionInfo,
  mockTokensData,
  usdToToken,
} from "domain/synthetics/testUtils/mocks";
import { ethers } from "ethers";
import { expandDecimals, getBasisPoints } from "lib/numbers";
import Token from "sdk/abis/Token.json";
import { getNativeToken } from "sdk/configs/tokens";
import { convertToTokenAmount, convertToUsd } from "sdk/utils/tokens";
import { describe, expect, it, vi } from "vitest";
import {
  getExternalCallsParams,
  getExternalSwapInputsByFromValue,
  getExternalSwapInputsByLeverageSize,
} from "../../externalSwaps/utils";
import { leverageBySizeValues, SwapPathStats } from "../../trade";

const MOCK_ACCOUNT = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

describe("getExternalCallsParams", () => {
  const tokenContract = new ethers.Contract(ethers.ZeroAddress, Token.abi);

  it("returns empty arrays when no txnData is provided", () => {
    const quote = mockExternalSwapQuote({ txnData: undefined });

    const result = getExternalCallsParams(AVALANCHE, MOCK_ACCOUNT, quote);
    expect(result).toEqual([]);
  });

  it("returns transaction data without approval when needSpenderApproval is false", () => {
    const quote = mockExternalSwapQuote({
      needSpenderApproval: false,
      txnData: MOCK_TXN_DATA,
    });

    const [addresses, callData, refundTokens, refundReceivers] = getExternalCallsParams(AVALANCHE, MOCK_ACCOUNT, quote);

    expect(addresses).toEqual([MOCK_TXN_DATA.to]);
    expect(callData).toEqual([MOCK_TXN_DATA.data]);
    expect(refundTokens).toEqual([getNativeToken(AVALANCHE).wrappedAddress, quote.inTokenAddress]);
    expect(refundReceivers).toEqual([MOCK_ACCOUNT, MOCK_ACCOUNT]);
  });

  it("includes approval transaction when needSpenderApproval is true", () => {
    const quote = mockExternalSwapQuote({
      needSpenderApproval: true,
      txnData: MOCK_TXN_DATA,
    });

    const expectedApprovalData = tokenContract.interface.encodeFunctionData("approve", [
      MOCK_TXN_DATA.to,
      ethers.MaxUint256,
    ]);

    const [addresses, callData, refundTokens, refundReceivers] = getExternalCallsParams(AVALANCHE, MOCK_ACCOUNT, quote);

    expect(addresses).toEqual([quote.inTokenAddress, MOCK_TXN_DATA.to]);
    expect(callData).toEqual([expectedApprovalData, MOCK_TXN_DATA.data]);
    expect(refundTokens).toEqual([
      getNativeToken(AVALANCHE).wrappedAddress, // WAVAX on Avalanche
      quote.inTokenAddress,
    ]);
    expect(refundReceivers).toEqual([MOCK_ACCOUNT, MOCK_ACCOUNT]);
  });

  it("handles native token address conversion", () => {
    const quote = mockExternalSwapQuote({
      inTokenAddress: getNativeToken(AVALANCHE).address, // Native token
      needSpenderApproval: true,
      txnData: MOCK_TXN_DATA,
    });

    const [addresses, callData, refundTokens, refundReceivers] = getExternalCallsParams(AVALANCHE, MOCK_ACCOUNT, quote);

    const expectedApprovalData = tokenContract.interface.encodeFunctionData("approve", [
      MOCK_TXN_DATA.to,
      ethers.MaxUint256,
    ]);

    const WAVAX = getNativeToken(AVALANCHE).wrappedAddress;

    expect(addresses).toEqual([
      WAVAX, // WAVAX address
      MOCK_TXN_DATA.to,
    ]);
    expect(callData).toEqual([expectedApprovalData, MOCK_TXN_DATA.data]);
    expect(refundTokens).toEqual([
      getNativeToken(AVALANCHE).wrappedAddress, // WAVAX on Avalanche
      getNativeToken(AVALANCHE).wrappedAddress,
    ]);
    expect(refundReceivers).toEqual([MOCK_ACCOUNT, MOCK_ACCOUNT]);
  });
});

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
    totalFeesDeltaUsd: totalSwapFeesDeltaUsd, // Total fees are negative
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
    expectBigNumberClose(result.usdIn, baseCollateralUsd);
    expectBigNumberClose(result.amountIn, baseAmountIn);
    expectBigNumberClose(result.usdOut, baseCollateralUsd);
    expectBigNumberClose(result.internalSwapAmounts.amountOut, baseCollateralAmount);

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

    expectBigNumberClose(reverseResult.usdIn, result.usdIn);
    expectBigNumberClose(reverseResult.usdOut, result.usdOut);

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
    expectBigNumberClose(result.usdIn, expectedBaseCollateralUsd);
    expectBigNumberClose(result.amountIn, expectedAmountIn);
    expectBigNumberClose(result.usdOut, expectedBaseCollateralUsd);
    expectBigNumberClose(result.internalSwapAmounts.amountOut, expectedBaseCollateralAmount);

    // check fees
    expect(result.internalSwapTotalFeeItem?.deltaUsd).toBe(mockSwapPathStats.totalFeesDeltaUsd);
    expectBigNumberClose(
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

    expectBigNumberClose(reverseResult.usdIn, result.usdIn);
    expectBigNumberClose(reverseResult.usdOut, result.usdOut, 200n);

    // expect fees to be the same
    expect(reverseResult.internalSwapTotalFeesDeltaUsd).toBe(result.internalSwapTotalFeesDeltaUsd);
    expect(reverseResult.internalSwapTotalFeeItem?.deltaUsd).toBe(result.internalSwapTotalFeeItem?.deltaUsd);
    expectBigNumberClose(reverseResult.internalSwapTotalFeeItem!.bps, result.internalSwapTotalFeeItem!.bps);
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

    expectBigNumberClose(result.amountIn, baseAmountIn);
    expectBigNumberClose(result.usdIn, baseCollateralUsd);
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
