import { SwapFeeItem, getFeeItem, getTotalFeeItem, getTotalSwapVolumeFromSwapStats } from "domain/synthetics/fees";
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
  initialCollateralUsd: bigint;
  sizeDeltaUsd: bigint;
  swapSteps: SwapStats[];
  positionFeeUsd: bigint;
  swapPriceImpactDeltaUsd: bigint;
  positionPriceImpactDeltaUsd: bigint;
  priceImpactDiffUsd: bigint;
  borrowingFeeUsd: bigint;
  fundingFeeUsd: bigint;
  feeDiscountUsd: bigint;
  swapProfitFeeUsd: bigint;
  uiFeeFactor: bigint;
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

  const swapFees: SwapFeeItem[] | undefined =
    initialCollateralUsd > 0
      ? swapSteps.map((step) => ({
          tokenInAddress: step.tokenInAddress,
          tokenOutAddress: step.tokenOutAddress,
          marketAddress: step.marketAddress,
          deltaUsd: step.swapFeeUsd * -1n,
          bps: step.usdIn != 0n ? getBasisPoints(step.swapFeeUsd * -1n, step.usdIn) : 0n,
        }))
      : undefined;

  const totalSwapVolumeUsd = getTotalSwapVolumeFromSwapStats(swapSteps);
  const uiFeeUsd = applyFactor(sizeDeltaUsd, uiFeeFactor);
  const uiSwapFeeUsd = applyFactor(totalSwapVolumeUsd, uiFeeFactor);

  const uiSwapFee = getFeeItem(uiSwapFeeUsd * -1n, totalSwapVolumeUsd, {
    shouldRoundUp: true,
  });
  const uiFee = getFeeItem(uiFeeUsd * -1n, sizeDeltaUsd, { shouldRoundUp: true });

  const swapProfitFee = getFeeItem(swapProfitFeeUsd * -1n, initialCollateralUsd);

  const swapPriceImpact = getFeeItem(swapPriceImpactDeltaUsd, initialCollateralUsd);

  const positionFeeBeforeDiscount = getFeeItem((positionFeeUsd + feeDiscountUsd) * -1n, sizeDeltaUsd);
  const positionFeeAfterDiscount = getFeeItem(positionFeeUsd * -1n, sizeDeltaUsd);

  const borrowFee = getFeeItem(borrowingFeeUsd * -1n, initialCollateralUsd);

  const fundingFee = getFeeItem(fundingFeeUsd * -1n, initialCollateralUsd);
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
