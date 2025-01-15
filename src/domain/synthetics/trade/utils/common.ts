import { SwapFeeItem, getFeeItem, getTotalFeeItem, getTotalSwapVolumeFromSwapStats } from "domain/synthetics/fees";
import { applyFactor, getBasisPoints, PRECISION } from "lib/numbers";
import { SwapStats, TradeFees, TradeFlags, TradeMode, TradeType } from "../types";
import { OrderInfo, isLimitOrderType, isMarketOrderType, isSwapOrderType } from "domain/synthetics/orders";
import { bigMath } from "lib/bigmath";

export function getTradeFlags(tradeType: TradeType, tradeMode: TradeMode): TradeFlags {
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

export function getTradeFlagsForCollateralEdit(isLong: boolean | undefined, isIncrease: boolean): TradeFlags {
  return {
    isMarket: true,
    isIncrease,
    isLimit: false,
    isLong: Boolean(isLong),
    isShort: !isLong,
    isSwap: false,
    isPosition: true,
    isTrigger: false,
  };
}

export function getTradeFees(p: {
  initialCollateralUsd: bigint;
  sizeDeltaUsd: bigint;
  collateralDeltaUsd: bigint;
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
    initialCollateralUsd,
    sizeDeltaUsd,
    collateralDeltaUsd,
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
          precisePercentage: step.usdIn != 0n ? bigMath.mulDiv(step.swapFeeUsd * -1n, PRECISION, step.usdIn) : 0n,
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
  const priceImpactDiff = getFeeItem(priceImpactDiffUsd, sizeDeltaUsd);

  const positionCollateralPriceImpact = getFeeItem(positionPriceImpactDeltaUsd, bigMath.abs(collateralDeltaUsd));
  const collateralPriceImpactDiff = getFeeItem(priceImpactDiffUsd, collateralDeltaUsd);

  const totalFees = getTotalFeeItem([
    ...(swapFees || []),
    swapProfitFee,
    swapPriceImpact,
    positionFeeAfterDiscount,
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
  ]);

  return {
    totalFees,
    payTotalFees,
    swapFees,
    swapProfitFee,
    swapPriceImpact,
    positionFee: positionFeeBeforeDiscount,
    positionPriceImpact,
    priceImpactDiff,
    positionCollateralPriceImpact,
    collateralPriceImpactDiff,
    borrowFee,
    fundingFee,
    feeDiscountUsd,
    uiFee,
    uiSwapFee,
  };
}

export function getNextPositionExecutionPrice(p: {
  triggerPrice: bigint;
  priceImpactUsd: bigint;
  sizeDeltaUsd: bigint;
  isLong: boolean;
  isIncrease: boolean;
}) {
  if (p.sizeDeltaUsd == 0n) {
    return null;
  }

  const adjustedPriceImpactUsd = p.isIncrease
    ? p.isLong
      ? -p.priceImpactUsd
      : p.priceImpactUsd
    : p.isLong
      ? p.priceImpactUsd
      : -p.priceImpactUsd;

  const adjustment = bigMath.mulDiv(p.triggerPrice, adjustedPriceImpactUsd, p.sizeDeltaUsd);
  return p.triggerPrice + adjustment;
}
