import {
  MarketsFeesConfigsData,
  getMarketFeesConfig,
  getPositionFee,
  getPriceImpactForPosition,
} from "domain/synthetics/fees";
import { Market, MarketsData, MarketsOpenInterestData, MarketsPoolsData } from "domain/synthetics/markets";
import { getAcceptablePrice } from "domain/synthetics/orders";
import { AggregatedPositionData, getLiquidationPrice, getMarkPrice } from "domain/synthetics/positions";
import { TokenData, TokensData, convertToTokenAmount, convertToUsd } from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import { BASIS_POINTS_DIVISOR } from "lib/legacy";
import { IncreasePositionAmounts, IncreasePositionTradeParams, NextPositionValues, SwapPathStats } from "../types";
import { getSwapAmounts } from "./swapTrade";
import { getDisplayedTradeFees } from "./common";
import { applySlippage } from "./prices";

export function getIncreasePositionTradeParams(p: {
  marketsData: MarketsData;
  poolsData: MarketsPoolsData;
  tokensData: TokensData;
  openInterestData: MarketsOpenInterestData;
  feesConfigs: MarketsFeesConfigsData;
  initialCollateralToken: TokenData;
  collateralToken: TokenData;
  market: Market;
  indexToken: TokenData;
  initialCollateralAmount?: BigNumber;
  indexTokenAmount?: BigNumber;
  isLong: boolean;
  leverage?: BigNumber;
  triggerPrice?: BigNumber;
  existingPosition?: AggregatedPositionData;
  showPnlInLeverage?: boolean;
  isLimit?: boolean;
  allowedSlippage?: number;
  acceptablePriceImpactBps?: BigNumber;
  findSwapPath: (usdIn: BigNumber, opts?: { disablePriceImpact?: boolean }) => SwapPathStats | undefined;
}): IncreasePositionTradeParams | undefined {
  const increasePositionAmounts = getIncreasePositionAmounts(p);

  if (!increasePositionAmounts) {
    return undefined;
  }

  const feesConfig = getMarketFeesConfig(p.feesConfigs, p.market.marketTokenAddress);

  const nextPositionValues = getNextPositionValuesForIncreaseTrade({
    existingPosition: p.existingPosition,
    sizeDeltaUsd: increasePositionAmounts.sizeDeltaUsd,
    collateralDeltaUsd: increasePositionAmounts.collateralUsd,
    showPnlInLeverage: p.showPnlInLeverage,
    leverage: p.leverage,
    entryMarkPrice: increasePositionAmounts.entryMarkPrice,
    positionFeeFactor: feesConfig?.positionFeeFactor,
    isLong: p.isLong,
  });

  const fees = getDisplayedTradeFees({
    feesConfig,
    initialCollateralUsd: increasePositionAmounts.initialCollateralUsd,
    swapSteps: increasePositionAmounts.swapPathStats?.swapSteps,
    swapPriceImpactDeltaUsd: !p.isLimit
      ? increasePositionAmounts.swapPathStats?.totalSwapPriceImpactDeltaUsd
      : undefined,
    positionFeeUsd: increasePositionAmounts.positionFeeUsd,
    // positionPriceImpactDeltaUsd: increasePositionAmounts.positionPriceImpactDeltaUsd,
  });

  return {
    ...increasePositionAmounts,
    market: p.market,
    initialCollateralToken: p.initialCollateralToken,
    collateralToken: p.collateralToken,
    isLong: p.isLong,
    nextPositionValues,
    fees,
  };
}

export function getNextPositionValuesForIncreaseTrade(p: {
  existingPosition?: AggregatedPositionData;
  sizeDeltaUsd: BigNumber;
  collateralDeltaUsd: BigNumber;
  showPnlInLeverage?: boolean;
  leverage?: BigNumber;
  entryMarkPrice?: BigNumber;
  positionFeeFactor?: BigNumber;
  isLong?: boolean;
}): NextPositionValues {
  const nextSizeUsd = p.existingPosition ? p.existingPosition?.sizeInUsd.add(p.sizeDeltaUsd) : p.sizeDeltaUsd;

  const nextCollateralUsd = p.existingPosition?.collateralUsd
    ? p.existingPosition?.collateralUsd.add(p.collateralDeltaUsd)
    : p.collateralDeltaUsd;

  const nextLiqPrice = getLiquidationPrice({
    sizeUsd: nextSizeUsd,
    collateralUsd: nextCollateralUsd,
    averagePrice: p.entryMarkPrice,
    positionFeeFactor: p.positionFeeFactor,
    pendingBorrowingFeesUsd: BigNumber.from(0), // deducted on order
    pendingFundingFeesUsd: BigNumber.from(0), // deducted on order
    pnl: p.existingPosition?.pnl,
    isLong: p.isLong,
  });

  const nextLeverage = p.leverage;

  return {
    nextSizeUsd,
    nextCollateralUsd,
    nextLeverage,
    nextLiqPrice,
  };
}

/**
 * Calculates amounts for increasing position (sizeDelta by initialCollateralAmount or initialCollateralAmount by indexTokenAmount)
 */
export function getIncreasePositionAmounts(p: {
  marketsData: MarketsData;
  poolsData: MarketsPoolsData;
  tokensData: TokensData;
  openInterestData: MarketsOpenInterestData;
  feesConfigs: MarketsFeesConfigsData;
  initialCollateralToken: TokenData;
  collateralToken: TokenData;
  market: Market;
  indexToken: TokenData;
  initialCollateralAmount?: BigNumber;
  indexTokenAmount?: BigNumber;
  isLong: boolean;
  leverage?: BigNumber;
  triggerPrice?: BigNumber;
  isLimit?: boolean;
  allowedSlippage?: number;
  acceptablePriceImpactBps?: BigNumber;
  findSwapPath: (usdIn: BigNumber, opts?: { disablePriceImpact?: boolean }) => SwapPathStats | undefined;
}): IncreasePositionAmounts | undefined {
  const markPrice = getMarkPrice(p.indexToken.prices, true, p.isLong)!;
  const triggerPrice = p.isLimit ? p.triggerPrice : undefined;
  const entryMarkPrice = triggerPrice || markPrice;

  if (!markPrice) return undefined;

  const defaultAmounts: IncreasePositionAmounts = {
    initialCollateralAmount: BigNumber.from(0),
    initialCollateralUsd: BigNumber.from(0),
    collateralAmount: BigNumber.from(0),
    collateralUsd: BigNumber.from(0),
    sizeDeltaUsd: BigNumber.from(0),
    sizeDeltaInTokens: BigNumber.from(0),
    sizeDeltaAfterFeesUsd: BigNumber.from(0),
    sizeDeltaAfterFeesInTokens: BigNumber.from(0),
    acceptablePrice: entryMarkPrice,
    acceptablePriceImpactBps: p.isLimit && p.acceptablePriceImpactBps ? p.acceptablePriceImpactBps : BigNumber.from(0),
    acceptablePriceAfterSlippage: entryMarkPrice,
    entryMarkPrice,
    triggerPrice,
  };

  if (!p.indexTokenAmount) {
    // calculate indexTokenAmount by initialCollateralAmount
    const swapAmounts = getSwapAmounts({
      marketsData: p.marketsData,
      poolsData: p.poolsData,
      tokensData: p.tokensData,
      feesConfigs: p.feesConfigs,
      tokenIn: p.initialCollateralToken,
      tokenOut: p.collateralToken,
      tokenInAmount: p.initialCollateralAmount,
      findSwapPath: p.findSwapPath,
      isLimit: p.isLimit,
    });

    if (!swapAmounts?.amountOut.gt(0)) {
      return defaultAmounts;
    }

    const initialCollateralAmount = swapAmounts.amountIn;
    const initialCollateralUsd = swapAmounts.usdIn;
    const collateralUsd = swapAmounts.usdOut;
    const collateralAmount = swapAmounts.amountOut;

    let sizeDeltaUsd = collateralUsd;

    if (p.leverage) {
      sizeDeltaUsd = sizeDeltaUsd.mul(p.leverage).div(BASIS_POINTS_DIVISOR);
    }

    const positionFeeUsd =
      getPositionFee(p.feesConfigs, p.market.marketTokenAddress, sizeDeltaUsd) || BigNumber.from(0);

    const positionPriceImpactDeltaUsd =
      getPriceImpactForPosition(
        p.openInterestData,
        p.feesConfigs,
        p.market.marketTokenAddress,
        sizeDeltaUsd,
        p.isLong
      ) || BigNumber.from(0);

    const sizeDeltaAfterFeesUsd = sizeDeltaUsd.sub(positionFeeUsd);

    const {
      acceptablePrice = entryMarkPrice,
      acceptablePriceImpactBps = p.acceptablePriceImpactBps || BigNumber.from(0),
    } =
      getAcceptablePrice({
        isIncrease: true,
        isLong: p.isLong,
        indexPrice: entryMarkPrice,
        sizeDeltaUsd: sizeDeltaAfterFeesUsd,
        priceImpactDeltaUsd: !p.isLimit ? positionPriceImpactDeltaUsd : undefined,
        acceptablePriceImpactBps: p.isLimit ? p.acceptablePriceImpactBps : undefined,
      }) || {};

    const acceptablePriceAfterSlippage = applySlippage(p.allowedSlippage || 0, acceptablePrice, true, p.isLong);

    const sizeDeltaInTokens =
      convertToTokenAmount(sizeDeltaAfterFeesUsd, p.indexToken.decimals, acceptablePrice) || BigNumber.from(0);
    const sizeDeltaAfterFeesInTokens =
      convertToTokenAmount(sizeDeltaAfterFeesUsd, p.indexToken.decimals, acceptablePrice) || BigNumber.from(0);

    return {
      initialCollateralAmount,
      initialCollateralUsd,
      collateralAmount,
      collateralUsd,
      sizeDeltaUsd,
      sizeDeltaInTokens,
      sizeDeltaAfterFeesUsd,
      sizeDeltaAfterFeesInTokens,
      positionFeeUsd,
      positionPriceImpactDeltaUsd,
      acceptablePrice,
      acceptablePriceImpactBps,
      acceptablePriceAfterSlippage,
      entryMarkPrice,
      triggerPrice,
      swapPathStats: swapAmounts.swapPathStats,
    };
  } else {
    // calculate initialCollateralAmount by indexTokenAmount
    if (!p.indexTokenAmount.gt(0)) {
      return defaultAmounts;
    }

    const sizeDeltaAfterFeesInTokens = p.indexTokenAmount;
    const sizeDeltaAfterFeesUsd =
      convertToUsd(sizeDeltaAfterFeesInTokens, p.indexToken.decimals, entryMarkPrice) || BigNumber.from(0);

    const positionFeeUsd =
      getPositionFee(p.feesConfigs, p.market.marketTokenAddress, sizeDeltaAfterFeesUsd) || BigNumber.from(0);

    let sizeDeltaUsd = sizeDeltaAfterFeesUsd.add(positionFeeUsd);

    const positionPriceImpactDeltaUsd =
      getPriceImpactForPosition(
        p.openInterestData,
        p.feesConfigs,
        p.market.marketTokenAddress,
        sizeDeltaUsd,
        p.isLong
      ) || BigNumber.from(0);

    const {
      acceptablePrice = entryMarkPrice,
      acceptablePriceImpactBps = p.acceptablePriceImpactBps || BigNumber.from(0),
    } =
      getAcceptablePrice({
        isIncrease: true,
        isLong: p.isLong,
        indexPrice: entryMarkPrice,
        sizeDeltaUsd,
        priceImpactDeltaUsd: !p.isLimit ? positionPriceImpactDeltaUsd : undefined,
        acceptablePriceImpactBps: p.isLimit ? p.acceptablePriceImpactBps : undefined,
      }) || {};

    const acceptablePriceAfterSlippage = applySlippage(p.allowedSlippage || 0, acceptablePrice, true, p.isLong);

    sizeDeltaUsd = sizeDeltaUsd.add(positionPriceImpactDeltaUsd);
    const sizeDeltaInTokens =
      convertToTokenAmount(sizeDeltaUsd, p.indexToken.decimals, acceptablePrice) || BigNumber.from(0);

    let collateralUsd = sizeDeltaUsd;

    if (p.leverage) {
      collateralUsd = collateralUsd.mul(BASIS_POINTS_DIVISOR).div(p.leverage);
    }

    const collateralAmount =
      convertToTokenAmount(collateralUsd, p.collateralToken.decimals, p.collateralToken.prices?.maxPrice) ||
      BigNumber.from(0);

    const swapAmounts = getSwapAmounts({
      marketsData: p.marketsData,
      poolsData: p.poolsData,
      tokensData: p.tokensData,
      feesConfigs: p.feesConfigs,
      tokenIn: p.initialCollateralToken,
      tokenOut: p.collateralToken,
      tokenOutAmount: collateralAmount,
      findSwapPath: p.findSwapPath,
      isLimit: p.isLimit,
    });

    const initialCollateralAmount = swapAmounts?.amountIn || BigNumber.from(0);
    const initialCollateralUsd = swapAmounts?.usdIn || BigNumber.from(0);

    return {
      initialCollateralAmount,
      initialCollateralUsd,
      collateralAmount,
      collateralUsd,
      sizeDeltaUsd,
      sizeDeltaInTokens,
      sizeDeltaAfterFeesUsd,
      sizeDeltaAfterFeesInTokens,
      positionFeeUsd,
      positionPriceImpactDeltaUsd,
      acceptablePrice,
      acceptablePriceImpactBps,
      acceptablePriceAfterSlippage,
      entryMarkPrice,
      triggerPrice,
      swapPathStats: swapAmounts?.swapPathStats,
    };
  }
}
