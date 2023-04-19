import { t } from "@lingui/macro";
import { IS_NETWORK_DISABLED, getChainName } from "config/chains";
import { MarketInfo } from "domain/synthetics/markets";
import { PositionInfo } from "domain/synthetics/positions";
import { TokenData, TokensRatio } from "domain/synthetics/tokens";
import { getIsEquivalentTokens } from "domain/tokens";
import { BigNumber } from "ethers";
import { BASIS_POINTS_DIVISOR, MAX_ALLOWED_LEVERAGE, USD_DECIMALS, isAddressZero } from "lib/legacy";
import { expandDecimals, formatAmount, formatUsd } from "lib/numbers";
import { NextPositionValues, SwapPathStats, TradeFees } from "../types";

export function getCommonError(p: { chainId: number; isConnected: boolean; hasOutdatedUi: boolean }) {
  const { chainId, isConnected, hasOutdatedUi } = p;

  if (IS_NETWORK_DISABLED[chainId]) {
    return [t`App disabled, pending ${getChainName(chainId)} upgrade`];
  }

  if (hasOutdatedUi) {
    return [t`Page outdated, please refresh`];
  }

  if (!isConnected) {
    return [t`Connect wallet`];
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
  isWrapOrUnwrap: boolean;
  swapLiquidity: BigNumber | undefined;
}) {
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

  if (!fees?.totalFees || (fees.totalFees.deltaUsd.lt(0) && fees.totalFees.deltaUsd.abs().gt(fromUsd || 0))) {
    return [t`Fees exceed Pay amount`];
  }

  if (isLimit) {
    if (!triggerRatio?.ratio.gt(0)) {
      return [t`Enter a  price`];
    }

    const isRatioInverted = [fromToken.wrappedAddress, fromToken.address].includes(triggerRatio.largestToken.address);

    if (triggerRatio && !isRatioInverted && markRatio?.ratio.lt(triggerRatio.ratio)) {
      return [t`Price above Mark Price`];
    }

    if (triggerRatio && isRatioInverted && markRatio?.ratio.gt(triggerRatio.ratio)) {
      return [t`Price below Mark Price`];
    }
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
  triggerPrice: BigNumber | undefined;
  swapPathStats: SwapPathStats | undefined;
  collateralLiquidity: BigNumber | undefined;
  longLiquidity: BigNumber | undefined;
  shortLiquidity: BigNumber | undefined;
  minCollateralUsd: BigNumber | undefined;
  isLong: boolean;
  isLimit: boolean;
}) {
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
    collateralLiquidity,
    minCollateralUsd,
    longLiquidity,
    shortLiquidity,
    isLong,
    markPrice,
    triggerPrice,
    isLimit,
    nextPositionValues,
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

  if (!initialCollateralAmount?.gt(0) || !initialCollateralUsd?.gt(0) || !sizeDeltaUsd || !fees?.totalFees) {
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

    if (!collateralLiquidity || collateralLiquidity?.lt(initialCollateralUsd || BigNumber.from(0))) {
      return [t`Insufficient liquidity to swap collateral`];
    }
  }

  if (fees.totalFees.deltaUsd.lt(0) && fees?.totalFees?.deltaUsd.abs().gt(initialCollateralUsd || 0)) {
    return [t`Fees exceed amount`];
  }

  const _minCollateralUsd = minCollateralUsd || expandDecimals(10, USD_DECIMALS);

  if (!existingPosition && collateralUsd?.lt(_minCollateralUsd)) {
    return [t`Min order: ${formatUsd(_minCollateralUsd)}`];
  }

  if (isLong && (!longLiquidity || longLiquidity.lt(sizeDeltaUsd))) {
    return [t`Max ${indexToken.symbol} long exceeded`];
  }

  if (!isLong && (!shortLiquidity || shortLiquidity.lt(sizeDeltaUsd))) {
    return [t`Max ${indexToken.symbol} short exceeded`];
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

  if (!nextPositionValues?.nextLeverage || nextPositionValues?.nextLeverage.gt(MAX_ALLOWED_LEVERAGE)) {
    return [t`Max leverage: ${(MAX_ALLOWED_LEVERAGE / BASIS_POINTS_DIVISOR).toFixed(1)}x`];
  }

  return [undefined];
}

export function getDecreaseError(p: {
  marketInfo: MarketInfo | undefined;
  sizeDeltaUsd: BigNumber | undefined;
  receiveToken: TokenData | undefined;
  isTrigger: boolean;
  triggerPrice: BigNumber | undefined;
  existingPosition: PositionInfo | undefined;
  nextPositionValues: NextPositionValues | undefined;
  isLong: boolean;
  isContractAccount: boolean;
  minCollateralUsd: BigNumber | undefined;
  isNotEnoughReceiveTokenLiquidity: boolean;
}) {
  const {
    marketInfo,
    sizeDeltaUsd,
    isTrigger,
    triggerPrice,
    existingPosition,
    isContractAccount,
    receiveToken,
    nextPositionValues,
    isLong,
    minCollateralUsd,
    isNotEnoughReceiveTokenLiquidity,
  } = p;

  if (isContractAccount && isAddressZero(receiveToken?.address)) {
    return [t`${receiveToken?.symbol} can not be sent to smart contract addresses. Select another token.`];
  }

  if (!marketInfo) {
    return [t`Select a market`];
  }

  if (!sizeDeltaUsd?.gt(0)) {
    return [t`Enter a size`];
  }

  if (isTrigger) {
    if (!triggerPrice?.gt(0)) {
      return [t`Enter a trigger price`];
    }

    if (existingPosition?.liquidationPrice) {
      if (isLong && triggerPrice.lte(existingPosition.liquidationPrice)) {
        return [t`Price below Liq. Price`];
      }

      if (!isLong && triggerPrice?.gte(existingPosition.liquidationPrice)) {
        return [t`Price above Liq. Price`];
      }
    }
  }

  if (nextPositionValues?.nextLeverage && nextPositionValues?.nextLeverage.gt(MAX_ALLOWED_LEVERAGE)) {
    return [t`Max leverage: ${(MAX_ALLOWED_LEVERAGE / BASIS_POINTS_DIVISOR).toFixed(1)}x`];
  }

  if (existingPosition) {
    if (sizeDeltaUsd.gt(existingPosition.sizeInUsd)) {
      return [t`Max close amount exceeded`];
    }

    if (
      !existingPosition.sizeInUsd.eq(sizeDeltaUsd) &&
      nextPositionValues?.nextCollateralUsd?.lt(minCollateralUsd || 0)
    ) {
      return [t`Leftover collateral below ${formatAmount(minCollateralUsd, USD_DECIMALS, 2)} USD`];
    }
  }

  if (isNotEnoughReceiveTokenLiquidity) {
    return [t`Insufficient receive token liquidity`];
  }

  return [undefined];
}

export function getEditCollateralError(p: {
  collateralDeltaAmount: BigNumber | undefined;
  collateralDeltaUsd: BigNumber | undefined;
  nextCollateralUsd: BigNumber | undefined;
  minCollateralUsd: BigNumber | undefined;
  nextLiqPrice: BigNumber | undefined;
  nextLeverage: BigNumber | undefined;
  position: PositionInfo | undefined;
  isDeposit: boolean;
}) {
  const {
    collateralDeltaAmount,
    collateralDeltaUsd,
    minCollateralUsd,
    nextCollateralUsd,
    nextLeverage,
    nextLiqPrice,
    position,
    isDeposit,
  } = p;

  if (!collateralDeltaAmount || collateralDeltaAmount.eq(0)) {
    return [t`Enter an amount`];
  }

  if (collateralDeltaAmount.lte(0)) {
    return [t`Amount should be greater than zero`];
  }

  if (!isDeposit && nextCollateralUsd && minCollateralUsd) {
    if (nextCollateralUsd.lt(minCollateralUsd)) {
      return [t`Min residual collateral: ${formatAmount(minCollateralUsd, USD_DECIMALS, 2)} USD`];
    }
  }

  if (!isDeposit && collateralDeltaUsd && nextLiqPrice && position?.markPrice) {
    if (position?.isLong && position?.markPrice.lt(nextLiqPrice)) {
      return [t`Invalid liq. price`];
    }
    if (!position.isLong && position.markPrice.gt(nextLiqPrice)) {
      return [t`Invalid liq. price`];
    }
  }

  if (nextLeverage && nextLeverage.gt(MAX_ALLOWED_LEVERAGE)) {
    return [t`Max leverage: ${(MAX_ALLOWED_LEVERAGE / BASIS_POINTS_DIVISOR).toFixed(1)}x`];
  }

  return [false];
}
