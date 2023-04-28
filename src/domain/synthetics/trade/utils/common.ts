import { SwapFeeItem, getFeeItem, getTotalFeeItem } from "domain/synthetics/fees";
import { BigNumber } from "ethers";
import { getBasisPoints } from "lib/numbers";
import { SwapStats, TradeFees, TradeMode, TradeType } from "../types";

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

export function getTradeFees(p: {
  initialCollateralUsd: BigNumber;
  sizeDeltaUsd: BigNumber;
  swapSteps: SwapStats[];
  positionFeeUsd: BigNumber;
  swapPriceImpactDeltaUsd: BigNumber;
  positionPriceImpactDeltaUsd: BigNumber;
  borrowingFeeUsd: BigNumber;
  fundingFeeUsd: BigNumber;
  feeDiscountUsd: BigNumber;
}): TradeFees {
  const {
    initialCollateralUsd,
    sizeDeltaUsd,
    swapSteps,
    positionFeeUsd,
    swapPriceImpactDeltaUsd,
    positionPriceImpactDeltaUsd,
    borrowingFeeUsd,
    fundingFeeUsd,
    feeDiscountUsd,
  } = p;

  const swapBasis = initialCollateralUsd;

  const swapFees: SwapFeeItem[] | undefined = swapBasis.gt(0)
    ? swapSteps.map((step) => ({
        tokenInAddress: step.tokenInAddress,
        tokenOutAddress: step.tokenOutAddress,
        marketAddress: step.marketAddress,
        deltaUsd: step.swapFeeUsd.mul(-1),
        bps: getBasisPoints(step.swapFeeUsd.mul(-1), swapBasis),
      }))
    : undefined;

  const swapPriceImpact = getFeeItem(swapPriceImpactDeltaUsd, swapBasis);

  const positionFeeBeforeDiscount = getFeeItem(positionFeeUsd.add(feeDiscountUsd).mul(-1), sizeDeltaUsd);
  const positionFeeAfterDiscount = getFeeItem(positionFeeUsd.mul(-1), sizeDeltaUsd);

  const borrowFee = getFeeItem(borrowingFeeUsd.mul(-1), initialCollateralUsd);

  const fundingFee = getFeeItem(fundingFeeUsd.mul(-1), initialCollateralUsd);

  const positionPriceImpact = getFeeItem(positionPriceImpactDeltaUsd, sizeDeltaUsd);

  const totalFees = getTotalFeeItem([
    ...(swapFees || []),
    swapPriceImpact,
    positionFeeAfterDiscount,
    positionPriceImpact,
    borrowFee,
    fundingFee,
  ]);

  const payTotalFees = getTotalFeeItem([
    ...(swapFees || []),
    swapPriceImpact,
    positionFeeAfterDiscount,
    positionPriceImpact,
  ]);

  return {
    totalFees,
    payTotalFees,
    swapFees,
    swapPriceImpact,
    positionFee: positionFeeBeforeDiscount,
    positionPriceImpact,
    borrowFee,
    fundingFee,
    feeDiscountUsd,
  };
}
