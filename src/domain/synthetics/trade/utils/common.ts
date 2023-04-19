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
  fundingFeeDeltaUsd: BigNumber;
}): TradeFees {
  const {
    initialCollateralUsd,
    sizeDeltaUsd,
    swapSteps,
    positionFeeUsd,
    swapPriceImpactDeltaUsd,
    positionPriceImpactDeltaUsd,
    borrowingFeeUsd,
    fundingFeeDeltaUsd,
  } = p;

  const swapBasis = initialCollateralUsd;
  const positionBasis = sizeDeltaUsd;

  const swapFees: SwapFeeItem[] | undefined = swapBasis.gt(0)
    ? swapSteps.map((step) => ({
        tokenInAddress: step.tokenInAddress,
        tokenOutAddress: step.tokenOutAddress,
        marketAddress: step.marketAddress,
        deltaUsd: step.swapFeeUsd.mul(-1),
        bps: getBasisPoints(step.swapFeeUsd.mul(-1), swapBasis),
      }))
    : undefined;

  const swapPriceImpactFee = getFeeItem(swapPriceImpactDeltaUsd, swapBasis);

  const positionFee = getFeeItem(positionFeeUsd.mul(-1), positionBasis);

  const borrowFee = getFeeItem(borrowingFeeUsd.mul(-1), initialCollateralUsd);

  const fundingFee = fundingFeeDeltaUsd.lt(0) ? getFeeItem(fundingFeeDeltaUsd, initialCollateralUsd) : undefined;

  const positionPriceImpactFee = getFeeItem(positionPriceImpactDeltaUsd, positionBasis);

  const totalFees = getTotalFeeItem([
    ...(swapFees || []),
    swapPriceImpactFee,
    positionFee,
    positionPriceImpactFee,
    borrowFee,
    fundingFee,
  ]);

  return {
    totalFees,
    swapFees,
    swapPriceImpact: swapPriceImpactFee,
    positionFee,
    positionPriceImpact: positionPriceImpactFee,
    borrowFee,
    fundingFee,
  };
}
