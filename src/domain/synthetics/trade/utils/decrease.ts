import { VirtualInventoryForPositionsData, getPositionFee, getPriceImpactForPosition } from "domain/synthetics/fees";
import { Market, MarketInfo } from "domain/synthetics/markets";
import { DecreasePositionSwapType, OrderType } from "domain/synthetics/orders";
import { PositionInfo, getLeverage, getLiquidationPrice, getPositionPnlUsd } from "domain/synthetics/positions";
import { TokenData, convertToTokenAmount } from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import { DUST_USD } from "lib/legacy";
import { getBasisPoints } from "lib/numbers";
import { DecreasePositionAmounts, NextPositionValues, TriggerThresholdType } from "../types";
import { getAcceptablePrice, getMarkPrice, getTriggerDecreaseOrderType, getTriggerThresholdType } from "./prices";

export function getDecreasePositionAmounts(p: {
  marketInfo: MarketInfo;
  collateralToken: TokenData;
  virtualInventoryForPositions: VirtualInventoryForPositionsData;
  isLong: boolean;
  existingPosition?: PositionInfo;
  receiveToken: TokenData;
  closeSizeUsd: BigNumber;
  keepLeverage: boolean;
  isTrigger?: boolean;
  triggerPrice?: BigNumber;
  savedAcceptablePriceImpactBps?: BigNumber;
}): DecreasePositionAmounts {
  const {
    marketInfo,
    collateralToken,
    receiveToken,
    isLong,
    existingPosition,
    closeSizeUsd,
    keepLeverage,
    isTrigger,
    triggerPrice,
    savedAcceptablePriceImpactBps,
    virtualInventoryForPositions,
  } = p;

  const { indexToken } = p.marketInfo;
  const markPrice = getMarkPrice({ prices: indexToken.prices, isIncrease: false, isLong });
  const exitPrice = isTrigger && triggerPrice ? triggerPrice : markPrice;

  const decreaseSwapType = getDecreaseSwapType({
    market: marketInfo,
    collateralTokenAddress: collateralToken.address,
    isLong,
  });

  let triggerPricePrefix: TriggerThresholdType | undefined = undefined;
  let triggerOrderType: OrderType | undefined = undefined;

  if (isTrigger && triggerPrice) {
    triggerOrderType = getTriggerDecreaseOrderType({
      markPrice,
      triggerPrice,
      isLong,
    });
    triggerPricePrefix = getTriggerThresholdType(triggerOrderType, isLong);
  }

  let sizeDeltaUsd = closeSizeUsd;

  const isClosing = existingPosition?.sizeInUsd.sub(sizeDeltaUsd).lt(DUST_USD) || false;

  if (isClosing) {
    sizeDeltaUsd = existingPosition!.sizeInUsd;
  }

  const sizeDeltaInTokens = convertToTokenAmount(sizeDeltaUsd, indexToken.decimals, exitPrice)!;

  const positionFeeUsd = getPositionFee(marketInfo, sizeDeltaUsd);
  const positionPriceImpactDeltaUsd = getPriceImpactForPosition(
    marketInfo,
    virtualInventoryForPositions,
    sizeDeltaUsd,
    isLong
  );

  const { acceptablePrice, acceptablePriceImpactBps } = getAcceptablePrice({
    isIncrease: false,
    isLong,
    indexPrice: exitPrice,
    sizeDeltaUsd,
    priceImpactDeltaUsd: !isTrigger ? positionPriceImpactDeltaUsd : undefined,
    acceptablePriceImpactBps: isTrigger ? savedAcceptablePriceImpactBps : undefined,
  });

  let collateralDeltaUsd = BigNumber.from(0);
  let collateralDeltaAmount = BigNumber.from(0);
  let receiveUsd = BigNumber.from(0);
  let receiveTokenAmount = BigNumber.from(0);
  let exitPnl = BigNumber.from(0);
  let exitPnlPercentage = BigNumber.from(0);
  let pnlDelta = BigNumber.from(0);

  if (existingPosition && existingPosition.sizeInUsd.gt(0) && existingPosition.initialCollateralUsd.gt(0)) {
    const collateralDeltaInfo = getCollateralDeltaForDecreaseOrder({
      position: existingPosition,
      sizeDeltaUsd,
      keepLeverage,
      collateralPrice: collateralToken.prices.maxPrice,
    });

    collateralDeltaUsd = collateralDeltaInfo.collateralDeltaUsd;
    collateralDeltaAmount = collateralDeltaInfo.collateralDeltaAmount;

    exitPnl = getPositionPnlUsd({
      marketInfo,
      sizeInUsd: existingPosition.sizeInUsd,
      sizeInTokens: existingPosition.sizeInTokens,
      isLong,
      markPrice: exitPrice,
    });
    exitPnlPercentage = !existingPosition.initialCollateralUsd.eq(0)
      ? getBasisPoints(exitPnl, existingPosition.initialCollateralUsd)
      : BigNumber.from(0);

    pnlDelta = getPnlDeltaForDecreaseOrder({
      sizeInUsd: existingPosition.sizeInUsd,
      sizeInTokens: existingPosition.sizeInTokens,
      isLong,
      pnl: exitPnl,
      sizeDeltaUsd,
    });

    receiveUsd = collateralDeltaUsd
      .add(pnlDelta)
      .sub(positionFeeUsd)
      .sub(existingPosition.pendingBorrowingFeesUsd)
      .add(positionPriceImpactDeltaUsd)
      .sub(existingPosition.pendingFundingFeesUsd);

    if (receiveUsd.lt(0)) {
      receiveUsd = BigNumber.from(0);
    }

    receiveTokenAmount = convertToTokenAmount(receiveUsd, receiveToken.decimals, receiveToken.prices.minPrice)!;
  }

  return {
    sizeDeltaUsd,
    sizeDeltaInTokens,
    collateralDeltaUsd,
    collateralDeltaAmount,
    pnlDelta,
    receiveUsd,
    receiveTokenAmount,
    exitPrice: exitPrice,
    exitPnl,
    exitPnlPercentage,
    acceptablePrice,
    positionFeeUsd,
    triggerPrice,
    triggerPricePrefix,
    triggerOrderType,
    decreaseSwapType,
    positionPriceImpactDeltaUsd,
    acceptablePriceImpactBps,
  };
}

export function getNextPositionValuesForDecreaseTrade(p: {
  existingPosition?: PositionInfo;
  marketInfo: MarketInfo;
  sizeDeltaUsd: BigNumber;
  pnlDelta: BigNumber;
  exitPnl: BigNumber;
  collateralDeltaUsd: BigNumber;
  executionPrice: BigNumber;
  showPnlInLeverage: boolean;
  isLong: boolean;
  minCollateralUsd: BigNumber;
}): NextPositionValues {
  const {
    existingPosition,
    marketInfo,
    sizeDeltaUsd,
    pnlDelta,
    exitPnl,
    collateralDeltaUsd,
    executionPrice,
    showPnlInLeverage,
    isLong,
    minCollateralUsd,
  } = p;

  const nextSizeUsd = existingPosition ? existingPosition.sizeInUsd.sub(sizeDeltaUsd) : BigNumber.from(0);

  const nextCollateralUsd = existingPosition
    ? existingPosition.initialCollateralUsd.sub(collateralDeltaUsd)
    : BigNumber.from(0);

  const nextPnl = exitPnl.gt(0) ? exitPnl.sub(pnlDelta) : BigNumber.from(0);
  const nextPnlPercentage = !nextCollateralUsd.eq(0) ? getBasisPoints(nextPnl, nextCollateralUsd) : BigNumber.from(0);

  const nextLeverage = getLeverage({
    sizeInUsd: nextSizeUsd,
    collateralUsd: nextCollateralUsd,
    pnl: showPnlInLeverage ? nextPnl : undefined,
    pendingBorrowingFeesUsd: BigNumber.from(0), // deducted on order
    pendingFundingFeesUsd: BigNumber.from(0), // deducted on order
  });

  const nextLiqPrice = getLiquidationPrice({
    sizeInUsd: nextSizeUsd,
    collateralUsd: nextCollateralUsd,
    markPrice: executionPrice,
    minCollateralFactor: marketInfo.minCollateralFactor,
    minCollateralUsd,
    closingFeeUsd: getPositionFee(marketInfo, sizeDeltaUsd),
    maxPriceImpactFactor: marketInfo?.maxPositionImpactFactorForLiquidations,
    pendingBorrowingFeesUsd: BigNumber.from(0), // deducted on order
    pendingFundingFeesUsd: BigNumber.from(0), // deducted on order
    pnl: pnlDelta,
    isLong: isLong,
  });

  return {
    nextSizeUsd,
    nextCollateralUsd,
    nextLiqPrice,
    nextPnl,
    nextPnlPercentage,
    nextLeverage,
  };
}

export function getCollateralDeltaForDecreaseOrder(p: {
  position: {
    sizeInUsd: BigNumber;
    initialCollateralUsd: BigNumber;
    collateralToken: TokenData;
  };
  sizeDeltaUsd: BigNumber;
  collateralPrice: BigNumber;
  keepLeverage: boolean;
}) {
  const { position, sizeDeltaUsd, collateralPrice, keepLeverage } = p;

  let collateralDeltaUsd = BigNumber.from(0);

  if (position.sizeInUsd.eq(sizeDeltaUsd)) {
    collateralDeltaUsd = position.initialCollateralUsd;
  } else if (keepLeverage) {
    collateralDeltaUsd = sizeDeltaUsd.mul(position.initialCollateralUsd).div(position.sizeInUsd);
  }

  const collateralDeltaAmount = convertToTokenAmount(
    collateralDeltaUsd,
    position.collateralToken.decimals,
    collateralPrice
  )!;

  return { collateralDeltaUsd, collateralDeltaAmount };
}

export function getPnlDeltaForDecreaseOrder(p: {
  pnl: BigNumber;
  sizeInUsd: BigNumber;
  sizeInTokens: BigNumber;
  isLong: boolean;
  sizeDeltaUsd: BigNumber;
}) {
  const { pnl, sizeInTokens, sizeInUsd, isLong, sizeDeltaUsd } = p;

  let sizeDeltaInTokens: BigNumber;

  if (sizeInUsd.eq(sizeDeltaUsd)) {
    sizeDeltaInTokens = sizeInTokens;
  } else {
    if (isLong) {
      // roudUpDivision
      sizeDeltaInTokens = sizeDeltaUsd.mul(sizeInTokens).div(sizeInUsd);
    } else {
      sizeDeltaInTokens = sizeDeltaUsd.mul(sizeInTokens).div(sizeInUsd);
    }
  }

  const pnlDelta = pnl.mul(sizeDeltaInTokens).div(sizeInTokens);

  return pnlDelta;
}

export function getDecreaseSwapType(p: { market: Market; collateralTokenAddress: string; isLong: boolean }) {
  const { market, collateralTokenAddress, isLong } = p;

  const pnlTokenAddress = isLong ? market.longTokenAddress : market.shortTokenAddress;

  if (pnlTokenAddress !== collateralTokenAddress) {
    return DecreasePositionSwapType.SwapPnlTokenToCollateralToken;
  }

  return DecreasePositionSwapType.NoSwap;
}
