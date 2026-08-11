import { describe, expect, it } from "vitest";

import { ARBITRUM } from "config/chains";
import { mockExternalSwapQuote } from "domain/synthetics/testUtils/mocks";
import { expandDecimals, formatUsd } from "lib/numbers";
import { mockMarketsInfoData, mockTokensData } from "sdk/test/mock";
import { TriggerThresholdType } from "sdk/utils/trade/types";

import {
  getConditionalDepositError,
  getConditionalDepositWarning,
  getEditCollateralError,
  getIncreaseError,
  getMarginDepositAutoCancelLimitMessage,
  getMarginDepositBeyondLiqPriceMessage,
  getMarginDepositInsufficientMessage,
  getNativeGasError,
  getSwapError,
  ValidationBannerErrorName,
  ValidationButtonTooltipName,
} from "../validation";

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
  isFromTokenGmxAccount: false,
  swapLiquidity: 0n, // < toUsd → triggers Insufficient liquidity by default
  isTwap: false,
  numberOfParts: 1,
};

describe("getSwapError — isExternalSwapLoading gate", () => {
  it("returns 'Insufficient GMX pool liquidity' when no external quote and no internal liquidity", () => {
    const result = getSwapError(baseSwapParams);
    expect(result.buttonErrorMessage).toBe("Insufficient GMX pool liquidity");
    expect(result.buttonTooltipName).toBe(ValidationButtonTooltipName.insufficientGmxPoolLiquidity);
  });

  it("does NOT return 'Insufficient GMX pool liquidity' while external swap quote is loading", () => {
    const result = getSwapError({ ...baseSwapParams, isExternalSwapLoading: true });
    expect(result.buttonErrorMessage).not.toBe("Insufficient GMX pool liquidity");
  });

  it("does NOT return 'Insufficient GMX pool liquidity' when external quote already exists", () => {
    const result = getSwapError({
      ...baseSwapParams,
      externalSwapQuote: mockExternalSwapQuote(),
    });
    expect(result.buttonErrorMessage).not.toBe("Insufficient GMX pool liquidity");
  });

  it("ignores liquidity check entirely for limit (non-twap) orders", () => {
    const result = getSwapError({ ...baseSwapParams, isLimit: true });
    expect(result.buttonErrorMessage).not.toBe("Insufficient GMX pool liquidity");
  });

  it("ignores liquidity check for wrap/unwrap", () => {
    const result = getSwapError({ ...baseSwapParams, isWrapOrUnwrap: true });
    expect(result.buttonErrorMessage).not.toBe("Insufficient GMX pool liquidity");
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
    initialCollateralToken: toToken,
    targetCollateralToken: toToken,
    initialCollateralAmount: expandDecimals(1000, 6),
    collateralLiquidity: expandDecimals(1_000_000, 30),
    nextPositionValues: {
      nextCollateralUsd: expandDecimals(1000, 30),
      nextLiqPrice: expandDecimals(60000, 30),
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
      triggerPrice: expandDecimals(49000, 30),
      thresholdType: TriggerThresholdType.Below,
    });
    expect(result.buttonErrorMessage).not.toBe("Invalid liquidation price");
  });
});

describe("getSwapError — GMX Account native token guard", () => {
  const nativeEth = { ...tokensData.ETH, isNative: true, balance: expandDecimals(100, 18) };
  const weth = {
    ...tokensData.ETH,
    address: "WETH",
    symbol: "WETH",
    isWrapped: true,
    balance: expandDecimals(100, 18),
  };

  // balance/liquidity pass, so only the GMX Account guard is under test
  const unwrapParams = {
    ...baseSwapParams,
    fromToken: weth,
    toToken: nativeEth,
    isWrapOrUnwrap: true,
    swapLiquidity: expandDecimals(1_000_000, 30),
  };

  const expectedMessage = "GMX Account swaps cannot use native ETH. Select WETH or withdraw to wallet first.";

  it("allows wallet WETH -> ETH unwrap", () => {
    const result = getSwapError({ ...unwrapParams, isFromTokenGmxAccount: false });
    expect(result.buttonErrorMessage).toBeUndefined();
  });

  it("blocks GMX Account WETH -> ETH unwrap with clear copy", () => {
    const result = getSwapError({ ...unwrapParams, isFromTokenGmxAccount: true });
    expect(result.buttonErrorMessage).toBe(expectedMessage);
  });

  it("blocks GMX Account ETH -> WETH wrap with clear copy", () => {
    const result = getSwapError({
      ...unwrapParams,
      fromToken: nativeEth,
      toToken: weth,
      isFromTokenGmxAccount: true,
    });
    expect(result.buttonErrorMessage).toBe(expectedMessage);
  });
});

const baseEditCollateralParams = {
  collateralDeltaAmount: expandDecimals(10, 6),
  collateralDeltaUsd: expandDecimals(10, 30),
  nextLiqPrice: undefined,
  nextLeverage: undefined,
  position: undefined,
  isDeposit: true,
  depositToken: toToken,
  depositAmount: expandDecimals(10, 6),
  minDepositUsd: undefined,
  marketInfo,
  maxWithdrawAmount: 0n,
};

describe("getEditCollateralError — min deposit covering pending fees", () => {
  it("returns the min deposit error when the deposit is below the required minimum", () => {
    const result = getEditCollateralError({
      ...baseEditCollateralParams,
      minDepositUsd: expandDecimals(25, 30),
    });
    expect(result.buttonErrorMessage).toBe(`Min deposit: ${formatUsd(expandDecimals(25, 30))}`);
    expect(result.buttonTooltipName).toBe(ValidationButtonTooltipName.minDeposit);
  });

  it("passes when the deposit covers the required minimum", () => {
    const result = getEditCollateralError({
      ...baseEditCollateralParams,
      collateralDeltaAmount: expandDecimals(30, 6),
      collateralDeltaUsd: expandDecimals(30, 30),
      depositAmount: expandDecimals(30, 6),
      minDepositUsd: expandDecimals(25, 30),
    });
    expect(result.buttonErrorMessage).toBeUndefined();
  });

  it("keeps ordinary deposits without a pending-fee shortfall unaffected", () => {
    const result = getEditCollateralError(baseEditCollateralParams);
    expect(result.buttonErrorMessage).toBeUndefined();
  });

  it("does not apply the min deposit check to withdrawals", () => {
    const result = getEditCollateralError({
      ...baseEditCollateralParams,
      isDeposit: false,
      minDepositUsd: expandDecimals(25, 30),
      maxWithdrawAmount: expandDecimals(100, 6),
    });
    expect(result.buttonErrorMessage).toBeUndefined();
  });
});

const baseConditionalDepositParams = {
  collateralDeltaAmount: expandDecimals(1000, 6),
  collateralDeltaUsd: expandDecimals(1000, 30),
  depositToken: toToken,
  depositAmount: expandDecimals(1000, 6),
  minDepositUsd: undefined,
  isLong: true,
  markPrice: expandDecimals(50_000, 30),
  triggerPrice: expandDecimals(45_000, 30),
  currentLiqPrice: expandDecimals(40_000, 30),
  nextLiqPrice: expandDecimals(30_000, 30),
  isAutoCancelLimitReached: false,
};

describe("getConditionalDepositError", () => {
  it("passes a well-formed deposit", () => {
    expect(getConditionalDepositError(baseConditionalDepositParams).buttonErrorMessage).toBeUndefined();
  });

  it("reuses the shared amount check", () => {
    const result = getConditionalDepositError({
      ...baseConditionalDepositParams,
      collateralDeltaAmount: 0n,
      collateralDeltaUsd: 0n,
    });
    expect(result.buttonErrorMessage).toBe("Enter an amount");
  });

  it("reuses the shared balance check", () => {
    const result = getConditionalDepositError({
      ...baseConditionalDepositParams,
      depositAmount: expandDecimals(200_000, 6),
    });
    expect(result.buttonErrorMessage).toBe("Insufficient USDC balance");
  });

  it("reuses the shared min deposit check", () => {
    const result = getConditionalDepositError({
      ...baseConditionalDepositParams,
      minDepositUsd: expandDecimals(2000, 30),
    });
    expect(result.buttonTooltipName).toBe(ValidationButtonTooltipName.minDeposit);
  });

  it("requires a trigger price", () => {
    expect(
      getConditionalDepositError({ ...baseConditionalDepositParams, triggerPrice: undefined }).buttonErrorMessage
    ).toBe("Enter a price");
    expect(getConditionalDepositError({ ...baseConditionalDepositParams, triggerPrice: 0n }).buttonErrorMessage).toBe(
      "Enter a price"
    );
  });

  it("requires a long trigger below the mark price", () => {
    const result = getConditionalDepositError({
      ...baseConditionalDepositParams,
      triggerPrice: expandDecimals(50_000, 30),
    });
    expect(result.buttonErrorMessage).toBe("Set trigger price below mark price");
  });

  it("requires a short trigger above the mark price", () => {
    const result = getConditionalDepositError({
      ...baseConditionalDepositParams,
      isLong: false,
      triggerPrice: expandDecimals(50_000, 30),
      currentLiqPrice: expandDecimals(60_000, 30),
      nextLiqPrice: expandDecimals(70_000, 30),
    });
    expect(result.buttonErrorMessage).toBe("Set trigger price above mark price");
  });

  it("blocks when the auto-cancel order limit is reached", () => {
    const result = getConditionalDepositError({
      ...baseConditionalDepositParams,
      isAutoCancelLimitReached: true,
    });
    expect(result.buttonErrorMessage).toBe("Auto-cancel order limit reached");
    expect(result.buttonTooltipName).toBe(ValidationButtonTooltipName.marginDepositAutoCancelLimit);
  });

  it("blocks when the deposit is insufficient at the trigger price", () => {
    const result = getConditionalDepositError({
      ...baseConditionalDepositParams,
      nextLiqPrice: expandDecimals(46_000, 30),
    });
    expect(result.buttonErrorMessage).toBe("Insufficient deposit at trigger price");
    expect(result.buttonTooltipName).toBe(ValidationButtonTooltipName.marginDepositInsufficient);
  });

  it("does not block when the trigger is only beyond the current liquidation price", () => {
    const result = getConditionalDepositError({
      ...baseConditionalDepositParams,
      currentLiqPrice: expandDecimals(46_000, 30),
    });
    expect(result.buttonErrorMessage).toBeUndefined();
  });
});

describe("getConditionalDepositWarning", () => {
  it("warns when the trigger is at or beyond the current liquidation price", () => {
    expect(
      getConditionalDepositWarning({
        isLong: true,
        triggerPrice: expandDecimals(45_000, 30),
        currentLiqPrice: expandDecimals(46_000, 30),
        nextLiqPrice: expandDecimals(30_000, 30),
      })
    ).toBe(getMarginDepositBeyondLiqPriceMessage());
  });

  it("stays silent for a safe trigger and for the blocking state", () => {
    expect(
      getConditionalDepositWarning({
        isLong: true,
        triggerPrice: expandDecimals(45_000, 30),
        currentLiqPrice: expandDecimals(40_000, 30),
        nextLiqPrice: expandDecimals(30_000, 30),
      })
    ).toBeUndefined();

    expect(
      getConditionalDepositWarning({
        isLong: true,
        triggerPrice: expandDecimals(45_000, 30),
        currentLiqPrice: expandDecimals(46_000, 30),
        nextLiqPrice: expandDecimals(46_000, 30),
      })
    ).toBeUndefined();
  });
});

describe("margin deposit banner copy", () => {
  it("exposes the exact blocking and warning messages", () => {
    expect(getMarginDepositAutoCancelLimitMessage()).toBe(
      "Auto-cancel order limit reached for this position. Cancel an existing order to create another margin deposit."
    );
    expect(getMarginDepositInsufficientMessage()).toBe(
      "This deposit would not leave the position above its liquidation requirement at the trigger price. Increase the deposit amount or move the trigger farther from liquidation."
    );
    expect(getMarginDepositBeyondLiqPriceMessage()).toBe(
      "This trigger is at or beyond the estimated liquidation price. The margin deposit will be attempted before liquidation when eligible, but execution is not guaranteed."
    );
  });
});

describe("getNativeGasError", () => {
  it("skips validation while the fee or balance is loading", () => {
    expect(getNativeGasError({ networkFee: undefined, nativeBalance: 0n })).toEqual({});
    expect(getNativeGasError({ networkFee: 1n, nativeBalance: undefined })).toEqual({});
  });

  it("allows a balance equal to the network fee", () => {
    expect(getNativeGasError({ networkFee: 1n, nativeBalance: 1n })).toEqual({});
  });

  it("returns the native-token balance error when the fee exceeds the balance", () => {
    expect(getNativeGasError({ networkFee: 2n, nativeBalance: 1n })).toEqual({
      buttonErrorMessage: "Insufficient gas balance",
      bannerErrorName: ValidationBannerErrorName.insufficientNativeTokenBalance,
    });
  });
});
