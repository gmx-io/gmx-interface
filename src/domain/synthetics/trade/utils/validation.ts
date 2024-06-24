import { t } from "@lingui/macro";
import { IS_NETWORK_DISABLED, getChainName } from "config/chains";
import { BASIS_POINTS_DIVISOR, BASIS_POINTS_DIVISOR_BIGINT } from "config/factors";
import {
  MarketInfo,
  getMaxAllowedLeverageByMinCollateralFactor,
  getMintableMarketTokens,
  getOpenInterestUsd,
} from "domain/synthetics/markets";
import { PositionInfo, willPositionCollateralBeSufficientForPosition } from "domain/synthetics/positions";
import { TokenData, TokensRatio } from "domain/synthetics/tokens";
import { getIsEquivalentTokens } from "domain/tokens";
import { ethers } from "ethers";
import { DUST_USD, PRECISION, USD_DECIMALS, isAddressZero } from "lib/legacy";
import { expandDecimals, formatAmount, formatUsd } from "lib/numbers";
import { GmSwapFees, NextPositionValues, SwapPathStats, TradeFees, TriggerThresholdType } from "../types";
import { PriceImpactWarningState } from "../usePriceImpactWarningState";
import { bigMath } from "lib/bigmath";

export type ValidationTooltipName = "maxLeverage";
export type ValidationResult =
  | [errorMessage: undefined]
  | [errorMessage: string]
  | [errorMessage: string, tooltipName: "maxLeverage" | "liqPrice > markPrice"];

export function getCommonError(p: { chainId: number; isConnected: boolean; hasOutdatedUi: boolean }): ValidationResult {
  const { chainId, isConnected, hasOutdatedUi } = p;

  if (IS_NETWORK_DISABLED[chainId]) {
    return [t`App disabled, pending ${getChainName(chainId)} upgrade`];
  }

  if (hasOutdatedUi) {
    return [t`Page outdated, please refresh`];
  }

  if (!isConnected) {
    return [t`Connect Wallet`];
  }

  return [undefined];
}

export function getSwapError(p: {
  fromToken: TokenData | undefined;
  toToken: TokenData | undefined;
  fromTokenAmount: bigint | undefined;
  fromUsd: bigint | undefined;
  toTokenAmount: bigint | undefined;
  toUsd: bigint | undefined;
  isLimit: boolean;
  triggerRatio: TokensRatio | undefined;
  markRatio: TokensRatio | undefined;
  fees: TradeFees | undefined;
  swapPathStats: SwapPathStats | undefined;
  priceImpactWarning: PriceImpactWarningState;
  isWrapOrUnwrap: boolean;
  swapLiquidity: bigint | undefined;
}): ValidationResult {
  const {
    fromToken,
    toToken,
    fromTokenAmount,
    fromUsd,
    toUsd,
    isLimit,
    triggerRatio,
    markRatio,
    fees,
    isWrapOrUnwrap,
    priceImpactWarning,
    swapLiquidity,
    swapPathStats,
  } = p;

  if (!fromToken || !toToken) {
    return [t`Select a token`];
  }

  if (fromToken.address === toToken.address) {
    return [t`Select different tokens`];
  }

  if (fromTokenAmount === undefined || fromUsd === undefined || fromTokenAmount <= 0 || fromUsd <= 0) {
    return [t`Enter an amount`];
  }

  if (isLimit && (triggerRatio?.ratio === undefined || triggerRatio.ratio < 0)) {
    return [t`Enter a  price`];
  }

  if (fromTokenAmount > (fromToken.balance ?? 0n)) {
    return [t`Insufficient ${fromToken?.symbol} balance`];
  }

  if (isWrapOrUnwrap) {
    return [undefined];
  }

  if (!isLimit && (toUsd === undefined || swapLiquidity === undefined || swapLiquidity < toUsd)) {
    return [t`Insufficient liquidity`];
  }

  if (!swapPathStats?.swapPath || (!isLimit && swapPathStats.swapSteps.some((step) => step.isOutLiquidity))) {
    return [t`Couldn't find a swap path with enough liquidity`];
  }

  if (
    !fees?.payTotalFees ||
    (fees.payTotalFees.deltaUsd < 0 && bigMath.abs(fees.payTotalFees.deltaUsd) > (fromUsd ?? 0))
  ) {
    return [t`Fees exceed Pay amount`];
  }

  if (isLimit && triggerRatio) {
    const isRatioInverted = [fromToken.wrappedAddress, fromToken.address].includes(triggerRatio.largestToken.address);

    if (
      triggerRatio &&
      !isRatioInverted &&
      (markRatio?.ratio === undefined ? undefined : markRatio.ratio < triggerRatio.ratio)
    ) {
      return [t`Price above Mark Price`];
    }

    if (
      triggerRatio &&
      isRatioInverted &&
      (markRatio?.ratio === undefined ? undefined : markRatio.ratio > triggerRatio.ratio)
    ) {
      return [t`Price below Mark Price`];
    }
  }

  if (priceImpactWarning.validationError) {
    return [t`Price Impact not yet acknowledged`];
  }

  return [undefined];
}

export function getIncreaseError(p: {
  marketInfo: MarketInfo | undefined;
  indexToken: TokenData | undefined;
  initialCollateralToken: TokenData | undefined;
  initialCollateralAmount: bigint | undefined;
  initialCollateralUsd: bigint | undefined;
  targetCollateralToken: TokenData | undefined;
  collateralUsd: bigint | undefined;
  sizeDeltaUsd: bigint | undefined;
  nextPositionValues: NextPositionValues | undefined;
  existingPosition: PositionInfo | undefined;
  fees: TradeFees | undefined;
  markPrice: bigint | undefined;
  priceImpactWarning: PriceImpactWarningState;
  triggerPrice: bigint | undefined;
  swapPathStats: SwapPathStats | undefined;
  collateralLiquidity: bigint | undefined;
  longLiquidity: bigint | undefined;
  shortLiquidity: bigint | undefined;
  minCollateralUsd: bigint | undefined;
  isLong: boolean;
  isLimit: boolean;
  nextLeverageWithoutPnl: bigint | undefined;
}): ValidationResult {
  const {
    marketInfo,
    indexToken,
    initialCollateralToken,
    initialCollateralAmount,
    initialCollateralUsd,
    targetCollateralToken,
    priceImpactWarning,
    collateralUsd,
    sizeDeltaUsd,
    existingPosition,
    fees,
    swapPathStats,
    collateralLiquidity,
    longLiquidity,
    shortLiquidity,
    isLong,
    markPrice,
    triggerPrice,
    isLimit,
    nextPositionValues,
    nextLeverageWithoutPnl,
  } = p;

  if (!marketInfo || !indexToken) {
    return [t`Select a market`];
  }

  if (!initialCollateralToken) {
    return [t`Select a Pay token`];
  }

  if (!targetCollateralToken) {
    return [t`Select a collateral`];
  }

  if (
    initialCollateralAmount === undefined ||
    initialCollateralUsd === undefined ||
    initialCollateralAmount <= 0 ||
    initialCollateralUsd <= 0 ||
    sizeDeltaUsd === undefined ||
    !fees?.payTotalFees
  ) {
    return [t`Enter an amount`];
  }

  if (initialCollateralAmount > (initialCollateralToken.balance ?? 0n)) {
    return [t`Insufficient ${initialCollateralToken?.symbol} balance`];
  }

  const isNeedSwap = !getIsEquivalentTokens(initialCollateralToken, targetCollateralToken);

  if (isNeedSwap) {
    if (!swapPathStats?.swapPath?.length) {
      return [t`Couldn't find a swap route with enough liquidity`];
    }

    if (!isLimit) {
      if (collateralLiquidity === undefined || collateralLiquidity < (initialCollateralUsd ?? 0n)) {
        return [t`Insufficient liquidity to swap collateral`];
      }
    }
  }

  if (
    !existingPosition &&
    fees.payTotalFees?.deltaUsd &&
    fees.payTotalFees?.deltaUsd < 0 &&
    bigMath.abs(fees?.payTotalFees?.deltaUsd) > (initialCollateralUsd ?? 0n)
  ) {
    return [t`Fees exceed amount`];
  }

  // Hardcoded for Odyssey
  const _minCollateralUsd = expandDecimals(2, USD_DECIMALS);

  if (!existingPosition && (collateralUsd === undefined ? undefined : collateralUsd < _minCollateralUsd)) {
    return [t`Min order: ${formatUsd(_minCollateralUsd)}`];
  }

  if (
    nextPositionValues?.nextCollateralUsd === undefined
      ? undefined
      : nextPositionValues.nextCollateralUsd < _minCollateralUsd
  ) {
    return [t`Min collateral: ${formatUsd(_minCollateralUsd)}`];
  }

  if (sizeDeltaUsd <= 0) {
    return [t`Enter an amount`];
  }

  if (!isLimit) {
    if (isLong && (longLiquidity === undefined || longLiquidity < sizeDeltaUsd)) {
      return [t`Max ${indexToken.symbol} long exceeded`];
    }

    if (!isLong && (shortLiquidity === undefined || shortLiquidity < sizeDeltaUsd)) {
      return [t`Max ${indexToken.symbol} short exceeded`];
    }
  }

  if (isLimit) {
    if (markPrice === undefined) {
      return [t`Loading...`];
    }

    if (triggerPrice === undefined || triggerPrice < 0) {
      return [t`Enter a price`];
    }

    if (isLong && markPrice < triggerPrice) {
      return [t`Price above Mark Price`];
    }

    if (!isLong && markPrice > triggerPrice) {
      return [t`Price below Mark Price`];
    }
  }

  const maxAllowedLeverage = getMaxAllowedLeverageByMinCollateralFactor(marketInfo?.minCollateralFactor);

  if (nextLeverageWithoutPnl !== undefined && nextLeverageWithoutPnl > maxAllowedLeverage) {
    return [t`Max leverage: ${(maxAllowedLeverage / BASIS_POINTS_DIVISOR).toFixed(1)}x`];
  }

  if (priceImpactWarning.validationError) {
    return [t`Price Impact not yet acknowledged`];
  }

  if (nextLeverageWithoutPnl !== undefined) {
    const maxLeverageError = getIsMaxLeverageExceeded(nextLeverageWithoutPnl, marketInfo, isLong, sizeDeltaUsd);

    if (maxLeverageError) {
      return [t`Max. Leverage exceeded`, "maxLeverage"];
    }
  }

  if (nextPositionValues?.nextLiqPrice !== undefined && markPrice !== undefined) {
    if (isLong && nextPositionValues.nextLiqPrice > markPrice) {
      return [t`Invalid liq. price`, "liqPrice > markPrice"];
    }

    if (!isLong && nextPositionValues.nextLiqPrice < markPrice) {
      return [t`Invalid liq. price`, "liqPrice > markPrice"];
    }
  }

  return [undefined];
}

export function getIsMaxLeverageExceeded(
  nextLeverage: bigint,
  marketInfo: MarketInfo,
  isLong: boolean,
  sizeDeltaUsd: bigint
): boolean {
  const openInterest = getOpenInterestUsd(marketInfo, isLong);
  const minCollateralFactorMultiplier = isLong
    ? marketInfo.minCollateralFactorForOpenInterestLong
    : marketInfo.minCollateralFactorForOpenInterestShort;
  let minCollateralFactor = bigMath.mulDiv(openInterest + sizeDeltaUsd, minCollateralFactorMultiplier, PRECISION);
  const minCollateralFactorForMarket = marketInfo.minCollateralFactor;

  if (minCollateralFactorForMarket > minCollateralFactor) {
    minCollateralFactor = minCollateralFactorForMarket;
  }

  const maxLeverage = bigMath.mulDiv(PRECISION, BASIS_POINTS_DIVISOR_BIGINT, minCollateralFactor);

  if (nextLeverage > maxLeverage) {
    return true;
  }

  return false;
}

export function getDecreaseError(p: {
  marketInfo: MarketInfo | undefined;
  inputSizeUsd: bigint | undefined;
  sizeDeltaUsd: bigint | undefined;
  receiveToken: TokenData | undefined;
  isTrigger: boolean;
  triggerPrice: bigint | undefined;
  markPrice: bigint | undefined;
  existingPosition: PositionInfo | undefined;
  nextPositionValues: NextPositionValues | undefined;
  isLong: boolean;
  isContractAccount: boolean;
  minCollateralUsd: bigint | undefined;
  priceImpactWarning: PriceImpactWarningState;
  isNotEnoughReceiveTokenLiquidity: boolean;
  fixedTriggerThresholdType: TriggerThresholdType | undefined;
}): ValidationResult {
  const {
    marketInfo,
    sizeDeltaUsd,
    inputSizeUsd,
    isTrigger,
    triggerPrice,
    markPrice,
    existingPosition,
    isContractAccount,
    receiveToken,
    nextPositionValues,
    isLong,
    minCollateralUsd,
    isNotEnoughReceiveTokenLiquidity,
    priceImpactWarning,
    fixedTriggerThresholdType,
  } = p;

  if (isContractAccount && isAddressZero(receiveToken?.address)) {
    return [t`${receiveToken?.symbol} can not be sent to smart contract addresses. Select another token.`];
  }

  if (!marketInfo) {
    return [t`Select a market`];
  }

  if (sizeDeltaUsd === undefined || sizeDeltaUsd <= 0) {
    return [t`Enter an amount`];
  }

  if (isTrigger) {
    if (triggerPrice === undefined || triggerPrice <= 0) {
      return [t`Enter a trigger price`];
    }

    if (existingPosition?.liquidationPrice && existingPosition.liquidationPrice !== ethers.MaxUint256) {
      if (isLong && triggerPrice <= existingPosition.liquidationPrice) {
        return [t`Price below Liq. Price`];
      }

      if (!isLong && triggerPrice >= existingPosition.liquidationPrice) {
        return [t`Price above Liq. Price`];
      }
    }

    if (fixedTriggerThresholdType === TriggerThresholdType.Above && triggerPrice < (markPrice ?? 0n)) {
      return [t`Price below Mark Price`];
    }

    if (fixedTriggerThresholdType === TriggerThresholdType.Below && triggerPrice > (markPrice ?? 0n)) {
      return [t`Price above Mark Price`];
    }
  }

  const maxAllowedLeverage = getMaxAllowedLeverageByMinCollateralFactor(marketInfo?.minCollateralFactor);

  if (nextPositionValues?.nextLeverage !== undefined && nextPositionValues?.nextLeverage > maxAllowedLeverage) {
    return [t`Max leverage: ${(maxAllowedLeverage / BASIS_POINTS_DIVISOR).toFixed(1)}x`];
  }

  if (existingPosition) {
    if (!isTrigger && (inputSizeUsd === undefined ? undefined : inputSizeUsd > existingPosition.sizeInUsd)) {
      return [t`Max close amount exceeded`];
    }

    if (
      existingPosition.sizeInUsd - sizeDeltaUsd > DUST_USD &&
      (nextPositionValues?.nextCollateralUsd === undefined
        ? undefined
        : nextPositionValues.nextCollateralUsd < (minCollateralUsd ?? 0n))
    ) {
      return [t`Leftover collateral below ${formatAmount(minCollateralUsd, USD_DECIMALS, 2)} USD`];
    }
  }

  if (isNotEnoughReceiveTokenLiquidity) {
    return [t`Insufficient receive token liquidity`];
  }

  if (priceImpactWarning.validationError) {
    return [t`Price Impact not yet acknowledged`];
  }

  return [undefined];
}

export function getEditCollateralError(p: {
  collateralDeltaAmount: bigint | undefined;
  collateralDeltaUsd: bigint | undefined;
  nextLiqPrice: bigint | undefined;
  nextLeverage: bigint | undefined;
  position: PositionInfo | undefined;
  isDeposit: boolean;
  depositToken: TokenData | undefined;
  depositAmount: bigint | undefined;
  minCollateralFactor: bigint | undefined;
}): ValidationResult {
  const {
    collateralDeltaAmount,
    collateralDeltaUsd,
    nextLeverage,
    nextLiqPrice,
    position,
    isDeposit,
    depositToken,
    depositAmount,
    minCollateralFactor,
  } = p;

  if (
    collateralDeltaAmount === undefined ||
    collateralDeltaUsd === undefined ||
    collateralDeltaAmount == 0n ||
    collateralDeltaUsd == 0n
  ) {
    return [t`Enter an amount`];
  }

  if (isDeposit && depositToken && depositAmount !== undefined && depositAmount > (depositToken.balance ?? 0)) {
    return [t`Insufficient ${depositToken.symbol} balance`];
  }

  if (nextLiqPrice !== undefined && position?.markPrice !== undefined) {
    if (position?.isLong && nextLiqPrice < ethers.MaxUint256 && position?.markPrice < nextLiqPrice) {
      return [t`Invalid liq. price`];
    }

    if (!position.isLong && position.markPrice > nextLiqPrice) {
      return [t`Invalid liq. price`];
    }
  }

  const maxAllowedLeverage = getMaxAllowedLeverageByMinCollateralFactor(minCollateralFactor);

  if (nextLeverage !== undefined && nextLeverage > maxAllowedLeverage) {
    return [t`Max leverage: ${(maxAllowedLeverage / BASIS_POINTS_DIVISOR).toFixed(1)}x`];
  }

  if (position && minCollateralFactor !== undefined && !isDeposit) {
    const isPositionCollateralSufficient = willPositionCollateralBeSufficientForPosition(
      position,
      collateralDeltaAmount,
      0n,
      minCollateralFactor,
      0n
    );

    if (!isPositionCollateralSufficient) {
      return [t`Max. Leverage exceeded`, "maxLeverage"];
    }
  }

  return [undefined];
}

export function decreasePositionSizeByLeverageDiff(
  currentLeverage: bigint,
  targetLeverage: bigint,
  sizeDeltaUsd: bigint
) {
  return bigMath.mulDiv(
    bigMath.mulDiv(sizeDeltaUsd, targetLeverage, currentLeverage),
    // 2% slipage
    98n,
    100n
  );
}

export function getGmSwapError(p: {
  isDeposit: boolean;
  marketInfo: MarketInfo | undefined;
  marketToken: TokenData | undefined;
  longToken: TokenData | undefined;
  shortToken: TokenData | undefined;
  longTokenAmount: bigint | undefined;
  shortTokenAmount: bigint | undefined;
  longTokenUsd: bigint | undefined;
  shortTokenUsd: bigint | undefined;
  marketTokenAmount: bigint | undefined;
  marketTokenUsd: bigint | undefined;
  longTokenLiquidityUsd: bigint | undefined;
  shortTokenLiquidityUsd: bigint | undefined;
  fees: GmSwapFees | undefined;
  isHighPriceImpact: boolean;
  isHighPriceImpactAccepted: boolean;
}) {
  const {
    isDeposit,
    marketInfo,
    marketToken,
    longToken,
    shortToken,
    longTokenAmount,
    shortTokenAmount,
    longTokenUsd,
    shortTokenUsd,
    marketTokenAmount,
    marketTokenUsd,
    longTokenLiquidityUsd,
    shortTokenLiquidityUsd,
    fees,
    isHighPriceImpact,
    isHighPriceImpactAccepted,
  } = p;

  if (!marketInfo || !marketToken) {
    return [t`Loading...`];
  }

  if (isHighPriceImpact && !isHighPriceImpactAccepted) {
    return [t`Price Impact not yet acknowledged`];
  }

  if (isDeposit) {
    const totalCollateralUsd = (longTokenUsd ?? 0n) + (shortTokenUsd ?? 0n);

    const mintableInfo = getMintableMarketTokens(marketInfo, marketToken);

    if (
      (fees?.totalFees?.deltaUsd === undefined ? undefined : fees?.totalFees?.deltaUsd < 0) &&
      bigMath.abs(fees?.totalFees?.deltaUsd ?? 0n) > totalCollateralUsd
    ) {
      return [t`Fees exceed Pay amount`];
    }

    if (longTokenAmount !== undefined && longTokenAmount > mintableInfo.longDepositCapacityAmount) {
      return [t`Max ${longToken?.symbol} amount exceeded`];
    }

    if (shortTokenAmount !== undefined && shortTokenAmount > mintableInfo.shortDepositCapacityAmount) {
      return [t`Max ${shortToken?.symbol} amount exceeded`];
    }
  } else if (
    (fees?.totalFees?.deltaUsd ?? 0n) < 0 &&
    bigMath.abs(fees?.totalFees?.deltaUsd ?? 0n) > (marketTokenUsd ?? 0n)
  ) {
    return [t`Fees exceed Pay amount`];
  }

  if ((longTokenAmount ?? 0n) < 0 || (shortTokenAmount ?? 0n) < 0 || (marketTokenAmount ?? 0n) < 0) {
    return [t`Amount should be greater than zero`];
  }

  if (marketTokenAmount === undefined || marketTokenAmount < 0) {
    return [t`Enter an amount`];
  }

  if (isDeposit) {
    if (marketInfo.isSameCollaterals) {
      if ((longTokenAmount ?? 0n) + (shortTokenAmount ?? 0n) > (longToken?.balance ?? 0n)) {
        return [t`Insufficient ${longToken?.symbol} balance`];
      }
    } else {
      if ((longTokenAmount ?? 0n) > (longToken?.balance ?? 0n)) {
        return [t`Insufficient ${longToken?.symbol} balance`];
      }

      if ((shortTokenAmount ?? 0n) > (shortToken?.balance ?? 0n)) {
        return [t`Insufficient ${shortToken?.symbol} balance`];
      }
    }
  } else {
    if (marketTokenAmount > (marketToken?.balance ?? 0n)) {
      return [t`Insufficient ${marketToken?.symbol} balance`];
    }

    if ((longTokenUsd ?? 0n) > (longTokenLiquidityUsd ?? 0n)) {
      return [t`Insufficient ${longToken?.symbol} liquidity`];
    }

    if ((shortTokenUsd ?? 0n) > (shortTokenLiquidityUsd ?? 0n)) {
      return [t`Insufficient ${shortToken?.symbol} liquidity`];
    }
  }

  return [undefined];
}
