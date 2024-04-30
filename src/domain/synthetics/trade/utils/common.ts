import { SwapFeeItem, getFeeItem, getTotalFeeItem, getTotalSwapVolumeFromSwapStats } from "domain/synthetics/fees";
import { BigNumber } from "ethers";
import { applyFactor, getBasisPoints } from "lib/numbers";
import { SwapStats, TradeFees, TradeMode, TradeType } from "../types";
import { OrderInfo, isLimitOrderType, isMarketOrderType, isSwapOrderType } from "domain/synthetics/orders";

export function getTradeFlags(tradeType: TradeType, tradeMode: TradeMode) {
  const isLong = tradeType === TradeType.Long;
  const isShort = tradeType === TradeType.Short;
  const isSwap = tradeType === TradeType.Swap;
  const isPosition = isLong || isShort;
  const isMarket = tradeMode === TradeMode.Market;
  const isLimit = tradeMode === TradeMode.Limit;
  const isTrigger = tradeMode === TradeMode.Trigger;
  const isIncrease = isPosition && (isMarket || isLimit);

  return {
    isLong,
    isShort,
    isSwap,
    isPosition,
    isIncrease,
    isTrigger,
    isMarket,
    isLimit,
  };
}

export function getTradeFlagsForOrder(order: OrderInfo) {
  let tradeType: TradeType;
  let tradeMode: TradeMode;

  if (isMarketOrderType(order.orderType)) {
    tradeMode = TradeMode.Market;
  } else if (isLimitOrderType(order.orderType)) {
    tradeMode = TradeMode.Limit;
  } else {
    tradeMode = TradeMode.Trigger;
  }

  if (isSwapOrderType(order.orderType)) {
    tradeType = TradeType.Swap;
  } else if (order.isLong) {
    tradeType = TradeType.Long;
  } else {
    tradeType = TradeType.Short;
  }

  return getTradeFlags(tradeType, tradeMode);
}

export function getTradeFees(p: {
  isIncrease: boolean;
  initialCollateralUsd: BigNumber;
  sizeDeltaUsd: BigNumber;
  swapSteps: SwapStats[];
  positionFeeUsd: BigNumber;
  swapPriceImpactDeltaUsd: BigNumber;
  positionPriceImpactDeltaUsd: BigNumber;
  priceImpactDiffUsd: BigNumber;
  borrowingFeeUsd: BigNumber;
  fundingFeeUsd: BigNumber;
  feeDiscountUsd: BigNumber;
  swapProfitFeeUsd: BigNumber;
  uiFeeFactor: BigNumber;
}): TradeFees {
  const {
    isIncrease,
    initialCollateralUsd,
    sizeDeltaUsd,
    swapSteps,
    positionFeeUsd,
    swapPriceImpactDeltaUsd,
    positionPriceImpactDeltaUsd,
    priceImpactDiffUsd,
    borrowingFeeUsd,
    fundingFeeUsd,
    feeDiscountUsd,
    swapProfitFeeUsd,
    uiFeeFactor,
  } = p;

  const swapFees: SwapFeeItem[] | undefined = initialCollateralUsd.gt(0)
    ? swapSteps.map((step) => ({
        tokenInAddress: step.tokenInAddress,
        tokenOutAddress: step.tokenOutAddress,
        marketAddress: step.marketAddress,
        deltaUsd: step.swapFeeUsd.mul(-1),
        bps: !step.usdIn.eq(0) ? getBasisPoints(step.swapFeeUsd.mul(-1), step.usdIn) : BigInt(0),
      }))
    : undefined;

  const totalSwapVolumeUsd = getTotalSwapVolumeFromSwapStats(swapSteps);
  const uiFeeUsd = applyFactor(sizeDeltaUsd, uiFeeFactor);
  const uiSwapFeeUsd = applyFactor(totalSwapVolumeUsd, uiFeeFactor);

  const uiSwapFee = getFeeItem(uiSwapFeeUsd.mul(-1), totalSwapVolumeUsd, {
    shouldRoundUp: true,
  });
  const uiFee = getFeeItem(uiFeeUsd.mul(-1), sizeDeltaUsd, { shouldRoundUp: true });

  const swapProfitFee = getFeeItem(swapProfitFeeUsd.mul(-1), initialCollateralUsd);

  const swapPriceImpact = getFeeItem(swapPriceImpactDeltaUsd, initialCollateralUsd);

  const positionFeeBeforeDiscount = getFeeItem(positionFeeUsd.add(feeDiscountUsd).mul(-1), sizeDeltaUsd);
  const positionFeeAfterDiscount = getFeeItem(positionFeeUsd.mul(-1), sizeDeltaUsd);

  const borrowFee = getFeeItem(borrowingFeeUsd.mul(-1), initialCollateralUsd);

  const fundingFee = getFeeItem(fundingFeeUsd.mul(-1), initialCollateralUsd);
  const positionPriceImpact = getFeeItem(positionPriceImpactDeltaUsd, sizeDeltaUsd);

  const totalFees = getTotalFeeItem([
    ...(swapFees || []),
    swapProfitFee,
    swapPriceImpact,
    positionFeeAfterDiscount,
    positionPriceImpact,
    borrowFee,
    fundingFee,
    uiFee,
    uiSwapFee,
  ]);

  const payTotalFees = getTotalFeeItem([
    ...(swapFees || []),
    swapProfitFee,
    swapPriceImpact,
    positionFeeAfterDiscount,
    borrowFee,
    fundingFee,
    uiFee,
    uiSwapFee,
    !isIncrease ? positionPriceImpact : undefined,
  ]);

  return {
    totalFees,
    payTotalFees,
    swapFees,
    swapProfitFee,
    swapPriceImpact,
    positionFee: positionFeeBeforeDiscount,
    positionPriceImpact,
    priceImpactDiff: getFeeItem(priceImpactDiffUsd, sizeDeltaUsd),
    borrowFee,
    fundingFee,
    feeDiscountUsd,
    uiFee,
    uiSwapFee,
  };
}
