import {
  MarketFeesConfig,
  MarketsFeesConfigsData,
  getMarketFeesConfig,
  getPositionFee,
  getPriceImpactForPosition,
} from "domain/synthetics/fees";
import { Market, MarketsData, MarketsOpenInterestData, MarketsPoolsData } from "domain/synthetics/markets";
import { getAcceptablePrice } from "domain/synthetics/orders";
import { AggregatedPositionData, getLeverage, getLiquidationPrice } from "domain/synthetics/positions";
import { TokenData, TokensData, convertToTokenAmount, getTokenData } from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import { DUST_USD } from "lib/legacy";
import { DecreasePositionAmounts, DecreasePositionTradeParams, NextPositionValues } from "../types";
import { getDisplayedTradeFees } from "./common";
import { applySlippage, getMarkPrice, getTriggerPricePrefix } from "./prices";

export function getDecreasePositionTradeParams(p: {
  marketsData: MarketsData;
  poolsData: MarketsPoolsData;
  tokensData: TokensData;
  openInterestData: MarketsOpenInterestData;
  feesConfigs: MarketsFeesConfigsData;
  market: Market;
  collateralToken: TokenData;
  receiveToken: TokenData;
  existingPosition?: AggregatedPositionData;
  sizeDeltaUsd?: BigNumber;
  triggerPrice?: BigNumber;
  keepLeverage?: boolean;
  showPnlInLeverage?: boolean;
  allowedSlippage?: number;
  isTrigger?: boolean;
  acceptablePriceImpactBps?: BigNumber;
  isLong?: boolean;
  maxLeverage?: BigNumber;
}): DecreasePositionTradeParams | undefined {
  const decreasePositionAmounts = getDecreasePositionAmounts(p);

  if (!decreasePositionAmounts) {
    return undefined;
  }

  const feesConfig = getMarketFeesConfig(p.feesConfigs, p.market.marketTokenAddress);

  const nextPositionValues = getNextPositionValuesForDecreaseTrade({
    feesConfig,
    existingPosition: p.existingPosition,
    sizeDeltaUsd: decreasePositionAmounts?.sizeDeltaUsd,
    pnlDelta: decreasePositionAmounts?.pnlDelta,
    collateralDeltaUsd: decreasePositionAmounts?.collateralDeltaUsd,
    exitMarkPrice: decreasePositionAmounts?.exitMarkPrice,
    showPnlInLeverage: p.showPnlInLeverage,
    isLong: p.isLong,
    maxLeverage: p.maxLeverage,
  });

  const fees = getDisplayedTradeFees({
    feesConfig,
    sizeDeltaUsd: decreasePositionAmounts.sizeDeltaUsd,
    positionFeeUsd: decreasePositionAmounts.positionFeeUsd,
    positionPriceImpactDeltaUsd: !p.isTrigger ? decreasePositionAmounts.positionPriceImpactDeltaUsd : undefined,
  });

  return {
    ...decreasePositionAmounts,
    market: p.market,
    collateralToken: p.collateralToken,
    receiveToken: p.receiveToken,
    nextPositionValues,
    fees,
  };
}

export function getDecreasePositionAmounts(p: {
  marketsData: MarketsData;
  poolsData: MarketsPoolsData;
  tokensData: TokensData;
  openInterestData: MarketsOpenInterestData;
  feesConfigs: MarketsFeesConfigsData;
  market?: Market;
  collateralToken?: TokenData;
  receiveToken?: TokenData;
  existingPosition?: AggregatedPositionData;
  sizeDeltaUsd?: BigNumber;
  triggerPrice?: BigNumber;
  keepLeverage?: boolean;
  showPnlInLeverage?: boolean;
  allowedSlippage?: number;
  isTrigger?: boolean;
  acceptablePriceImpactBps?: BigNumber;
  isLong?: boolean;
}): DecreasePositionAmounts | undefined {
  const indexToken = getTokenData(p.tokensData, p.market?.indexTokenAddress);
  const markPrice = getMarkPrice(indexToken?.prices, false, p.isLong);
  const exitMarkPrice = p.isTrigger && p.triggerPrice ? p.triggerPrice : markPrice;

  const triggerPricePrefix = p.isTrigger
    ? getTriggerPricePrefix({
        isLong: p.isLong,
        isIncrease: false,
        markPrice,
        triggerPrice: p.triggerPrice,
      })
    : undefined;

  if (
    !p.sizeDeltaUsd ||
    !exitMarkPrice ||
    !indexToken ||
    !p.collateralToken?.prices ||
    !p.receiveToken?.prices ||
    !p.sizeDeltaUsd?.gt(0) ||
    typeof p.isLong === "undefined"
  ) {
    return undefined;
  }

  let sizeDeltaUsd = p.sizeDeltaUsd;

  const isClosing = p.existingPosition ? p.existingPosition.sizeInUsd.sub(sizeDeltaUsd).lt(DUST_USD) : false;
  if (isClosing && p.existingPosition) {
    sizeDeltaUsd = p.existingPosition?.sizeInUsd;
  }

  const sizeDeltaInTokens = convertToTokenAmount(sizeDeltaUsd, indexToken.decimals, exitMarkPrice)!;

  const positionFeeUsd = getPositionFee(p.feesConfigs, p.market?.marketTokenAddress, sizeDeltaUsd);
  const positionPriceImpactDeltaUsd = getPriceImpactForPosition(
    p.openInterestData,
    p.feesConfigs,
    p.market?.marketTokenAddress,
    p.sizeDeltaUsd,
    p.isLong
  );

  const {
    acceptablePrice = exitMarkPrice,
    acceptablePriceImpactBps = p.acceptablePriceImpactBps || BigNumber.from(0),
  } = getAcceptablePrice({
    isIncrease: false,
    isLong: p.isLong,
    indexPrice: exitMarkPrice,
    sizeDeltaUsd,
    priceImpactDeltaUsd: !p.isTrigger ? positionPriceImpactDeltaUsd : undefined,
    acceptablePriceImpactBps: p.isTrigger ? p.acceptablePriceImpactBps : undefined,
  })!;

  const acceptablePriceAfterSlippage = p.allowedSlippage
    ? applySlippage(p.allowedSlippage, acceptablePrice, false, p.isLong)
    : acceptablePrice;

  let collateralDeltaUsd: BigNumber | undefined = undefined;
  let collateralDeltaAmount: BigNumber | undefined = undefined;
  let receiveUsd: BigNumber | undefined = undefined;
  let receiveTokenAmount: BigNumber | undefined = undefined;
  let pnlDelta: BigNumber | undefined = undefined;

  if (p.existingPosition) {
    const { pendingBorrowingFees, pendingFundingFeesUsd } = p.existingPosition || {};

    collateralDeltaUsd = BigNumber.from(0);

    if (p.existingPosition?.sizeInUsd?.gt(0) && p.existingPosition?.collateralUsd?.gt(0)) {
      if (isClosing) {
        collateralDeltaUsd = p.existingPosition.collateralUsd;
      } else if (p.keepLeverage) {
        collateralDeltaUsd = sizeDeltaUsd.mul(p.existingPosition.collateralUsd).div(p.existingPosition.sizeInUsd);
      }
    }

    collateralDeltaAmount = convertToTokenAmount(
      collateralDeltaUsd,
      p.collateralToken.decimals,
      p.collateralToken.prices!.maxPrice
    )!;

    pnlDelta =
      getPnlDeltaForDecreaseOrder({ position: p.existingPosition, sizeDeltaUsd, isClosing }) || BigNumber.from(0);

    receiveUsd = collateralDeltaUsd;

    if (pnlDelta) {
      receiveUsd = receiveUsd.add(pnlDelta);
    }

    if (!p.isTrigger && positionPriceImpactDeltaUsd) {
      receiveUsd = receiveUsd.add(positionPriceImpactDeltaUsd);
    }

    if (positionFeeUsd) {
      receiveUsd = receiveUsd.sub(positionFeeUsd);
    }

    if (pendingBorrowingFees) {
      receiveUsd = receiveUsd.sub(pendingBorrowingFees);
    }

    if (pendingFundingFeesUsd) {
      receiveUsd = receiveUsd.sub(pendingFundingFeesUsd);
    }

    if (receiveUsd.lt(0)) {
      receiveUsd = BigNumber.from(0);
    }

    receiveTokenAmount = convertToTokenAmount(receiveUsd, p.receiveToken.decimals, p.receiveToken.prices!.minPrice)!;
  }

  return {
    sizeDeltaUsd,
    sizeDeltaInTokens,
    collateralDeltaUsd,
    collateralDeltaAmount,
    pnlDelta,
    receiveUsd,
    receiveTokenAmount,
    isClosing,
    exitMarkPrice,
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
  feesConfig?: MarketFeesConfig;
  existingPosition?: AggregatedPositionData;
  sizeDeltaUsd?: BigNumber;
  pnlDelta?: BigNumber;
  collateralDeltaUsd?: BigNumber;
  exitMarkPrice?: BigNumber;
  showPnlInLeverage?: boolean;
  isLong?: boolean;
  maxLeverage?: BigNumber;
}): NextPositionValues | undefined {
  const nextSizeUsd = p.existingPosition?.sizeInUsd.sub(p.sizeDeltaUsd || BigNumber.from(0));

  const nextCollateralUsd = p.existingPosition?.collateralUsd?.sub(p.collateralDeltaUsd || BigNumber.from(0));

  const nextPnl = p.existingPosition?.pnl?.sub(p.pnlDelta || BigNumber.from(0));

  const nextLeverage = getLeverage({
    sizeUsd: nextSizeUsd,
    collateralUsd: nextCollateralUsd,
    pnl: p.showPnlInLeverage ? nextPnl : undefined,
    pendingBorrowingFeesUsd: p.existingPosition?.pendingBorrowingFees, // deducted on order
    pendingFundingFeesUsd: p.existingPosition?.pendingFundingFeesUsd, // deducted on order
  });

  const nextLiqPrice = getLiquidationPrice({
    sizeUsd: nextSizeUsd,
    collateralUsd: nextCollateralUsd,
    indexPrice: p.exitMarkPrice,
    positionFeeFactor: p.feesConfig?.positionFeeFactor,
    maxPriceImpactFactor: p.feesConfig?.maxPositionImpactFactorForLiquidations,
    pendingBorrowingFeesUsd: p.existingPosition?.pendingBorrowingFees, // deducted on order
    pendingFundingFeesUsd: p.existingPosition?.pendingFundingFeesUsd, // deducted on order
    pnl: nextPnl,
    isLong: p.isLong,
    maxLeverage: p.maxLeverage,
  });

  return {
    nextSizeUsd,
    nextCollateralUsd,
    nextLiqPrice,
    nextPnl,
    nextLeverage,
  };
}

export function getPnlDeltaForDecreaseOrder(p: {
  position?: {
    pnl?: BigNumber;
    sizeInUsd: BigNumber;
    sizeInTokens: BigNumber;
    isLong: boolean;
  };
  isClosing?: boolean;
  sizeDeltaUsd?: BigNumber;
}) {
  if (!p.position?.pnl || !p.sizeDeltaUsd?.gt(0)) return undefined;

  let sizeDeltaInTokens: BigNumber;

  if (p.position.sizeInUsd.eq(p.sizeDeltaUsd) || p.isClosing) {
    sizeDeltaInTokens = p.position.sizeInTokens;
  } else {
    if (p.position.isLong) {
      // roudUpDivision
      sizeDeltaInTokens = p.sizeDeltaUsd.mul(p.position.sizeInTokens).div(p.position.sizeInUsd);
    } else {
      sizeDeltaInTokens = p.sizeDeltaUsd.mul(p.position.sizeInTokens).div(p.position.sizeInUsd);
    }
  }

  const pnlDelta = p.position.pnl.mul(sizeDeltaInTokens).div(p.position.sizeInTokens);

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
