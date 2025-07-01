import { t } from "@lingui/macro";
import { ethers } from "ethers";

import { IS_NETWORK_DISABLED, getChainName } from "config/chains";
import { BASIS_POINTS_DIVISOR, BASIS_POINTS_DIVISOR_BIGINT, USD_DECIMALS } from "config/factors";
import { ExpressTxnParams } from "domain/synthetics/express/types";
import {
  GlvInfo,
  MarketInfo,
  getGlvDisplayName,
  getMarketIndexName,
  getMarketPoolName,
  getMaxAllowedLeverageByMinCollateralFactor,
  getMintableMarketTokens,
  getOpenInterestUsd,
  getSellableMarketToken,
} from "domain/synthetics/markets";
import { PositionInfo, willPositionCollateralBeSufficientForPosition } from "domain/synthetics/positions";
import { TokenData, TokensData, TokensRatio, getIsEquivalentTokens } from "domain/synthetics/tokens";
import { DUST_USD, isAddressZero } from "lib/legacy";
import { PRECISION, expandDecimals, formatAmount, formatUsd } from "lib/numbers";
import { getByKey } from "lib/objects";
import { getToken, NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";
import { MAX_TWAP_NUMBER_OF_PARTS, MIN_TWAP_NUMBER_OF_PARTS } from "sdk/configs/twap";
import {
  ExternalSwapQuote,
  GmSwapFees,
  NextPositionValues,
  SwapPathStats,
  TradeFees,
  TriggerThresholdType,
} from "sdk/types/trade";
import { bigMath } from "sdk/utils/bigmath";

import { getMaxUsdBuyableAmountInMarketWithGm, getSellableInfoGlvInMarket, isGlvInfo } from "../../markets/glv";

export type ValidationTooltipName = "maxLeverage";
export type ValidationResult =
  | [errorMessage: undefined]
  | [errorMessage: string]
  | [errorMessage: string, tooltipName: "maxLeverage" | "liqPrice > markPrice" | "noSwapPath"];

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

export function getExpressError(p: {
  chainId: number;
  expressParams: ExpressTxnParams | undefined;
  tokensData: TokensData | undefined;
}): ValidationResult {
  const { chainId, expressParams, tokensData } = p;

  if (!expressParams) {
    return [undefined];
  }

  const nativeToken = getByKey(tokensData, NATIVE_TOKEN_ADDRESS);

  const isInsufficientNativeTokenBalance =
    nativeToken?.balance === undefined || nativeToken.balance < expressParams?.gasPaymentParams.gasPaymentTokenAmount;

  if (expressParams.gasPaymentValidations.isOutGasTokenBalance && isInsufficientNativeTokenBalance) {
    return [
      t`Insufficient ${getToken(chainId, expressParams?.gasPaymentParams.gasPaymentTokenAddress)?.symbol} balance to pay for gas`,
    ];
  }

  return [undefined];
}

export function getSwapError(p: {
  chainId: number;
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
  externalSwapQuote: ExternalSwapQuote | undefined;
  isWrapOrUnwrap: boolean;
  isStakeOrUnstake: boolean;
  swapLiquidity: bigint | undefined;
  isTwap: boolean;
  numberOfParts: number;
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
    isStakeOrUnstake,
    swapLiquidity,
    swapPathStats,
    externalSwapQuote,
    isTwap,
    numberOfParts,
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

  if (isWrapOrUnwrap || isStakeOrUnstake) {
    return [undefined];
  }

  if (!isLimit && (toUsd === undefined || swapLiquidity === undefined || swapLiquidity < toUsd)) {
    return [t`Insufficient liquidity`];
  }

  if (fromToken.symbol === "STBTC" && toToken.symbol === "BTC") {
    return [t`No swap path found`, "noSwapPath"];
  }

  const noInternalSwap =
    !swapPathStats?.swapPath || (!isLimit && swapPathStats.swapSteps.some((step) => step.isOutLiquidity));

  const noExternalSwap = !externalSwapQuote;

  if (noInternalSwap && noExternalSwap) {
    return [t`Couldn't find a swap path with enough liquidity`];
  }

  if (
    !fees?.payTotalFees ||
    (fees?.payTotalFees && fees.payTotalFees.deltaUsd < 0 && bigMath.abs(fees.payTotalFees.deltaUsd) > (fromUsd ?? 0))
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
      return [t`Limit price above mark price`];
    }

    if (
      triggerRatio &&
      isRatioInverted &&
      (markRatio?.ratio === undefined ? undefined : markRatio.ratio > triggerRatio.ratio)
    ) {
      return [t`Limit price below mark price`];
    }
  }

  if (isTwap && numberOfParts < MIN_TWAP_NUMBER_OF_PARTS) {
    return [t`Min number of parts: ${MIN_TWAP_NUMBER_OF_PARTS}`];
  }

  if (isTwap && numberOfParts > MAX_TWAP_NUMBER_OF_PARTS) {
    return [t`Max number of parts: ${MAX_TWAP_NUMBER_OF_PARTS}`];
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
  triggerPrice: bigint | undefined;
  externalSwapQuote: ExternalSwapQuote | undefined;
  swapPathStats: SwapPathStats | undefined;
  collateralLiquidity: bigint | undefined;
  longLiquidity: bigint | undefined;
  shortLiquidity: bigint | undefined;
  minCollateralUsd: bigint | undefined;
  isLong: boolean;
  isLimit: boolean;
  isTwap: boolean;
  nextLeverageWithoutPnl: bigint | undefined;
  thresholdType: TriggerThresholdType | undefined;
  numberOfParts: number;
  minPositionSizeUsd: bigint | undefined;
  chainId: number;
}): ValidationResult {
  const {
    marketInfo,
    indexToken,
    initialCollateralToken,
    initialCollateralAmount,
    initialCollateralUsd,
    targetCollateralToken,
    collateralUsd,
    sizeDeltaUsd,
    existingPosition,
    fees,
    swapPathStats,
    externalSwapQuote,
    collateralLiquidity,
    longLiquidity,
    shortLiquidity,
    isLong,
    markPrice,
    triggerPrice,
    thresholdType,
    isLimit,
    nextPositionValues,
    nextLeverageWithoutPnl,
    isTwap,
    numberOfParts,
    minPositionSizeUsd,
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
  const noInternalSwap = !swapPathStats?.swapPath?.length;
  const noExternalSwap = !externalSwapQuote;

  if (isNeedSwap) {
    if (noInternalSwap && noExternalSwap) {
      return [t`No swap path found`, "noSwapPath"];
    }

    if (!isLimit) {
      if (noExternalSwap && (collateralLiquidity === undefined || collateralLiquidity < (initialCollateralUsd ?? 0n))) {
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

  const minTwapPartSize = _minCollateralUsd / 2n;
  if (
    !existingPosition &&
    isTwap &&
    numberOfParts > 0 &&
    (collateralUsd === undefined ? undefined : collateralUsd / BigInt(numberOfParts) < minTwapPartSize)
  ) {
    return [t`Min size per part: ${formatUsd(minTwapPartSize)}`];
  }

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

    if (isLong && thresholdType === TriggerThresholdType.Below && markPrice < triggerPrice) {
      return [t`Limit price above mark price`];
    }

    if (!isLong && thresholdType === TriggerThresholdType.Above && markPrice > triggerPrice) {
      return [t`Limit price below mark price`];
    }

    if (isLong && thresholdType === TriggerThresholdType.Above && triggerPrice < markPrice) {
      return [t`Stop market price below mark price`];
    }

    if (!isLong && thresholdType === TriggerThresholdType.Below && triggerPrice > markPrice) {
      return [t`Stop market price above mark price`];
    }
  }

  const maxAllowedLeverage = getMaxAllowedLeverageByMinCollateralFactor(marketInfo?.minCollateralFactor);

  if (nextLeverageWithoutPnl !== undefined && nextLeverageWithoutPnl > maxAllowedLeverage) {
    return [t`Max leverage: ${(maxAllowedLeverage / BASIS_POINTS_DIVISOR).toFixed(1)}x`];
  }

  if (nextLeverageWithoutPnl !== undefined) {
    const maxLeverageError = getIsMaxLeverageExceeded(nextLeverageWithoutPnl, marketInfo, isLong, sizeDeltaUsd);

    if (maxLeverageError) {
      return [t`Max. Leverage exceeded`, "maxLeverage"];
    }
  }

  if (
    minPositionSizeUsd !== undefined &&
    nextPositionValues?.nextSizeUsd !== undefined &&
    nextPositionValues.nextSizeUsd < minPositionSizeUsd
  ) {
    return [t`Min position size: ${formatUsd(minPositionSizeUsd)}`];
  }

  if (nextPositionValues?.nextLiqPrice !== undefined && markPrice !== undefined) {
    if (isLong && nextPositionValues.nextLiqPrice > markPrice) {
      return [t`Invalid liq. price`, "liqPrice > markPrice"];
    }

    if (!isLong && nextPositionValues.nextLiqPrice < markPrice) {
      return [t`Invalid liq. price`, "liqPrice > markPrice"];
    }
  }

  if (isTwap && numberOfParts < MIN_TWAP_NUMBER_OF_PARTS) {
    return [t`Min number of parts: ${MIN_TWAP_NUMBER_OF_PARTS}`];
  }

  if (isTwap && numberOfParts > MAX_TWAP_NUMBER_OF_PARTS) {
    return [t`Max number of parts: ${MAX_TWAP_NUMBER_OF_PARTS}`];
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
  isNotEnoughReceiveTokenLiquidity: boolean;
  triggerThresholdType: TriggerThresholdType | undefined;
  minPositionSizeUsd: bigint | undefined;
  isTwap: boolean;
  numberOfParts: number;
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
    triggerThresholdType,
    isTwap,
    numberOfParts,
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
        return [t`Trigger price below liq. price`];
      }

      if (!isLong && triggerPrice >= existingPosition.liquidationPrice) {
        return [t`Trigger price above liq. price`];
      }
    }

    if (triggerThresholdType === TriggerThresholdType.Above && triggerPrice < (markPrice ?? 0n)) {
      return [t`Trigger price below mark price`];
    }

    if (triggerThresholdType === TriggerThresholdType.Below && triggerPrice > (markPrice ?? 0n)) {
      return [t`Trigger price above mark price`];
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

  if (isTwap && numberOfParts < MIN_TWAP_NUMBER_OF_PARTS) {
    return [t`Min number of parts: ${MIN_TWAP_NUMBER_OF_PARTS}`];
  }

  if (isTwap && numberOfParts > MAX_TWAP_NUMBER_OF_PARTS) {
    return [t`Max number of parts: ${MAX_TWAP_NUMBER_OF_PARTS}`];
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
  glvToken: TokenData | undefined;
  glvTokenAmount: bigint | undefined;
  glvTokenUsd: bigint | undefined;
  longTokenAmount: bigint | undefined;
  shortTokenAmount: bigint | undefined;
  longTokenUsd: bigint | undefined;
  shortTokenUsd: bigint | undefined;
  marketTokenAmount: bigint | undefined;
  marketTokenUsd: bigint | undefined;
  longTokenLiquidityUsd: bigint | undefined;
  shortTokenLiquidityUsd: bigint | undefined;
  fees: GmSwapFees | undefined;
  priceImpactUsd: bigint | undefined;
  glvInfo?: GlvInfo;
  marketTokensData?: TokensData;
  isMarketTokenDeposit?: boolean;
}) {
  const {
    isDeposit,
    marketInfo,
    marketToken,
    longToken,
    shortToken,
    glvToken,
    glvTokenAmount,
    longTokenAmount,
    shortTokenAmount,
    longTokenUsd,
    shortTokenUsd,
    marketTokenAmount,
    marketTokenUsd,
    longTokenLiquidityUsd,
    shortTokenLiquidityUsd,
    fees,
    priceImpactUsd,
    glvInfo,
    marketTokensData,
    isMarketTokenDeposit,
  } = p;

  if (!marketInfo || !marketToken) {
    return [t`Loading...`];
  }

  const glvTooltipMessage = t`The buyable cap for the pool GM: ${marketInfo.name} using the pay token selected is reached. Please choose a different pool, reduce the buy size, or pick a different composition of tokens.`;

  if (isDeposit) {
    if (priceImpactUsd !== undefined && priceImpactUsd > 0) {
      const { impactAmount } = applySwapImpactWithCap(marketInfo, priceImpactUsd);
      const newPoolAmount = applyDeltaToPoolAmount(marketInfo, impactAmount);

      if (!getIsValidPoolAmount(marketInfo, newPoolAmount)) {
        const error = [t`Max pool amount exceeded`];

        if (glvInfo) {
          error.push(glvTooltipMessage);
        }
      }
    }

    if (!getIsValidPoolUsdForDeposit(marketInfo)) {
      const error = [t`Max pool USD exceeded`];

      if (glvInfo) {
        error.push(glvTooltipMessage);
      }
    }

    const totalCollateralUsd = (longTokenUsd ?? 0n) + (shortTokenUsd ?? 0n);

    if (
      (fees?.totalFees?.deltaUsd === undefined ? undefined : fees?.totalFees?.deltaUsd < 0) &&
      bigMath.abs(fees?.totalFees?.deltaUsd ?? 0n) > totalCollateralUsd
    ) {
      return [t`Fees exceed Pay amount`];
    }

    if (glvInfo) {
      const glvMarket = marketToken && glvInfo.markets.find(({ address }) => address === marketToken.address);

      if (glvMarket) {
        const maxBuyableUsdInGm = getMaxUsdBuyableAmountInMarketWithGm(glvMarket, glvInfo, marketInfo, marketToken);
        if (marketTokenUsd !== undefined && maxBuyableUsdInGm < marketTokenUsd) {
          return [t`Max pool amount reached`, glvTooltipMessage];
        }
      }

      const mintableInfo = getMintableMarketTokens(marketInfo, marketToken);
      const maxLongExceeded = longTokenAmount !== undefined && longTokenAmount > mintableInfo.longDepositCapacityAmount;
      const maxShortExceeded =
        shortTokenAmount !== undefined && shortTokenAmount > mintableInfo.shortDepositCapacityAmount;

      if (maxLongExceeded || maxShortExceeded) {
        return [t`Max GM buyable amount reached`, glvTooltipMessage];
      }
    } else {
      const mintableInfo = getMintableMarketTokens(marketInfo, marketToken);
      if (longTokenAmount !== undefined && longTokenAmount > mintableInfo.longDepositCapacityAmount) {
        return [t`Max ${longToken?.symbol} amount exceeded`];
      }

      if (shortTokenAmount !== undefined && shortTokenAmount > mintableInfo.shortDepositCapacityAmount) {
        return [t`Max ${shortToken?.symbol} amount exceeded`];
      }
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

  if (
    marketTokenAmount === undefined ||
    marketTokenAmount < 0 ||
    (marketTokenAmount === 0n && longTokenAmount === 0n && shortTokenAmount === 0n)
  ) {
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

    if (glvInfo) {
      if (isMarketTokenDeposit && marketToken && (marketTokenAmount ?? 0n) > (marketToken?.balance ?? 0n)) {
        return [t`Insufficient GM balance`];
      }

      const { mintableUsd: mintableGmUsd } = getMintableMarketTokens(marketInfo, marketToken);
      const glvGmMarket = glvInfo.markets.find(({ address }) => address === marketInfo.marketTokenAddress);
      const gmToken = marketTokensData?.[marketInfo.marketTokenAddress];

      if (!gmToken) {
        return [t`Loading...`];
      }

      const maxMintableInMarketUsd = glvGmMarket
        ? getMaxUsdBuyableAmountInMarketWithGm(glvGmMarket, glvInfo, marketInfo, gmToken)
        : 0n;

      if (marketTokenUsd !== undefined && (mintableGmUsd < marketTokenUsd || maxMintableInMarketUsd < marketTokenUsd)) {
        return [
          t`Max pool amount reached`,
          longToken?.symbol === "GM"
            ? t`The buyable cap for the pool GM: ${marketInfo.name} in ${getGlvDisplayName(glvInfo)} [${getMarketPoolName(glvInfo)}] has been reached. Please reduce the buy size, pick a different GM token, or shift the GM tokens to a different pool and try again.`
            : t`The buyable cap for the pool GM: ${marketInfo.name} in ${getGlvDisplayName(glvInfo)} [${getMarketPoolName(glvInfo)}] has been reached. Please choose a different pool or reduce the buy size.`,
        ];
      }
    }
  } else {
    if (glvInfo) {
      if ((glvTokenAmount ?? 0n) > (glvToken?.balance ?? 0n)) {
        return [t`Insufficient ${glvToken?.symbol} balance`];
      }
    } else {
      if (marketTokenAmount > (marketToken?.balance ?? 0n)) {
        return [t`Insufficient ${marketToken?.symbol} balance`];
      }
    }

    if (glvInfo) {
      const sellableGlvInMarket = getSellableInfoGlvInMarket(glvInfo, marketToken);

      if ((glvTokenAmount ?? 0n) > (sellableGlvInMarket.sellableAmount ?? 0n)) {
        return [
          t`Insufficient GLV liquidity`,
          t`There isn't enough GM: ${getMarketIndexName(marketInfo)} [${getMarketPoolName(marketInfo)}] liquidity in GLV to fulfill your sell request. Please choose a different pool, reduce the sell size, or split your withdrawal from multiple pools.`,
        ];
      }

      const sellableWithinMarket = getSellableMarketToken(marketInfo, marketToken);

      if ((marketTokenUsd ?? 0n) > (sellableWithinMarket.totalUsd ?? 0n)) {
        return [
          t`Insufficient liquidity in GM Pool`,
          t`The sellable cap for the pool GM: ${getMarketIndexName(marketInfo)} [${getMarketPoolName(marketInfo)}]  has been reached, as the tokens are reserved by traders. Please choose a different pool, reduce the sell size, or split your withdrawal from multiple pools.`,
        ];
      }
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
export function getGmShiftError({
  fromMarketInfo,
  fromToken,
  fromTokenAmount,
  fromTokenUsd,
  fromLongTokenAmount,
  fromShortTokenAmount,
  toMarketInfo,
  toToken,
  toTokenAmount,
  fees,
  priceImpactUsd,
}: {
  fromMarketInfo: MarketInfo | undefined;
  fromToken: TokenData | undefined;
  fromTokenAmount: bigint | undefined;
  fromTokenUsd: bigint | undefined;
  fromLongTokenAmount: bigint | undefined;
  fromShortTokenAmount: bigint | undefined;
  toMarketInfo: MarketInfo | undefined;
  toToken: TokenData | undefined;
  toTokenAmount: bigint | undefined;
  fees: GmSwapFees | undefined;
  priceImpactUsd: bigint | undefined;
}) {
  const isGlv = isGlvInfo(toMarketInfo);

  if (!fromMarketInfo || !fromToken || !toMarketInfo || !toToken) {
    return [t`Loading...`];
  }

  if (priceImpactUsd !== undefined && priceImpactUsd > 0) {
    const { impactAmount } = applySwapImpactWithCap(toMarketInfo, priceImpactUsd);
    const newPoolAmount = applyDeltaToPoolAmount(toMarketInfo, impactAmount);

    if (!getIsValidPoolAmount(toMarketInfo, newPoolAmount)) {
      return [t`Max pool amount exceeded`];
    }
  }

  if (!getIsValidPoolUsdForDeposit(toMarketInfo)) {
    return [t`Max pool USD exceeded`];
  }

  const sellable = getSellableMarketToken(fromMarketInfo, fromToken);

  if (fromTokenAmount !== undefined && sellable.totalAmount < fromTokenAmount) {
    return [t`Max ${fromToken?.symbol} sellable amount exceeded`];
  }

  const mintableInfo = getMintableMarketTokens(toMarketInfo, toToken);

  const longExceedCapacity =
    fromLongTokenAmount !== undefined && fromLongTokenAmount > mintableInfo.longDepositCapacityAmount;
  const shortExceedCapacity =
    fromShortTokenAmount !== undefined && fromShortTokenAmount > mintableInfo.shortDepositCapacityAmount;

  if (!isGlv && (longExceedCapacity || shortExceedCapacity)) {
    return [t`Max ${fromToken?.symbol} buyable amount exceeded`];
  }

  const totalCollateralUsd = fromTokenUsd ?? 0n;

  const feesExistAndNegative = fees?.totalFees?.deltaUsd === undefined ? undefined : fees?.totalFees?.deltaUsd < 0;
  if (feesExistAndNegative && bigMath.abs(fees?.totalFees?.deltaUsd ?? 0n) > totalCollateralUsd) {
    return [t`Fees exceed Pay amount`];
  }

  if ((fromTokenAmount ?? 0n) < 0 || (toTokenAmount ?? 0n) < 0) {
    return [t`Amount should be greater than zero`];
  }

  if (fromTokenAmount === undefined || fromTokenAmount <= 0n || toTokenAmount === undefined || toTokenAmount <= 0n) {
    return [t`Enter an amount`];
  }

  if ((fromTokenAmount ?? 0n) > (fromToken?.balance ?? 0n)) {
    return [t`Insufficient ${fromToken?.symbol} balance`];
  }

  return [undefined];
}

function getIsValidPoolUsdForDeposit(marketInfo: MarketInfo) {
  const tokenIn = getTokenIn(marketInfo);
  const poolAmount =
    tokenIn.address === marketInfo.longToken.address ? marketInfo.longPoolAmount : marketInfo.shortPoolAmount;
  const poolUsd = bigMath.mulDiv(tokenIn.prices.maxPrice, poolAmount, expandDecimals(1, tokenIn.decimals));
  const maxPoolUsd =
    tokenIn.address === marketInfo.longToken.address
      ? marketInfo.maxLongPoolUsdForDeposit
      : marketInfo.maxShortPoolUsdForDeposit;

  return poolUsd <= maxPoolUsd;
}

function applySwapImpactWithCap(marketInfo: MarketInfo, priceImpactUsd: bigint) {
  const impactAmount = getSwapImpactAmountWithCap(marketInfo, priceImpactUsd);
  const newSwapImpactPoolAmount = applyDeltaToSwapImpactPool(marketInfo, -impactAmount);

  return { impactAmount, newSwapImpactPoolAmount };
}

function getSwapImpactAmountWithCap(marketInfo: MarketInfo, priceImpactUsd: bigint) {
  const token = getTokenOut(marketInfo);
  let impactAmount = 0n;

  if (priceImpactUsd > 0) {
    // positive impact: minimize impactAmount, use tokenPrice.max
    // round positive impactAmount down, this will be deducted from the swap impact pool for the user
    impactAmount = priceImpactUsd / token.prices.maxPrice;

    const maxImpactAmount = getSwapImpactPoolAmount(marketInfo);
    if (impactAmount > maxImpactAmount) {
      impactAmount = maxImpactAmount;
    }
  } else {
    // negative impact: maximize impactAmount, use tokenPrice.min
    // round negative impactAmount up, this will be deducted from the user
    impactAmount = roundUpMagnitudeDivision(priceImpactUsd, token.prices.minPrice);
  }

  return impactAmount;
}

function roundUpMagnitudeDivision(a: bigint, b: bigint): bigint {
  if (a < 0) {
    return (a - b + 1n) / b;
  }

  return (a + b - 1n) / b;
}

function applyDeltaToSwapImpactPool(marketInfo: MarketInfo, delta: bigint) {
  const maxImpactAmount = getSwapImpactPoolAmount(marketInfo);

  if (delta < 0 && -delta > maxImpactAmount) {
    return 0n;
  }

  return maxImpactAmount + delta;
}

function applyDeltaToPoolAmount(marketInfo: MarketInfo, delta: bigint) {
  const poolAmount =
    getTokenOut(marketInfo).address === marketInfo.longToken.address
      ? marketInfo.longPoolAmount
      : marketInfo.shortPoolAmount;

  return poolAmount + delta;
}

function getTokenOut(marketInfo: MarketInfo) {
  return marketInfo.longToken;
}

function getTokenIn(marketInfo: MarketInfo) {
  return marketInfo.shortToken;
}

function getSwapImpactPoolAmount(marketInfo: MarketInfo) {
  return getTokenOut(marketInfo).address === marketInfo.longToken.address
    ? marketInfo.swapImpactPoolAmountLong
    : marketInfo.swapImpactPoolAmountShort;
}

function getIsValidPoolAmount(marketInfo: MarketInfo, poolAmount: bigint) {
  const maxPoolAmount =
    getTokenOut(marketInfo).address === marketInfo.longToken.address
      ? marketInfo.maxLongPoolAmount
      : marketInfo.maxShortPoolAmount;

  return poolAmount <= maxPoolAmount;
}
