import { getPositionFee, getPriceImpactForPosition } from "domain/synthetics/fees";
import { Market, MarketInfo } from "domain/synthetics/markets";
import { getTriggerDecreaseOrderType, getTriggerPricePrefixForOrder } from "domain/synthetics/orders";
import { PositionInfo } from "domain/synthetics/positions";
import { TokenData, convertToTokenAmount } from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import { DUST_USD } from "lib/legacy";
import { DecreasePositionAmounts, DecreasePositionTradeParams, NextPositionValues } from "../types";
import { getDisplayedTradeFees } from "./common";
import { applySlippage, getAcceptablePrice, getMarkPrice } from "./prices";

// export function getDecreasePositionTradeParams(p: {
//   marketInfo: MarketInfo;
//   collateralToken: TokenData;
//   receiveToken: TokenData;
//   existingPosition?: PositionInfo;
//   sizeDeltaUsd?: BigNumber;
//   triggerPrice?: BigNumber;
//   keepLeverage?: boolean;
//   showPnlInLeverage?: boolean;
//   allowedSlippage?: number;
//   isTrigger?: boolean;
//   acceptablePriceImpactBps?: BigNumber;
//   isLong?: boolean;
//   maxLeverage?: BigNumber;
// }): DecreasePositionTradeParams | undefined {
//   const decreasePositionAmounts = getDecreasePositionAmounts(p);

//   if (!decreasePositionAmounts) {
//     return undefined;
//   }

//   const nextPositionValues = getNextPositionValuesForDecreaseTrade({
//     marketInfo: p.marketInfo,
//     existingPosition: p.existingPosition,
//     sizeDeltaUsd: decreasePositionAmounts?.sizeDeltaUsd,
//     pnlDelta: decreasePositionAmounts?.pnlDelta,
//     collateralDeltaUsd: decreasePositionAmounts?.collateralDeltaUsd,
//     executionPrice: decreasePositionAmounts?.exitPrice,
//     showPnlInLeverage: p.showPnlInLeverage,
//     isLong: p.isLong,
//     maxLeverage: p.maxLeverage,
//   });

//   const fees = getDisplayedTradeFees({
//     marketInfo: p.marketInfo,
//     sizeDeltaUsd: decreasePositionAmounts.sizeDeltaUsd,
//     positionFeeUsd: decreasePositionAmounts.positionFeeUsd,
//     positionPriceImpactDeltaUsd: !p.isTrigger ? decreasePositionAmounts.positionPriceImpactDeltaUsd : undefined,
//     borrowingFeeUsd: p.existingPosition?.pendingBorrowingFeesUsd,
//     fundingFeeDeltaUsd: p.existingPosition?.pendingFundingFeesUsd,
//   });

//   return {
//     ...decreasePositionAmounts,
//     market: p.marketInfo,
//     collateralToken: p.collateralToken,
//     receiveToken: p.receiveToken,
//     nextPositionValues,
//     fees,
//   };
// }

export function getDecreasePositionAmounts(p: {
  marketInfo: MarketInfo;
  collateralToken: TokenData;
  isLong: boolean;
  existingPosition?: PositionInfo;
  receiveToken: TokenData;
  sizeDeltaUsd: BigNumber;
  keepLeverage: boolean;
  allowedSlippage: number;
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
    sizeDeltaUsd: _sizeDeltaUsd,
    keepLeverage,
    allowedSlippage,
    isTrigger,
    triggerPrice,
    savedAcceptablePriceImpactBps,
  } = p;

  const { indexToken } = p.marketInfo;
  const markPrice = getMarkPrice({ prices: indexToken.prices, isIncrease: false, isLong });
  const exitPrice = isTrigger && triggerPrice ? triggerPrice : markPrice;

  const orderType = getTriggerDecreaseOrderType({
    isLong,
    isTriggerAboveMarkPrice: triggerPrice?.gt(markPrice) || false,
  });

  const triggerPricePrefix = getTriggerPricePrefixForOrder(orderType, isLong);

  let sizeDeltaUsd = _sizeDeltaUsd;

  const isClosing = existingPosition?.sizeInUsd.sub(sizeDeltaUsd).lt(DUST_USD) || false;

  if (isClosing) {
    sizeDeltaUsd = p.existingPosition!.sizeInUsd;
  }

  const sizeDeltaInTokens = convertToTokenAmount(sizeDeltaUsd, indexToken.decimals, exitPrice)!;

  const positionFeeUsd = getPositionFee(marketInfo, sizeDeltaUsd);
  const positionPriceImpactDeltaUsd = getPriceImpactForPosition(marketInfo, sizeDeltaUsd, isLong);

  const { acceptablePrice, acceptablePriceImpactBps } = getAcceptablePrice({
    isIncrease: false,
    isLong,
    indexPrice: exitPrice,
    sizeDeltaUsd,
    priceImpactDeltaUsd: !isTrigger ? positionPriceImpactDeltaUsd : undefined,
    acceptablePriceImpactBps: isTrigger ? savedAcceptablePriceImpactBps : undefined,
  });

  const acceptablePriceAfterSlippage = applySlippage(allowedSlippage, acceptablePrice, false, p.isLong);

  let collateralDeltaUsd = BigNumber.from(0);
  let collateralDeltaAmount = BigNumber.from(0);
  let receiveUsd = BigNumber.from(0);
  let receiveTokenAmount = BigNumber.from(0);
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

    pnlDelta = getPnlDeltaForDecreaseOrder({ position: existingPosition, sizeDeltaUsd });

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
    acceptablePrice,
    positionFeeUsd,
    triggerPrice: p.triggerPrice,
    triggerPricePrefix,
    positionPriceImpactDeltaUsd,
    acceptablePriceImpactBps,
    acceptablePriceAfterSlippage,
  };
}

export function getNextPositionValuesForDecreaseTrade(p: {
  marketInfo?: MarketInfo;
  existingPosition?: PositionInfo;
  sizeDeltaUsd?: BigNumber;
  pnlDelta?: BigNumber;
  collateralDeltaUsd?: BigNumber;
  executionPrice?: BigNumber;
  showPnlInLeverage?: boolean;
  isLong?: boolean;
  maxLeverage?: BigNumber;
}): NextPositionValues | undefined {
  const nextSizeUsd = p.existingPosition?.sizeInUsd.sub(p.sizeDeltaUsd || BigNumber.from(0));

  const nextCollateralUsd = p.existingPosition?.initialCollateralUsd?.sub(p.collateralDeltaUsd || BigNumber.from(0));

  const nextPnl = p.existingPosition?.pnl?.sub(p.pnlDelta || BigNumber.from(0));

  const nextLeverage = undefined;

  const nextLiqPrice = undefined;

  return {
    nextSizeUsd,
    nextCollateralUsd,
    nextLiqPrice,
    nextPnl,
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
  position: {
    pnl: BigNumber;
    sizeInUsd: BigNumber;
    sizeInTokens: BigNumber;
    isLong: boolean;
  };
  sizeDeltaUsd: BigNumber;
}) {
  const { position, sizeDeltaUsd } = p;

  let sizeDeltaInTokens: BigNumber;

  if (position.sizeInUsd.eq(sizeDeltaUsd)) {
    sizeDeltaInTokens = position.sizeInTokens;
  } else {
    if (position.isLong) {
      // roudUpDivision
      sizeDeltaInTokens = sizeDeltaUsd.mul(position.sizeInTokens).div(position.sizeInUsd);
    } else {
      sizeDeltaInTokens = sizeDeltaUsd.mul(position.sizeInTokens).div(position.sizeInUsd);
    }
  }

  const pnlDelta = position.pnl.mul(sizeDeltaInTokens).div(position.sizeInTokens);

  return pnlDelta;
}

export function getShouldSwapPnlToCollateralToken(p: {
  market?: Market;
  collateralTokenAddress?: string;
  isLong?: boolean;
}) {
  if (p.isLong && p.market?.longTokenAddress !== p.collateralTokenAddress) return true;
  if (!p.isLong && p.market?.shortTokenAddress !== p.collateralTokenAddress) return true;

  return false;
}
