import {
  ExternalSwapFeeItem,
  SwapFeeItem,
  getFeeItem,
  getTotalFeeItem,
  getTotalSwapVolumeFromSwapStats,
} from "domain/synthetics/fees";
import { BASIS_POINTS_DIVISOR_BIGINT, PRECISION, applyFactor, getBasisPoints } from "lib/numbers";
import { ExternalSwapQuote, SwapStats, TradeFees, TradeFlags } from "sdk/types/trade";
import { bigMath } from "sdk/utils/bigmath";

import { OrderOption } from "../usePositionSellerState";

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
    isTwap: false,
  };
}

export function getPositionSellerTradeFlags(isLong: boolean | undefined, orderOption: OrderOption): TradeFlags {
  return {
    isMarket: orderOption === OrderOption.Market,
    isIncrease: false,
    isLimit: false,
    isLong: Boolean(isLong),
    isShort: !isLong,
    isSwap: false,
    isPosition: true,
    isTrigger: orderOption === OrderOption.Trigger,
    isTwap: orderOption === OrderOption.Twap,
  };
}

export function getTradeFees(p: {
  initialCollateralUsd: bigint;
  sizeInUsd: bigint;
  sizeDeltaUsd: bigint;
  collateralDeltaUsd: bigint;
  swapSteps: SwapStats[];
  externalSwapQuote: ExternalSwapQuote | undefined;
  positionFeeUsd: bigint;
  swapPriceImpactDeltaUsd: bigint;
  increasePositionPriceImpactDeltaUsd: bigint;
  totalPendingImpactDeltaUsd: bigint;
  proportionalPendingImpactDeltaUsd: bigint;
  decreasePositionPriceImpactDeltaUsd: bigint;
  priceImpactDiffUsd: bigint;
  borrowingFeeUsd: bigint;
  fundingFeeUsd: bigint;
  feeDiscountUsd: bigint;
  swapProfitFeeUsd: bigint;
  uiFeeFactor: bigint;
  type: "increase" | "decrease" | "swap";
}): TradeFees {
  const {
    initialCollateralUsd,
    sizeInUsd,
    sizeDeltaUsd,
    collateralDeltaUsd,
    swapSteps,
    positionFeeUsd,
    swapPriceImpactDeltaUsd,
    increasePositionPriceImpactDeltaUsd,
    totalPendingImpactDeltaUsd,
    externalSwapQuote,
    priceImpactDiffUsd,
    borrowingFeeUsd,
    fundingFeeUsd,
    feeDiscountUsd,
    swapProfitFeeUsd,
    proportionalPendingImpactDeltaUsd,
    decreasePositionPriceImpactDeltaUsd,
    uiFeeFactor,
    type,
  } = p;

  const swapFees: SwapFeeItem[] | undefined =
    !externalSwapQuote && initialCollateralUsd > 0
      ? swapSteps.map((step) => ({
          tokenInAddress: step.tokenInAddress,
          tokenOutAddress: step.tokenOutAddress,
          marketAddress: step.marketAddress,
          deltaUsd: step.swapFeeUsd * -1n,
          bps: step.usdIn != 0n ? getBasisPoints(step.swapFeeUsd * -1n, step.usdIn) : 0n,
          precisePercentage: step.usdIn != 0n ? bigMath.mulDiv(step.swapFeeUsd * -1n, PRECISION, step.usdIn) : 0n,
        }))
      : undefined;

  const externalSwapFee: ExternalSwapFeeItem | undefined =
    initialCollateralUsd > 0 && externalSwapQuote
      ? {
          aggregator: externalSwapQuote.aggregator,
          tokenInAddress: externalSwapQuote.inTokenAddress,
          tokenOutAddress: externalSwapQuote.outTokenAddress,
          deltaUsd: externalSwapQuote.feesUsd * -1n,
          bps:
            externalSwapQuote.usdIn != 0n
              ? getBasisPoints(externalSwapQuote.feesUsd * -1n, externalSwapQuote.usdIn)
              : 0n,
          precisePercentage:
            externalSwapQuote.usdIn != 0n
              ? bigMath.mulDiv(externalSwapQuote.feesUsd * -1n, PRECISION, externalSwapQuote.usdIn)
              : 0n,
        }
      : undefined;

  const totalSwapVolumeUsd = getTotalSwapVolumeFromSwapStats(swapSteps);
  const uiFeeUsd = applyFactor(sizeDeltaUsd, uiFeeFactor);
  const uiSwapFeeUsd = applyFactor(totalSwapVolumeUsd, uiFeeFactor);

  const uiSwapFee = getFeeItem(uiSwapFeeUsd * -1n, totalSwapVolumeUsd, {
    shouldRoundUp: true,
  });
  const uiFee = getFeeItem(uiFeeUsd * -1n, sizeDeltaUsd, { shouldRoundUp: true });

  const swapProfitFee = getFeeItem(swapProfitFeeUsd * -1n, initialCollateralUsd);

  const swapPriceImpact = !externalSwapQuote ? getFeeItem(swapPriceImpactDeltaUsd, initialCollateralUsd) : undefined;

  const positionFeeBeforeDiscount = getFeeItem((positionFeeUsd + feeDiscountUsd) * -1n, sizeDeltaUsd);
  const positionFeeAfterDiscount = getFeeItem(positionFeeUsd * -1n, sizeDeltaUsd);

  const borrowFee = getFeeItem(borrowingFeeUsd * -1n, initialCollateralUsd);

  const fundingFee = getFeeItem(fundingFeeUsd * -1n, initialCollateralUsd);

  const increasePositionPriceImpact = getFeeItem(increasePositionPriceImpactDeltaUsd, sizeDeltaUsd);
  const decreasePositionPriceImpact = getFeeItem(decreasePositionPriceImpactDeltaUsd, sizeDeltaUsd);

  const proportionalPendingImpact = getFeeItem(proportionalPendingImpactDeltaUsd, sizeDeltaUsd);

  const totalPendingImpact = getFeeItem(totalPendingImpactDeltaUsd, sizeDeltaUsd);
  const priceImpactDiff = getFeeItem(priceImpactDiffUsd, sizeDeltaUsd);

  const positionNetPriceImpact = getTotalFeeItem([
    type === "increase" ? increasePositionPriceImpact : totalPendingImpact,
    priceImpactDiff,
  ]);

  let collateralDeltaBasis;
  if (type === "increase") {
    collateralDeltaBasis = collateralDeltaUsd;
  } else {
    /*
     * For decrease orders collateral delta depends of keepLeverage flag,
     * so we need to calculate the proportional collateral delta based on sizeDeltaUsd and sizeInUsd
     */
    const sizeDeltaBps = sizeInUsd !== 0n ? getBasisPoints(sizeDeltaUsd, sizeInUsd) : 1n;
    const proportionalCollateralDeltaUsd =
      initialCollateralUsd !== undefined ? (initialCollateralUsd * sizeDeltaBps) / BASIS_POINTS_DIVISOR_BIGINT : 0n;

    collateralDeltaBasis = proportionalCollateralDeltaUsd;
  }

  const positionCollateralPriceImpact = getFeeItem(
    type === "increase" ? increasePositionPriceImpactDeltaUsd : totalPendingImpactDeltaUsd,
    bigMath.abs(collateralDeltaBasis)
  );

  const collateralPriceImpactDiff = getFeeItem(priceImpactDiffUsd, collateralDeltaBasis);
  const collateralNetPriceImpact = getTotalFeeItem([positionCollateralPriceImpact, collateralPriceImpactDiff]);

  const totalFees = getTotalFeeItem([
    ...(swapFees || []),
    externalSwapFee,
    swapProfitFee,
    swapPriceImpact,
    type === "decrease" ? totalPendingImpact : undefined,
    type === "decrease" ? priceImpactDiff : undefined,
    positionFeeAfterDiscount,
    borrowFee,
    fundingFee,
    uiFee,
    uiSwapFee,
  ]);

  return {
    totalFees,
    payTotalFees: totalFees,
    swapFees,
    swapProfitFee,
    swapPriceImpact,
    positionFee: positionFeeBeforeDiscount,
    priceImpactDiff,
    positionCollateralPriceImpact,
    proportionalPendingImpact,
    increasePositionPriceImpact,
    decreasePositionPriceImpact,
    totalPendingImpact,
    collateralPriceImpactDiff,
    positionNetPriceImpact,
    collateralNetPriceImpact,
    borrowFee,
    fundingFee,
    feeDiscountUsd,
    uiFee,
    uiSwapFee,
    externalSwapFee,
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
