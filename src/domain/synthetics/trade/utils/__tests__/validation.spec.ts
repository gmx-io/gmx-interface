import { zeroAddress } from "viem";
import { describe, expect, it } from "vitest";

import { ARBITRUM, SOURCE_BASE_MAINNET } from "config/chains";
import { ExpressTxnParams } from "domain/synthetics/express";
import { getSourceChainNetworkFeeSource } from "domain/synthetics/fees/networkFeeSource";
import { mockExternalSwapQuote } from "domain/synthetics/testUtils/mocks";
import type { TokenData } from "domain/synthetics/tokens";
import type { DirectDepositAccess } from "domain/synthetics/whitelists/utils";
import { expandDecimals, formatUsd } from "lib/numbers";
import { mockMarketsInfoData, mockTokensData } from "sdk/test/mock";
import { PositionMarginFailureReason, PositionMarginState } from "sdk/utils/trade/increaseMarginCheck";
import { TriggerThresholdType } from "sdk/utils/trade/types";

import {
  ERC20_APPROVE_GAS_LIMIT,
  getApprovalGasError,
  getConditionalDepositError,
  getConditionalDepositWarning,
  getDecreaseError,
  getEditCollateralError,
  getExpressError,
  getGmNativeGasError,
  getGmShiftError,
  getGmSwapError,
  getInsufficientFeeButtonMessage,
  getIncreaseError,
  getMarginDepositAutoCancelLimitMessage,
  getMarginDepositBeyondLiqPriceMessage,
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
  resultingPositionMarginState: undefined,
  isResultingPositionCheckBlocking: false,
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
    expect(getMarginDepositBeyondLiqPriceMessage()).toBe(
      "This trigger is at or beyond the estimated liquidation price. The margin deposit will be attempted before liquidation when eligible, but execution is not guaranteed."
    );
  });
});

describe("getEditCollateralError — invalid liquidation price tooltip", () => {
  it.each([
    { isLong: true, nextLiqPrice: expandDecimals(55_000, 30) },
    { isLong: false, nextLiqPrice: expandDecimals(45_000, 30) },
  ])("adds remediation context for a $isLong position", ({ isLong, nextLiqPrice }) => {
    const result = getEditCollateralError({
      ...baseEditCollateralParams,
      isDeposit: false,
      maxWithdrawAmount: expandDecimals(100, 6),
      nextLiqPrice,
      position: {
        isLong,
        markPrice: expandDecimals(50_000, 30),
      } as any,
    });

    expect(result.buttonErrorMessage).toBe("Invalid liquidation price");
    expect(result.buttonTooltipName).toBe(ValidationButtonTooltipName.liqPriceGtMarkPrice);
  });
});

describe("getEditCollateralError — withdrawal above the max", () => {
  const withdrawParams = {
    ...baseEditCollateralParams,
    isDeposit: false,
    maxWithdrawAmount: expandDecimals(10, 6),
  };

  it("passes a withdrawal equal to the max", () => {
    expect(getEditCollateralError(withdrawParams).buttonErrorMessage).toBeUndefined();
  });

  it("blocks a withdrawal above the max with the max-leverage state", () => {
    const result = getEditCollateralError({
      ...withdrawParams,
      collateralDeltaAmount: expandDecimals(10, 6) + 1n,
    });

    expect(result.buttonErrorMessage).toBe("Max leverage exceeded");
    expect(result.buttonTooltipName).toBe(ValidationButtonTooltipName.maxLeverage);
  });

  it("keeps the max-leverage state when the withdrawal also breaks the leverage cap and the liquidation price", () => {
    const result = getEditCollateralError({
      ...withdrawParams,
      collateralDeltaAmount: expandDecimals(20, 6),
      nextLeverage: 1_000n * 10_000n,
      nextLiqPrice: expandDecimals(55_000, 30),
      position: { isLong: true, markPrice: expandDecimals(50_000, 30) } as any,
    });

    expect(result.buttonErrorMessage).toBe("Max leverage exceeded");
    expect(result.buttonTooltipName).toBe(ValidationButtonTooltipName.maxLeverage);
  });

  it("says the withdrawal is not available when nothing can be withdrawn", () => {
    expect(getEditCollateralError({ ...withdrawParams, maxWithdrawAmount: 0n }).buttonErrorMessage).toBe(
      "Withdrawal not available"
    );
  });

  it("does not apply the max to deposits", () => {
    const result = getEditCollateralError({
      ...baseEditCollateralParams,
      collateralDeltaAmount: expandDecimals(30, 6),
      depositAmount: expandDecimals(30, 6),
      maxWithdrawAmount: expandDecimals(10, 6),
    });

    expect(result.buttonErrorMessage).toBeUndefined();
  });
});

describe("getDecreaseError — remaining-position margin check", () => {
  const violation = (reason: PositionMarginFailureReason): PositionMarginState => ({
    isLiquidatable: true,
    reason,
    remainingCollateralUsd: 0n,
    minCollateralUsd: 0n,
    minCollateralUsdForLeverage: 0n,
  });

  const baseDecreaseParams = {
    marketInfo,
    inputSizeUsd: expandDecimals(250, 30),
    sizeDeltaUsd: expandDecimals(250, 30),
    receiveToken: toToken,
    isTrigger: false,
    triggerPrice: undefined,
    markPrice: expandDecimals(50_000, 30),
    existingPosition: undefined,
    nextPositionValues: undefined,
    nextLeverage: undefined,
    isLong: true,
    isContractAccount: false,
    minCollateralUsd: expandDecimals(1, 30),
    isNotEnoughReceiveTokenLiquidity: false,
    triggerThresholdType: undefined,
    minPositionSizeUsd: expandDecimals(1, 30),
    isTwap: false,
    numberOfParts: 0,
    remainingPositionMarginState: undefined,
    shouldValidateLeftoverCollateral: true,
    isInsufficientCollateralForCosts: false,
  };

  it.each([
    PositionMarginFailureReason.MinCollateralForLeverage,
    PositionMarginFailureReason.NonPositiveRemainingMargin,
  ])("blocks a partial close the contract would reject with '%s'", (reason) => {
    const result = getDecreaseError({ ...baseDecreaseParams, remainingPositionMarginState: violation(reason) });

    expect(result.buttonErrorMessage).toBe("Max leverage exceeded");
    expect(result.buttonTooltipName).toBe(ValidationButtonTooltipName.remainingPositionMaxLeverage);
    expect(result.buttonTooltipMessage).toBe(
      "The remaining position would exceed the maximum allowed leverage. Close a larger part, close the position fully, or add margin first."
    );
  });

  it("does not block when the remainder passes or is not validated", () => {
    expect(getDecreaseError(baseDecreaseParams).buttonErrorMessage).toBeUndefined();

    expect(
      getDecreaseError({
        ...baseDecreaseParams,
        remainingPositionMarginState: {
          isLiquidatable: false,
          reason: undefined,
          remainingCollateralUsd: 1n,
          minCollateralUsd: 0n,
          minCollateralUsdForLeverage: 1n,
        },
      }).buttonErrorMessage
    ).toBeUndefined();
  });

  it("caps the leverage it is given, whatever the displayed next leverage is", () => {
    const displayedNextValues = { nextLeverage: 10n * 10_000n } as any;

    expect(
      getDecreaseError({
        ...baseDecreaseParams,
        nextPositionValues: displayedNextValues,
        nextLeverage: 1_000n * 10_000n,
      }).buttonErrorMessage
    ).toMatch(/^Max leverage: /);

    expect(
      getDecreaseError({
        ...baseDecreaseParams,
        nextPositionValues: { nextLeverage: 1_000n * 10_000n } as any,
        nextLeverage: 10n * 10_000n,
      }).buttonErrorMessage
    ).toBeUndefined();
  });
});

describe("getNativeGasError", () => {
  it("skips validation while the fee or balance is loading", () => {
    expect(getNativeGasError({ chainId: ARBITRUM, networkFee: undefined, nativeBalance: 0n })).toEqual({});
    expect(getNativeGasError({ chainId: ARBITRUM, networkFee: 1n, nativeBalance: undefined })).toEqual({});
  });

  it("allows a balance equal to the network fee", () => {
    expect(getNativeGasError({ chainId: ARBITRUM, networkFee: 1n, nativeBalance: 1n })).toEqual({});
  });

  it("names the native token and the wallet when the fee exceeds the balance", () => {
    expect(getNativeGasError({ chainId: ARBITRUM, networkFee: 2n, nativeBalance: 1n })).toEqual({
      buttonErrorMessage: "Insufficient ETH in Wallet",
      bannerErrorName: ValidationBannerErrorName.insufficientNativeTokenBalance,
    });
  });
});

describe("getGmNativeGasError", () => {
  const ETH = { address: zeroAddress, symbol: "ETH" } as TokenData;
  const USDC = { address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", symbol: "USDC" } as TokenData;
  const FEE = expandDecimals(1, 15);
  const DEPOSIT = expandDecimals(1, 17);
  const INSUFFICIENT = {
    buttonErrorMessage: "Insufficient ETH in Wallet",
    bannerErrorName: ValidationBannerErrorName.insufficientNativeTokenBalance,
  };

  it.each([
    { name: "token buy, 1.5x the fee", isDeposit: true, payLongToken: USDC, balance: (FEE * 3n) / 2n, error: {} },
    { name: "token buy, exactly the fee", isDeposit: true, payLongToken: USDC, balance: FEE, error: {} },
    { name: "token buy, below the fee", isDeposit: true, payLongToken: USDC, balance: FEE - 1n, error: INSUFFICIENT },
    { name: "ETH buy, deposit + the fee", isDeposit: true, payLongToken: ETH, balance: DEPOSIT + FEE, error: {} },
    {
      name: "ETH buy, below deposit + the fee",
      isDeposit: true,
      payLongToken: ETH,
      balance: DEPOSIT + FEE - 1n,
      error: INSUFFICIENT,
    },
    { name: "sell for ETH, 1.5x the fee", isDeposit: false, payLongToken: ETH, balance: (FEE * 3n) / 2n, error: {} },
  ])(
    "requires the execution fee once plus the ETH deposit PRO-4389: $name",
    ({ isDeposit, payLongToken, balance, error }) => {
      expect(
        getGmNativeGasError({
          chainId: ARBITRUM,
          isDeposit,
          executionFeeAmount: FEE,
          payLongToken,
          payShortToken: undefined,
          longTokenAmount: DEPOSIT,
          shortTokenAmount: 0n,
          nativeBalance: balance,
        })
      ).toEqual(error);
    }
  );
});

describe("getApprovalGasError", () => {
  const nativeToken = (overrides: { symbol?: string; walletBalance?: bigint }) =>
    ({ symbol: overrides.symbol ?? "ETH", walletBalance: overrides.walletBalance }) as TokenData;

  it("names the native token and the wallet when the balance can't pay for the approval", () => {
    expect(
      getApprovalGasError({
        tokenToApprove: tokensData.USDC.address,
        nativeToken: nativeToken({ walletBalance: 0n }),
        gasPrice: 10n,
      })
    ).toEqual({
      buttonErrorMessage: "Insufficient ETH in Wallet",
      bannerErrorName: ValidationBannerErrorName.insufficientNativeTokenForApproval,
    });
  });

  it("takes the symbol from the native token", () => {
    expect(
      getApprovalGasError({
        tokenToApprove: tokensData.USDC.address,
        nativeToken: nativeToken({ symbol: "AVAX", walletBalance: 0n }),
        gasPrice: 10n,
      }).buttonErrorMessage
    ).toBe("Insufficient AVAX in Wallet");
  });

  it("allows a balance equal to the approval cost", () => {
    expect(
      getApprovalGasError({
        tokenToApprove: tokensData.USDC.address,
        nativeToken: nativeToken({ walletBalance: ERC20_APPROVE_GAS_LIMIT * 10n }),
        gasPrice: 10n,
      })
    ).toEqual({});
  });

  it("skips validation while there is nothing to approve or data is loading", () => {
    expect(
      getApprovalGasError({ tokenToApprove: undefined, nativeToken: nativeToken({ walletBalance: 0n }), gasPrice: 10n })
    ).toEqual({});
    expect(
      getApprovalGasError({
        tokenToApprove: tokensData.USDC.address,
        nativeToken: nativeToken({ walletBalance: undefined }),
        gasPrice: 10n,
      })
    ).toEqual({});
    expect(
      getApprovalGasError({
        tokenToApprove: tokensData.USDC.address,
        nativeToken: undefined,
        gasPrice: 10n,
      })
    ).toEqual({});
    expect(
      getApprovalGasError({
        tokenToApprove: tokensData.USDC.address,
        nativeToken: nativeToken({ walletBalance: 0n }),
        gasPrice: undefined,
      })
    ).toEqual({});
  });
});

describe("getInsufficientFeeButtonMessage", () => {
  it("names the source chain for a source-chain fee", () => {
    expect(
      getInsufficientFeeButtonMessage({
        tokenSymbol: "ETH",
        feeSource: getSourceChainNetworkFeeSource(SOURCE_BASE_MAINNET),
      })
    ).toBe("Insufficient ETH on Base");
  });
});

describe("getExpressError", () => {
  const makeExpressParams = (overrides: { isGmxAccount: boolean; isOutGasTokenBalance: boolean }) =>
    ({
      chainId: ARBITRUM,
      isGmxAccount: overrides.isGmxAccount,
      gasPaymentValidations: {
        isGasPaymentTokenBalanceLoaded: true,
        isOutGasTokenBalance: overrides.isOutGasTokenBalance,
        needGasPaymentTokenApproval: false,
        isValid: !overrides.isOutGasTokenBalance,
      },
      gasPaymentParams: {
        gasPaymentTokenAddress: tokensData.USDC.address,
        gasPaymentToken: tokensData.USDC,
        totalRelayerFeeTokenAmount: expandDecimals(1, 18),
      },
    }) as unknown as ExpressTxnParams;

  const withNativeWalletBalance = (walletBalance: bigint) => ({
    ...tokensData,
    [zeroAddress]: { ...tokensData.ETH, address: zeroAddress, isNative: true, walletBalance },
  });

  it("returns no error without express params", () => {
    expect(getExpressError({ expressParams: undefined, tokensData })).toEqual({});
  });

  it("names the gas token and the GMX Account when its balance is insufficient", () => {
    expect(
      getExpressError({
        expressParams: makeExpressParams({ isGmxAccount: true, isOutGasTokenBalance: true }),
        tokensData,
      })
    ).toEqual({
      buttonErrorMessage: "Insufficient USDC in GMX Account",
      bannerErrorName: ValidationBannerErrorName.insufficientGmxAccountCurrentGasTokenBalance,
    });
  });

  it("names the gas token and the wallet when the wallet lacks both the gas token and native token", () => {
    const walletTokensData = withNativeWalletBalance(expandDecimals(1, 17));

    expect(
      getExpressError({
        expressParams: makeExpressParams({ isGmxAccount: false, isOutGasTokenBalance: true }),
        tokensData: walletTokensData,
      })
    ).toEqual({
      buttonErrorMessage: "Insufficient USDC in Wallet",
      bannerErrorName: ValidationBannerErrorName.insufficientWalletGasTokenBalance,
    });
  });

  it("returns no error for the wallet when the native token covers the fee", () => {
    const walletTokensData = withNativeWalletBalance(expandDecimals(10, 18));

    expect(
      getExpressError({
        expressParams: makeExpressParams({ isGmxAccount: false, isOutGasTokenBalance: true }),
        tokensData: walletTokensData,
      })
    ).toEqual({});
  });
});

describe("getIncreaseError — resulting-position margin check", () => {
  const violation = (reason: PositionMarginFailureReason): PositionMarginState => ({
    isLiquidatable: true,
    reason,
    remainingCollateralUsd: 0n,
    minCollateralUsd: 0n,
    minCollateralUsdForLeverage: 0n,
  });

  // no collateral swap involved, so the swap-liquidity checks do not interfere
  const marginCheckParams = {
    ...baseIncreaseParams,
    initialCollateralToken: toToken,
    initialCollateralAmount: expandDecimals(1000, 6),
  };

  const limitParams = {
    ...marginCheckParams,
    isLimit: true,
    triggerPrice: expandDecimals(49_000, 30),
    thresholdType: TriggerThresholdType.Below,
  };

  it("hard-blocks a market increase with the reason-specific max-leverage state", () => {
    const result = getIncreaseError({
      ...marginCheckParams,
      resultingPositionMarginState: violation(PositionMarginFailureReason.MinCollateralForLeverage),
      isResultingPositionCheckBlocking: true,
    });

    expect(result.buttonErrorMessage).toBe("Max leverage exceeded");
    expect(result.buttonTooltipName).toBe(ValidationButtonTooltipName.resultingPositionMaxLeverage);
  });

  it("blocks non-leverage margin reasons with the invalid-liquidation-price state", () => {
    const result = getIncreaseError({
      ...marginCheckParams,
      resultingPositionMarginState: violation(PositionMarginFailureReason.NonPositiveRemainingMargin),
      isResultingPositionCheckBlocking: true,
    });

    expect(result.buttonErrorMessage).toBe("Invalid liquidation price");
    expect(result.buttonTooltipName).toBe(ValidationButtonTooltipName.liqPriceGtMarkPrice);
  });

  it("does not block a resting limit order that is not executable now", () => {
    const result = getIncreaseError({
      ...limitParams,
      resultingPositionMarginState: violation(PositionMarginFailureReason.MinCollateralForLeverage),
      isResultingPositionCheckBlocking: false,
    });

    expect(result.buttonErrorMessage).toBe(undefined);
  });

  it("hard-blocks a limit order that is executable at the current prices", () => {
    const result = getIncreaseError({
      ...limitParams,
      resultingPositionMarginState: violation(PositionMarginFailureReason.MinCollateralForLeverage),
      isResultingPositionCheckBlocking: true,
    });

    expect(result.buttonErrorMessage).toBe("Max leverage exceeded");
    expect(result.buttonTooltipName).toBe(ValidationButtonTooltipName.resultingPositionMaxLeverage);
  });

  it("does not block when the margin check passes", () => {
    const result = getIncreaseError({
      ...marginCheckParams,
      resultingPositionMarginState: {
        isLiquidatable: false,
        reason: undefined,
        remainingCollateralUsd: 1n,
        minCollateralUsd: 0n,
        minCollateralUsdForLeverage: 1n,
      },
      isResultingPositionCheckBlocking: true,
    });

    expect(result.buttonErrorMessage).toBe(undefined);
  });
});

const stableTokensData = mockTokensData({
  USDC: { walletBalance: 0n },
  DAI: { walletBalance: expandDecimals(100, 30) },
});
const sameCollateralMarket = mockMarketsInfoData(stableTokensData, ["ETH-USDC-USDC"], {
  "ETH-USDC-USDC": {
    maxLongPoolUsdForDeposit: expandDecimals(10_000, 30),
    maxShortPoolUsdForDeposit: expandDecimals(10_000, 30),
  },
})["ETH-USDC-USDC"];
const marketToken = {
  ...stableTokensData.USDC,
  address: sameCollateralMarket.marketTokenAddress,
  symbol: "GM",
  decimals: 18,
  totalSupply: expandDecimals(2000, 18),
};
const baseGmSwapParams: Parameters<typeof getGmSwapError>[0] = {
  isDeposit: true,
  marketInfo: sameCollateralMarket,
  marketToken,
  payLongToken: stableTokensData.USDC,
  payShortToken: stableTokensData.DAI,
  glvToken: undefined,
  glvTokenAmount: undefined,
  glvTokenUsd: undefined,
  longTokenAmount: 0n,
  shortTokenAmount: expandDecimals(50, 6),
  initialShortTokenAmount: expandDecimals(50, 30),
  longTokenUsd: 0n,
  shortTokenUsd: expandDecimals(50, 30),
  marketTokenAmount: expandDecimals(50, 18),
  marketTokenUsd: expandDecimals(50, 30),
  longTokenLiquidityUsd: expandDecimals(10_000, 30),
  shortTokenLiquidityUsd: expandDecimals(10_000, 30),
  fees: undefined,
  priceImpactUsd: 0n,
  paySource: "settlementChain",
  isPair: false,
  chainId: ARBITRUM,
};

describe("getGmSwapError — paying a same-collateral pool with another token", () => {
  it("checks the paid token balance instead of the pool collateral balance", () => {
    expect(getGmSwapError(baseGmSwapParams).buttonErrorMessage).toBeUndefined();
  });

  it("reports the paid token when its balance is short", () => {
    expect(
      getGmSwapError({ ...baseGmSwapParams, initialShortTokenAmount: expandDecimals(150, 30) }).buttonErrorMessage
    ).toBe("Insufficient DAI balance");
  });
});

describe("getGmSwapError — deposit capacity on a same-collateral pool", () => {
  const poolWith100UsdcRoomPerSide = {
    ...sameCollateralMarket,
    maxLongPoolAmount: sameCollateralMarket.longPoolAmount + expandDecimals(100, 6),
    maxShortPoolAmount: sameCollateralMarket.shortPoolAmount + expandDecimals(100, 6),
  };
  const usdcInWallet = { ...stableTokensData.USDC, walletBalance: expandDecimals(1000, 6) };
  const capacityParams = { ...baseGmSwapParams, marketInfo: poolWith100UsdcRoomPerSide };

  it.each<{ case: string; params: Partial<Parameters<typeof getGmSwapError>[0]>; expected: string | undefined }>([
    {
      case: "a direct USDC deposit of 150, split 75/75, fits",
      params: {
        payLongToken: usdcInWallet,
        payShortToken: usdcInWallet,
        longTokenAmount: expandDecimals(75, 6),
        shortTokenAmount: expandDecimals(75, 6),
        initialShortTokenAmount: undefined,
      },
      expected: undefined,
    },
    {
      case: "a DAI deposit converted to 150 USDC fits like the direct one",
      params: { longTokenAmount: 0n, shortTokenAmount: expandDecimals(150, 6) },
      expected: undefined,
    },
    {
      case: "a DAI deposit converted to 250 USDC exceeds 100 per side",
      params: { longTokenAmount: 0n, shortTokenAmount: expandDecimals(250, 6) },
      expected: "Max USDC amount exceeded",
    },
  ])("$case", ({ params, expected }) => {
    expect(getGmSwapError({ ...capacityParams, ...params }).buttonErrorMessage).toBe(expected);
  });
});

describe("getGmSwapError — whitelist-only direct deposits", () => {
  it.each<{ access: DirectDepositAccess; expected: string | undefined }>([
    { access: "denied", expected: "Whitelist only" },
    { access: "loading", expected: "Loading..." },
    { access: "ungated", expected: undefined },
    { access: "whitelisted", expected: undefined },
  ])("direct GM deposit with $access access -> $expected", ({ access, expected }) => {
    expect(getGmSwapError({ ...baseGmSwapParams, directDepositAccess: access }).buttonErrorMessage).toBe(expected);
  });

  it("does not block a withdrawal", () => {
    const withdrawalParams = { ...baseGmSwapParams, isDeposit: false };

    expect(getGmSwapError({ ...withdrawalParams, directDepositAccess: "denied" })).toEqual(
      getGmSwapError(withdrawalParams)
    );
  });
});

describe("getGmShiftError — whitelist-only target market", () => {
  const shiftParams: Parameters<typeof getGmShiftError>[0] = {
    chainId: ARBITRUM,
    fromMarketInfo: sameCollateralMarket,
    fromToken: marketToken,
    fromTokenAmount: expandDecimals(1, 18),
    fromTokenUsd: expandDecimals(1, 30),
    fromLongTokenAmount: 0n,
    fromShortTokenAmount: expandDecimals(1, 6),
    toMarketInfo: sameCollateralMarket,
    toToken: marketToken,
    toTokenAmount: expandDecimals(1, 18),
    fees: undefined,
    priceImpactUsd: 0n,
  };

  it("blocks shifting into a denied market", () => {
    expect(getGmShiftError({ ...shiftParams, toMarketDirectDepositAccess: "denied" }).buttonErrorMessage).toBe(
      "Whitelist only"
    );
  });

  it("says Whitelist only for a denied market that is not resolved yet", () => {
    expect(
      getGmShiftError({ ...shiftParams, toMarketInfo: undefined, toMarketDirectDepositAccess: "denied" })
        .buttonErrorMessage
    ).toBe("Whitelist only");
  });

  it("waits while target access is loading", () => {
    expect(getGmShiftError({ ...shiftParams, toMarketDirectDepositAccess: "loading" }).buttonErrorMessage).toBe(
      "Loading..."
    );
  });

  it("does not block shifting into a whitelisted market", () => {
    expect(getGmShiftError({ ...shiftParams, toMarketDirectDepositAccess: "whitelisted" })).toEqual(
      getGmShiftError(shiftParams)
    );
  });
});
