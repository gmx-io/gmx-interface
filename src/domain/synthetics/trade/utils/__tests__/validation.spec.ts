import { describe, expect, it } from "vitest";

import { ARBITRUM } from "config/chains";
import { mockExternalSwapQuote } from "domain/synthetics/testUtils/mocks";
import { expandDecimals } from "lib/numbers";
import { mockMarketsInfoData, mockTokensData } from "sdk/test/mock";
import { TriggerThresholdType } from "sdk/utils/trade/types";

import { getIncreaseError, getSwapError } from "../validation";

const tokensData = mockTokensData({
  ETH: { balance: expandDecimals(100, 18) },
  USDC: { balance: expandDecimals(100_000, 6) },
});
const marketsInfoData = mockMarketsInfoData(tokensData, ["BTC-BTC-USDC"]);
const marketInfo = marketsInfoData["BTC-BTC-USDC"];
const fromToken = tokensData.ETH;
const toToken = tokensData.USDC;

const baseSwapParams = {
  chainId: ARBITRUM,
  fromToken,
  toToken,
  fromTokenAmount: expandDecimals(1, 18),
  fromUsd: expandDecimals(1000, 30),
  toTokenAmount: expandDecimals(1000, 6),
  toUsd: expandDecimals(1000, 30),
  isLimit: false,
  triggerRatio: undefined,
  markRatio: undefined,
  fees: undefined,
  swapPathStats: undefined,
  externalSwapQuote: undefined,
  isExternalSwapLoading: false,
  isWrapOrUnwrap: false,
  isStakeOrUnstake: false,
  swapLiquidity: 0n, // < toUsd → triggers Insufficient liquidity by default
  isTwap: false,
  numberOfParts: 1,
};

describe("getSwapError — isExternalSwapLoading gate", () => {
  it("returns 'Insufficient liquidity' when no external quote and no internal liquidity", () => {
    expect(getSwapError(baseSwapParams).buttonErrorMessage).toBe("Insufficient liquidity");
  });

  it("does NOT return 'Insufficient liquidity' while external swap quote is loading", () => {
    const result = getSwapError({ ...baseSwapParams, isExternalSwapLoading: true });
    expect(result.buttonErrorMessage).not.toBe("Insufficient liquidity");
  });

  it("does NOT return 'Insufficient liquidity' when external quote already exists", () => {
    const result = getSwapError({
      ...baseSwapParams,
      externalSwapQuote: mockExternalSwapQuote(),
    });
    expect(result.buttonErrorMessage).not.toBe("Insufficient liquidity");
  });

  it("ignores liquidity check entirely for limit (non-twap) orders", () => {
    const result = getSwapError({ ...baseSwapParams, isLimit: true });
    expect(result.buttonErrorMessage).not.toBe("Insufficient liquidity");
  });
});

const positionFee = (sizeDelta: bigint, bps = -10n) => ({
  deltaUsd: (sizeDelta * bps) / 10000n,
  bps,
  precisePercentage: 0n,
});

const baseIncreaseParams = {
  chainId: ARBITRUM,
  marketInfo,
  indexToken: tokensData.BTC,
  initialCollateralToken: fromToken,
  initialCollateralAmount: expandDecimals(1, 18),
  initialCollateralUsd: expandDecimals(1000, 30),
  targetCollateralToken: toToken,
  collateralUsd: expandDecimals(1000, 30),
  sizeDeltaUsd: expandDecimals(2000, 30),
  nextPositionValues: undefined,
  existingPosition: undefined,
  fees: { payTotalFees: positionFee(expandDecimals(2000, 30)) } as any,
  markPrice: expandDecimals(50000, 30),
  triggerPrice: undefined,
  externalSwapQuote: undefined,
  isExternalSwapLoading: false,
  swapPathStats: undefined,
  collateralLiquidity: 0n, // < initialCollateralUsd → would trigger "Insufficient liquidity to swap collateral"
  longLiquidity: expandDecimals(1_000_000, 30),
  shortLiquidity: expandDecimals(1_000_000, 30),
  minCollateralUsd: expandDecimals(10, 30),
  isLong: true,
  isLimit: false,
  isTwap: false,
  nextLeverageWithoutPnl: undefined,
  thresholdType: undefined,
  numberOfParts: 1,
  minPositionSizeUsd: 0n,
};

describe("getIncreaseError — isExternalSwapLoading gate", () => {
  it("returns 'No swap path found' when neither internal nor external swap is available", () => {
    const result = getIncreaseError(baseIncreaseParams);
    expect(result.buttonErrorMessage).toBe("No swap path found");
  });

  it("does NOT return 'No swap path found' while external swap is loading", () => {
    const result = getIncreaseError({ ...baseIncreaseParams, isExternalSwapLoading: true });
    expect(result.buttonErrorMessage).not.toBe("No swap path found");
  });

  it("returns 'Insufficient liquidity to swap collateral' when only internal swap exists but lacks liquidity", () => {
    const result = getIncreaseError({
      ...baseIncreaseParams,
      swapPathStats: {
        swapPath: ["0xmarket1"],
        swapSteps: [],
        tokenInAddress: fromToken.address,
        tokenOutAddress: toToken.address,
        totalSwapFeeUsd: 0n,
        totalSwapPriceImpactDeltaUsd: 0n,
        totalFeesDeltaUsd: 0n,
        usdOut: 0n,
        amountOut: 0n,
      } as any,
    });
    expect(result.buttonErrorMessage).toBe("Insufficient liquidity to swap collateral");
  });

  it("does NOT return 'Insufficient liquidity to swap collateral' while external swap is loading", () => {
    const result = getIncreaseError({
      ...baseIncreaseParams,
      isExternalSwapLoading: true,
      swapPathStats: {
        swapPath: ["0xmarket1"],
        swapSteps: [],
        tokenInAddress: fromToken.address,
        tokenOutAddress: toToken.address,
        totalSwapFeeUsd: 0n,
        totalSwapPriceImpactDeltaUsd: 0n,
        totalFeesDeltaUsd: 0n,
        usdOut: 0n,
        amountOut: 0n,
      } as any,
    });
    expect(result.buttonErrorMessage).not.toBe("Insufficient liquidity to swap collateral");
  });
});

describe("getIncreaseError — increase liquidation guard is Market-only", () => {
  const liqGuardParams = {
    ...baseIncreaseParams,
    initialCollateralToken: toToken, // USDC == targetCollateralToken → no swap path needed
    targetCollateralToken: toToken,
    initialCollateralAmount: expandDecimals(1000, 6), // USDC has 6 decimals; within the mock balance
    collateralLiquidity: expandDecimals(1_000_000, 30),
    nextPositionValues: {
      nextCollateralUsd: expandDecimals(1000, 30),
      nextLiqPrice: expandDecimals(60000, 30), // > markPrice (50000) → liquidatable for a long
    } as any,
    markPrice: expandDecimals(50000, 30),
    isLong: true,
  };

  it("Market Increase: blocks with 'Invalid liquidation price' when liquidatable at mark", () => {
    const result = getIncreaseError({ ...liqGuardParams, isLimit: false, triggerPrice: undefined });
    expect(result.buttonErrorMessage).toBe("Invalid liquidation price");
  });

  it("Limit Increase: does NOT block with 'Invalid liquidation price'", () => {
    const result = getIncreaseError({
      ...liqGuardParams,
      isLimit: true,
      triggerPrice: expandDecimals(49000, 30), // long limit trigger below mark → valid resting
      thresholdType: TriggerThresholdType.Below,
    });
    expect(result.buttonErrorMessage).not.toBe("Invalid liquidation price");
  });
});
