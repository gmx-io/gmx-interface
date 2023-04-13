import { getPositionFee, getPriceImpactForPosition } from "domain/synthetics/fees";
import { MarketInfo } from "domain/synthetics/markets";
import { PositionInfo } from "domain/synthetics/positions";
import { TokenData, convertToTokenAmount, convertToUsd } from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import { BASIS_POINTS_DIVISOR } from "lib/legacy";
import { FindSwapPath, IncreasePositionAmounts, NextPositionValues, SwapPathStats } from "../types";
import { applySlippage, getAcceptablePrice, getMarkPrice } from "./prices";
import { getSwapAmountsByFromValue, getSwapAmountsByToValue } from "./swapTrade";

// export function getIncreasePositionTradeParams(p: {
//   marketInfo: MarketInfo;
//   initialCollateralToken: TokenData;
//   collateralToken: TokenData;
//   indexToken: TokenData;
//   initialCollateralAmount?: BigNumber;
//   indexTokenAmount?: BigNumber;
//   isLong: boolean;
//   leverage?: BigNumber;
//   triggerPrice?: BigNumber;
//   existingPosition?: PositionInfo;
//   showPnlInLeverage?: boolean;
//   isLimit?: boolean;
//   allowedSlippage?: number;
//   acceptablePriceImpactBps?: BigNumber;
//   maxLeverage?: BigNumber;
//   findSwapPath: FindSwapPath;
// }): IncreasePositionTradeParams | undefined {
//   const increasePositionAmounts = getIncreasePositionAmounts(p);

//   if (!increasePositionAmounts) {
//     return undefined;
//   }

//   const nextPositionValues = getNextPositionValuesForIncreaseTrade({
//     marketInfo: p.marketInfo,
//     existingPosition: p.existingPosition,
//     sizeDeltaUsd: increasePositionAmounts.sizeDeltaUsd,
//     collateralDeltaUsd: increasePositionAmounts.collateralUsd,
//     showPnlInLeverage: p.showPnlInLeverage,
//     leverage: p.leverage,
//     entryMarkPrice: increasePositionAmounts.entryPrice,
//     isLong: p.isLong,
//     maxLeverage: p.maxLeverage,
//   });

//   const fees = getDisplayedTradeFees({
//     marketInfo: p.marketInfo,
//     initialCollateralUsd: increasePositionAmounts.initialCollateralUsd,
//     sizeDeltaUsd: increasePositionAmounts.sizeDeltaUsd,
//     swapSteps: increasePositionAmounts.swapPathStats?.swapSteps,
//     positionFeeUsd: increasePositionAmounts.positionFeeUsd,
//     swapPriceImpactDeltaUsd: !p.isLimit
//       ? increasePositionAmounts.swapPathStats?.totalSwapPriceImpactDeltaUsd
//       : undefined,
//     positionPriceImpactDeltaUsd: !p.isLimit ? increasePositionAmounts.positionPriceImpactDeltaUsd : undefined,
//   });

//   return {
//     ...increasePositionAmounts,
//     marketInfo: p.marketInfo,
//     initialCollateralToken: p.initialCollateralToken,
//     collateralToken: p.collateralToken,
//     isLong: p.isLong,
//     nextPositionValues,
//     fees,
//   };
// }

export function getIncreasePositionAmountsByCollateral(p: {
  marketInfo: MarketInfo;
  initialCollateralToken: TokenData;
  collateralToken: TokenData;
  isLong: boolean;
  initialCollateralAmount: BigNumber;
  leverage?: BigNumber;
  isLimit?: boolean;
  triggerPrice?: BigNumber;
  savedAcceptablePriceImpactBps?: BigNumber;
  allowedSlippage?: number;
  findSwapPath: FindSwapPath;
}) {
  const {
    marketInfo,
    initialCollateralToken,
    collateralToken,
    initialCollateralAmount,
    isLong,
    leverage,
    triggerPrice,
    isLimit,
    savedAcceptablePriceImpactBps,
    allowedSlippage,
    findSwapPath,
  } = p;
  const { indexToken } = marketInfo;

  const markPrice = getMarkPrice({ prices: indexToken.prices, isIncrease: true, isLong })!;
  const entryPrice = isLimit && triggerPrice ? triggerPrice : markPrice;

  const initialCollateralPrice = initialCollateralToken.prices.minPrice;
  const collateralPrice = collateralToken.prices.maxPrice;

  const initialCollateralUsd = convertToUsd(
    initialCollateralAmount,
    initialCollateralToken.decimals,
    initialCollateralPrice
  )!;

  let collateralUsdAfterFees = BigNumber.from(0);
  let collateralAmountAfterFees = BigNumber.from(0);

  let sizeDeltaUsd = BigNumber.from(0);
  let sizeDeltaInTokens = BigNumber.from(0);

  let positionFeeUsd = BigNumber.from(0);
  let positionPriceImpactDeltaUsd = BigNumber.from(0);

  let acceptablePrice: BigNumber | undefined = undefined;
  let acceptablePriceImpactBps: BigNumber | undefined = undefined;
  let acceptablePriceAfterSlippage: BigNumber | undefined = undefined;

  const defaultAmounts: IncreasePositionAmounts = {
    initialCollateralAmount,
    initialCollateralUsd,
    collateralUsdAfterFees,
    collateralAmountAfterFees,
    sizeDeltaUsd,
    sizeDeltaInTokens,
    positionFeeUsd,
    positionPriceImpactDeltaUsd,
    swapPathStats: undefined,
    entryPrice,
    initialCollateralPrice,
    collateralPrice,
    acceptablePrice,
    acceptablePriceImpactBps,
    acceptablePriceAfterSlippage,
  };

  if (initialCollateralAmount.lte(0)) {
    return defaultAmounts;
  }

  const swapAmounts = getSwapAmountsByFromValue({
    tokenIn: initialCollateralToken,
    tokenOut: collateralToken,
    amountIn: initialCollateralAmount,
    isLimit: false,
    findSwapPath,
  });

  if (!swapAmounts) {
    return defaultAmounts;
  }

  collateralAmountAfterFees = swapAmounts.amountOut;
  collateralUsdAfterFees = swapAmounts.usdOut;

  sizeDeltaUsd = collateralUsdAfterFees;

  if (leverage) {
    sizeDeltaUsd = sizeDeltaUsd.mul(leverage).div(BASIS_POINTS_DIVISOR);
  }

  positionFeeUsd = getPositionFee(marketInfo, sizeDeltaUsd) || BigNumber.from(0);
  positionPriceImpactDeltaUsd = getPriceImpactForPosition(p.marketInfo, sizeDeltaUsd, p.isLong) || BigNumber.from(0);

  // TODO error in leverage calcs (low prior?)
  collateralUsdAfterFees = collateralUsdAfterFees.sub(positionFeeUsd);

  const acceptablePriceInfo = getAcceptablePrice({
    isIncrease: true,
    isLong,
    indexPrice: entryPrice,
    sizeDeltaUsd: sizeDeltaUsd,
    priceImpactDeltaUsd: !isLimit ? positionPriceImpactDeltaUsd : undefined,
    // TODO separate to 2 functions?
    acceptablePriceImpactBps: isLimit ? savedAcceptablePriceImpactBps : undefined,
  });

  acceptablePrice = acceptablePriceInfo?.acceptablePrice;
  acceptablePriceImpactBps = acceptablePriceInfo?.acceptablePriceImpactBps;

  acceptablePriceAfterSlippage = applySlippage(allowedSlippage || 0, acceptablePrice, true, p.isLong);

  sizeDeltaInTokens = convertToTokenAmount(sizeDeltaUsd, indexToken.decimals, acceptablePrice) || BigNumber.from(0);

  return {
    initialCollateralAmount,
    initialCollateralUsd,
    collateralUsdAfterFees,
    collateralAmountAfterFees,
    sizeDeltaUsd,
    sizeDeltaInTokens,
    positionFeeUsd,
    positionPriceImpactDeltaUsd,
    swapPathStats: swapAmounts.swapPathStats,
    entryPrice,
    initialCollateralPrice,
    collateralPrice,
    acceptablePrice,
    acceptablePriceImpactBps,
    acceptablePriceAfterSlippage,
  };
}

export function getIncreasePositionAmountsBySizeDelta(p: {
  marketInfo: MarketInfo;
  initialCollateralToken: TokenData;
  collateralToken: TokenData;
  isLong: boolean;
  sizeDeltaInTokens: BigNumber;
  leverage?: BigNumber;
  isLimit?: boolean;
  triggerPrice?: BigNumber;
  savedAcceptablePriceImpactBps?: BigNumber;
  allowedSlippage: number;
  findSwapPath: FindSwapPath;
}): IncreasePositionAmounts {
  const {
    marketInfo,
    initialCollateralToken,
    collateralToken,
    sizeDeltaInTokens,
    isLong,
    leverage,
    triggerPrice,
    isLimit,
    savedAcceptablePriceImpactBps,
    allowedSlippage,
    findSwapPath,
  } = p;
  const { indexToken } = marketInfo;

  const markPrice = getMarkPrice({ prices: indexToken.prices, isIncrease: true, isLong })!;
  const entryPrice = isLimit && triggerPrice ? triggerPrice : markPrice;

  const initialCollateralPrice = initialCollateralToken.prices.minPrice;
  const collateralPrice = collateralToken.prices.maxPrice;

  const sizeDeltaUsd = convertToUsd(sizeDeltaInTokens, indexToken.decimals, entryPrice)!;

  let positionFeeUsd = getPositionFee(marketInfo, sizeDeltaUsd)!;
  let positionPriceImpactDeltaUsd = getPriceImpactForPosition(marketInfo, sizeDeltaUsd, isLong);

  const { acceptablePrice, acceptablePriceImpactBps } = getAcceptablePrice({
    isIncrease: true,
    isLong,
    indexPrice: entryPrice,
    sizeDeltaUsd: sizeDeltaUsd,
    priceImpactDeltaUsd: !isLimit ? positionPriceImpactDeltaUsd : undefined,
    // TODO separate to 2 functions?
    acceptablePriceImpactBps: isLimit ? savedAcceptablePriceImpactBps : undefined,
  });

  const acceptablePriceAfterSlippage = applySlippage(allowedSlippage, acceptablePrice, true, isLong);

  let initialCollateralAmount = BigNumber.from(0);
  let initialCollateralUsd = BigNumber.from(0);

  let collateralUsdAfterFees = BigNumber.from(0);
  let collateralAmountAfterFees = BigNumber.from(0);

  let swapPathStats: SwapPathStats | undefined = undefined;

  const defaultAmounts: IncreasePositionAmounts = {
    initialCollateralAmount,
    initialCollateralUsd,
    collateralUsdAfterFees,
    collateralAmountAfterFees,
    sizeDeltaUsd,
    sizeDeltaInTokens,
    positionFeeUsd,
    positionPriceImpactDeltaUsd,
    swapPathStats: undefined,
    entryPrice,
    initialCollateralPrice,
    collateralPrice,
    acceptablePrice,
    acceptablePriceImpactBps,
    acceptablePriceAfterSlippage,
  };

  if (sizeDeltaInTokens.lte(0)) {
    return defaultAmounts;
  }

  collateralUsdAfterFees = sizeDeltaUsd;

  if (leverage) {
    collateralUsdAfterFees = collateralUsdAfterFees.mul(BASIS_POINTS_DIVISOR).div(leverage);
  }

  collateralAmountAfterFees = convertToTokenAmount(collateralUsdAfterFees, collateralToken.decimals, collateralPrice)!;

  const collateralUsd = collateralUsdAfterFees.add(positionFeeUsd);
  const collateralAmount = convertToTokenAmount(collateralUsd, collateralToken.decimals, collateralPrice)!;

  const swapAmounts = getSwapAmountsByToValue({
    tokenIn: initialCollateralToken,
    tokenOut: collateralToken,
    amountOut: collateralAmount,
    findSwapPath,
    isLimit: false,
  });

  initialCollateralAmount = swapAmounts.amountIn;
  initialCollateralUsd = swapAmounts.usdIn;
  swapPathStats = swapAmounts.swapPathStats;

  return {
    initialCollateralAmount,
    initialCollateralUsd,
    collateralUsdAfterFees,
    collateralAmountAfterFees,
    sizeDeltaUsd,
    sizeDeltaInTokens,
    positionFeeUsd,
    positionPriceImpactDeltaUsd,
    swapPathStats,
    entryPrice,
    initialCollateralPrice,
    collateralPrice,
    acceptablePrice,
    acceptablePriceImpactBps,
    acceptablePriceAfterSlippage,
  };
}

export function getNextPositionValuesForIncreaseTrade(p: {
  marketInfo: MarketInfo;
  existingPosition?: PositionInfo;
  sizeDeltaUsd: BigNumber;
  collateralDeltaUsd: BigNumber;
  showPnlInLeverage?: boolean;
  leverage?: BigNumber;
  entryMarkPrice?: BigNumber;
  isLong?: boolean;
  maxLeverage?: BigNumber;
}): NextPositionValues {
  const nextSizeUsd = p.existingPosition ? p.existingPosition?.sizeInUsd.add(p.sizeDeltaUsd) : p.sizeDeltaUsd;

  const nextCollateralUsd = p.existingPosition?.initialCollateralUsd
    ? p.existingPosition?.initialCollateralUsd.add(p.collateralDeltaUsd)
    : p.collateralDeltaUsd;

  // const nextLeverage = getLeverage({
  //   sizeInUsd: nextSizeUsd,
  //   collateralUsd: nextCollateralUsd,
  //   pnl: p.showPnlInLeverage ? p.existingPosition?.pnl : undefined,
  //   pendingBorrowingFeesUsd: p.existingPosition?.pendingBorrowingFeesUsd, // deducted on order
  //   pendingFundingFeesUsd: p.existingPosition?.pendingFundingFeesUsd, // deducted on order
  // });

  // const nextLiqPrice = getLiquidationPrice({
  //   sizeUsd: nextSizeUsd,
  //   collateralUsd: nextCollateralUsd,
  //   indexPrice: p.entryMarkPrice,
  //   positionFeeFactor: p.marketInfo.positionFeeFactor,
  //   maxPriceImpactFactor: p.marketInfo?.maxPositionImpactFactorForLiquidations,
  //   pendingBorrowingFeesUsd: p.existingPosition?.pendingBorrowingFeesUsd, // deducted on order
  //   pendingFundingFeesUsd: p.existingPosition?.pendingFundingFeesUsd, // deducted on order
  //   pnl: p.existingPosition?.pnl,
  //   isLong: p.isLong,
  //   maxLeverage: p.maxLeverage,
  // });

  return {
    nextSizeUsd,
    nextCollateralUsd,
    nextLeverage: undefined,
    nextLiqPrice: undefined,
    nextEntryPrice: p.entryMarkPrice,
  };
}
