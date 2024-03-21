import { t } from "@lingui/macro";
import { IS_NETWORK_DISABLED, getChainName } from "config/chains";
import { BASIS_POINTS_DIVISOR, MAX_ALLOWED_LEVERAGE } from "config/factors";
import { MarketInfo, getMintableMarketTokens, getOpenInterestUsd } from "domain/synthetics/markets";
import { PositionInfo, willPositionCollateralBeSufficientForPosition } from "domain/synthetics/positions";
import { TokenData, TokensRatio } from "domain/synthetics/tokens";
import { getIsEquivalentTokens } from "domain/tokens";
import { BigNumber, ethers } from "ethers";
import { DUST_USD, PRECISION, USD_DECIMALS, isAddressZero } from "lib/legacy";
import { expandDecimals, formatAmount, formatUsd } from "lib/numbers";
import { GmSwapFees, NextPositionValues, SwapPathStats, TradeFees, TriggerThresholdType } from "../types";
import { getMinCollateralUsdForLeverage } from "./decrease";
import { PriceImpactWarningState } from "../usePriceImpactWarningState";

export type ValidationTooltipName = "maxLeverage";
export type ValidationResult =
  | [errorMessage: undefined]
  | [errorMessage: string]
  | [errorMessage: string, tooltipName: "maxLeverage"];

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
  fromTokenAmount: BigNumber | undefined;
  fromUsd: BigNumber | undefined;
  toTokenAmount: BigNumber | undefined;
  toUsd: BigNumber | undefined;
  isLimit: boolean;
  triggerRatio: TokensRatio | undefined;
  markRatio: TokensRatio | undefined;
  fees: TradeFees | undefined;
  swapPathStats: SwapPathStats | undefined;
  priceImpactWarning: PriceImpactWarningState;
  isWrapOrUnwrap: boolean;
  swapLiquidity: BigNumber | undefined;
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

  if (!fromTokenAmount?.gt(0) || !fromUsd?.gt(0)) {
    return [t`Enter an amount`];
  }

  if (isLimit && !triggerRatio?.ratio.gt(0)) {
    return [t`Enter a  price`];
  }

  if (fromTokenAmount.gt(fromToken.balance || BigNumber.from(0))) {
    return [t`Insufficient ${fromToken?.symbol} balance`];
  }

  if (isWrapOrUnwrap) {
    return [undefined];
  }

  if (!isLimit && (!toUsd || !swapLiquidity || swapLiquidity?.lt(toUsd))) {
    return [t`Insufficient liquidity`];
  }

  if (!swapPathStats?.swapPath || (!isLimit && swapPathStats.swapSteps.some((step) => step.isOutLiquidity))) {
    return [t`Couldn't find a swap path with enough liquidity`];
  }

  if (!fees?.payTotalFees || (fees.payTotalFees.deltaUsd.lt(0) && fees.payTotalFees.deltaUsd.abs().gt(fromUsd || 0))) {
    return [t`Fees exceed Pay amount`];
  }

  if (isLimit && triggerRatio) {
    const isRatioInverted = [fromToken.wrappedAddress, fromToken.address].includes(triggerRatio.largestToken.address);

    if (triggerRatio && !isRatioInverted && markRatio?.ratio.lt(triggerRatio.ratio)) {
      return [t`Price above Mark Price`];
    }

    if (triggerRatio && isRatioInverted && markRatio?.ratio.gt(triggerRatio.ratio)) {
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
  initialCollateralAmount: BigNumber | undefined;
  initialCollateralUsd: BigNumber | undefined;
  targetCollateralToken: TokenData | undefined;
  collateralUsd: BigNumber | undefined;
  sizeDeltaUsd: BigNumber | undefined;
  nextPositionValues: NextPositionValues | undefined;
  existingPosition: PositionInfo | undefined;
  fees: TradeFees | undefined;
  markPrice: BigNumber | undefined;
  priceImpactWarning: PriceImpactWarningState;
  triggerPrice: BigNumber | undefined;
  swapPathStats: SwapPathStats | undefined;
  collateralLiquidity: BigNumber | undefined;
  longLiquidity: BigNumber | undefined;
  shortLiquidity: BigNumber | undefined;
  minCollateralUsd: BigNumber | undefined;
  isLong: boolean;
  isLimit: boolean;
  nextLeverageWithoutPnl: BigNumber | undefined;
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

  if (!initialCollateralAmount?.gt(0) || !initialCollateralUsd?.gt(0) || !sizeDeltaUsd || !fees?.payTotalFees) {
    return [t`Enter an amount`];
  }

  if (initialCollateralAmount.gt(initialCollateralToken.balance || BigNumber.from(0))) {
    return [t`Insufficient ${initialCollateralToken?.symbol} balance`];
  }

  const isNeedSwap = !getIsEquivalentTokens(initialCollateralToken, targetCollateralToken);

  if (isNeedSwap) {
    if (!swapPathStats?.swapPath?.length) {
      return [t`Couldn't find a swap route with enough liquidity`];
    }

    if (!isLimit) {
      if (!collateralLiquidity || collateralLiquidity?.lt(initialCollateralUsd || BigNumber.from(0))) {
        return [t`Insufficient liquidity to swap collateral`];
      }
    }
  }

  if (
    !existingPosition &&
    fees.payTotalFees?.deltaUsd.lt(0) &&
    fees?.payTotalFees?.deltaUsd.abs().gt(initialCollateralUsd || 0)
  ) {
    return [t`Fees exceed amount`];
  }

  // Hardcoded for Odyssey
  const _minCollateralUsd = expandDecimals(2, USD_DECIMALS);

  if (!existingPosition && collateralUsd?.lt(_minCollateralUsd)) {
    return [t`Min order: ${formatUsd(_minCollateralUsd)}`];
  }

  if (nextPositionValues?.nextCollateralUsd?.lt(_minCollateralUsd)) {
    return [t`Min collateral: ${formatUsd(_minCollateralUsd)}`];
  }

  if (!sizeDeltaUsd.gt(0)) {
    return [t`Enter an amount`];
  }

  if (!isLimit) {
    if (isLong && (!longLiquidity || longLiquidity.lt(sizeDeltaUsd))) {
      return [t`Max ${indexToken.symbol} long exceeded`];
    }

    if (!isLong && (!shortLiquidity || shortLiquidity.lt(sizeDeltaUsd))) {
      return [t`Max ${indexToken.symbol} short exceeded`];
    }
  }

  if (isLimit) {
    if (!markPrice) {
      return [t`Loading...`];
    }

    if (!triggerPrice?.gt(0)) {
      return [t`Enter a price`];
    }

    if (isLong && markPrice.lt(triggerPrice)) {
      return [t`Price above Mark Price`];
    }

    if (!isLong && markPrice.gt(triggerPrice)) {
      return [t`Price below Mark Price`];
    }
  }

  if (nextLeverageWithoutPnl?.gt(MAX_ALLOWED_LEVERAGE)) {
    return [t`Max leverage: ${(MAX_ALLOWED_LEVERAGE / BASIS_POINTS_DIVISOR).toFixed(1)}x`];
  }

  if (priceImpactWarning.validationError) {
    return [t`Price Impact not yet acknowledged`];
  }

  if (nextLeverageWithoutPnl) {
    const maxLeverageError = getIsMaxLeverageExceeded(nextLeverageWithoutPnl, marketInfo, isLong, sizeDeltaUsd);

    if (maxLeverageError) {
      return [t`Max. Leverage exceeded`, "maxLeverage"];
    }
  }

  return [undefined];
}

export function getIsMaxLeverageExceeded(
  nextLeverage: BigNumber,
  marketInfo: MarketInfo,
  isLong: boolean,
  sizeDeltaUsd: BigNumber
): boolean {
  const openInterest = getOpenInterestUsd(marketInfo, isLong);
  const minCollateralFactorMultiplier = isLong
    ? marketInfo.minCollateralFactorForOpenInterestLong
    : marketInfo.minCollateralFactorForOpenInterestShort;
  let minCollateralFactor = openInterest.add(sizeDeltaUsd).mul(minCollateralFactorMultiplier).div(PRECISION);
  const minCollateralFactorForMarket = marketInfo.minCollateralFactor;

  if (minCollateralFactorForMarket.gt(minCollateralFactor)) {
    minCollateralFactor = minCollateralFactorForMarket;
  }

  const maxLeverage = PRECISION.mul(BASIS_POINTS_DIVISOR).div(minCollateralFactor);

  if (nextLeverage.gt(maxLeverage)) {
    return true;
  }

  return false;
}

export function getDecreaseError(p: {
  marketInfo: MarketInfo | undefined;
  inputSizeUsd: BigNumber | undefined;
  sizeDeltaUsd: BigNumber | undefined;
  receiveToken: TokenData | undefined;
  isTrigger: boolean;
  triggerPrice: BigNumber | undefined;
  markPrice: BigNumber | undefined;
  existingPosition: PositionInfo | undefined;
  nextPositionValues: NextPositionValues | undefined;
  isLong: boolean;
  isContractAccount: boolean;
  minCollateralUsd: BigNumber | undefined;
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

  if (!sizeDeltaUsd?.gt(0)) {
    return [t`Enter an amount`];
  }

  if (isTrigger) {
    if (!triggerPrice?.gt(0)) {
      return [t`Enter a trigger price`];
    }

    if (existingPosition?.liquidationPrice && existingPosition.liquidationPrice !== ethers.constants.MaxUint256) {
      if (isLong && triggerPrice.lte(existingPosition.liquidationPrice)) {
        return [t`Price below Liq. Price`];
      }

      if (!isLong && triggerPrice?.gte(existingPosition.liquidationPrice)) {
        return [t`Price above Liq. Price`];
      }
    }

    if (fixedTriggerThresholdType === TriggerThresholdType.Above && triggerPrice.lt(markPrice || 0)) {
      return [t`Price below Mark Price`];
    }

    if (fixedTriggerThresholdType === TriggerThresholdType.Below && triggerPrice.gt(markPrice || 0)) {
      return [t`Price above Mark Price`];
    }
  }

  if (nextPositionValues?.nextLeverage && nextPositionValues?.nextLeverage.gt(MAX_ALLOWED_LEVERAGE)) {
    return [t`Max leverage: ${(MAX_ALLOWED_LEVERAGE / BASIS_POINTS_DIVISOR).toFixed(1)}x`];
  }

  if (existingPosition) {
    if (!isTrigger && inputSizeUsd?.gt(existingPosition.sizeInUsd)) {
      return [t`Max close amount exceeded`];
    }

    if (
      existingPosition.sizeInUsd.sub(sizeDeltaUsd).gt(DUST_USD) &&
      nextPositionValues?.nextCollateralUsd?.lt(minCollateralUsd || 0)
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
  collateralDeltaAmount: BigNumber | undefined;
  collateralDeltaUsd: BigNumber | undefined;
  nextCollateralUsd: BigNumber | undefined;
  minCollateralUsd: BigNumber | undefined;
  maxWithdrawAmount: BigNumber | undefined;
  nextLiqPrice: BigNumber | undefined;
  nextLeverage: BigNumber | undefined;
  position: PositionInfo | undefined;
  isDeposit: boolean;
  depositToken: TokenData | undefined;
  depositAmount: BigNumber | undefined;
  minCollateralFactor: BigNumber | undefined;
}): ValidationResult {
  const {
    collateralDeltaAmount,
    collateralDeltaUsd,
    minCollateralUsd,
    maxWithdrawAmount,
    nextCollateralUsd,
    nextLeverage,
    nextLiqPrice,
    position,
    isDeposit,
    depositToken,
    depositAmount,
    minCollateralFactor,
  } = p;

  const isFullClose = maxWithdrawAmount ? collateralDeltaAmount?.eq(maxWithdrawAmount) : false;

  if (!collateralDeltaAmount || !collateralDeltaUsd || collateralDeltaAmount.eq(0) || collateralDeltaUsd?.eq(0)) {
    return [t`Enter an amount`];
  }

  if (isDeposit && depositToken && depositAmount && depositAmount.gt(depositToken.balance || 0)) {
    return [t`Insufficient ${depositToken.symbol} balance`];
  }

  if (!isFullClose && nextCollateralUsd && minCollateralUsd && position) {
    const minCollateralUsdForLeverage = getMinCollateralUsdForLeverage(position);

    if (nextCollateralUsd.lt(minCollateralUsdForLeverage)) {
      return [t`Min collateral: ${formatAmount(minCollateralUsdForLeverage, USD_DECIMALS, 2)} USD`];
    }
  }

  if (nextLiqPrice && position?.markPrice) {
    if (position?.isLong && nextLiqPrice.lt(ethers.constants.MaxUint256) && position?.markPrice.lt(nextLiqPrice)) {
      return [t`Invalid liq. price`];
    }

    if (!position.isLong && position.markPrice.gt(nextLiqPrice)) {
      return [t`Invalid liq. price`];
    }
  }

  if (!isFullClose && nextLeverage && nextLeverage.gt(MAX_ALLOWED_LEVERAGE)) {
    return [t`Max leverage: ${(MAX_ALLOWED_LEVERAGE / BASIS_POINTS_DIVISOR).toFixed(1)}x`];
  }

  if (!isFullClose && position && minCollateralFactor && !isDeposit) {
    const isPositionCollateralSufficient = willPositionCollateralBeSufficientForPosition(
      position,
      collateralDeltaAmount,
      BigNumber.from(0),
      minCollateralFactor,
      BigNumber.from(0)
    );

    if (!isPositionCollateralSufficient) {
      return [t`Max. Leverage exceeded`, "maxLeverage"];
    }
  }

  return [undefined];
}

export function decreasePositionSizeByLeverageDiff(
  currentLeverage: BigNumber,
  targetLeverage: BigNumber,
  sizeDeltaUsd: BigNumber
) {
  return (
    sizeDeltaUsd
      .mul(targetLeverage)
      .div(currentLeverage)
      // 2% slipage
      .mul(98)
      .div(100)
  );
}

export function getGmSwapError(p: {
  isDeposit: boolean;
  marketInfo: MarketInfo | undefined;
  marketToken: TokenData | undefined;
  longToken: TokenData | undefined;
  shortToken: TokenData | undefined;
  longTokenAmount: BigNumber | undefined;
  shortTokenAmount: BigNumber | undefined;
  longTokenUsd: BigNumber | undefined;
  shortTokenUsd: BigNumber | undefined;
  marketTokenAmount: BigNumber | undefined;
  marketTokenUsd: BigNumber | undefined;
  longTokenLiquidityUsd: BigNumber | undefined;
  shortTokenLiquidityUsd: BigNumber | undefined;
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
    const totalCollateralUsd = BigNumber.from(0)
      .add(longTokenUsd || 0)
      .add(shortTokenUsd || 0);

    const mintableInfo = getMintableMarketTokens(marketInfo, marketToken);

    if (fees?.totalFees?.deltaUsd.lt(0) && fees.totalFees.deltaUsd.abs().gt(totalCollateralUsd)) {
      return [t`Fees exceed Pay amount`];
    }

    if (longTokenAmount?.gt(mintableInfo.longDepositCapacityAmount)) {
      return [t`Max ${longToken?.symbol} amount exceeded`];
    }

    if (shortTokenAmount?.gt(mintableInfo.shortDepositCapacityAmount)) {
      return [t`Max ${shortToken?.symbol} amount exceeded`];
    }
  } else if (fees?.totalFees?.deltaUsd.lt(0) && fees.totalFees.deltaUsd.abs().gt(marketTokenUsd || BigNumber.from(0))) {
    return [t`Fees exceed Pay amount`];
  }

  if (longTokenAmount?.lt(0) || shortTokenAmount?.lt(0) || marketTokenAmount?.lt(0)) {
    return [t`Amount should be greater than zero`];
  }

  if (!marketTokenAmount?.gt(0)) {
    return [t`Enter an amount`];
  }

  if (isDeposit) {
    if (longTokenAmount?.gt(longToken?.balance || 0)) {
      return [t`Insufficient ${longToken?.symbol} balance`];
    }

    if (shortTokenAmount?.gt(shortToken?.balance || 0)) {
      return [t`Insufficient ${shortToken?.symbol} balance`];
    }
  } else {
    if (marketTokenAmount.gt(marketToken?.balance || 0)) {
      return [t`Insufficient ${marketToken?.symbol} balance`];
    }

    if (longTokenUsd?.gt(longTokenLiquidityUsd || 0)) {
      return [t`Insufficient ${longToken?.symbol} liquidity`];
    }

    if (shortTokenUsd?.gt(shortTokenLiquidityUsd || 0)) {
      return [t`Insufficient ${shortToken?.symbol} liquidity`];
    }
  }

  return [undefined];
}
