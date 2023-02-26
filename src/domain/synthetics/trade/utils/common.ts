import { SwapStats, TradeFees, TradeMode, TradeType } from "../types";
import { FeeItem, MarketFeesConfig, SwapFeeItem, getFeeItem, getTotalFeeItem } from "domain/synthetics/fees";
import { BigNumber } from "ethers";
import { getBasisPoints } from "lib/numbers";

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

export function getDisplayedTradeFees(p: {
  feesConfig?: MarketFeesConfig;
  initialCollateralUsd?: BigNumber;
  sizeDeltaUsd?: BigNumber;
  swapSteps?: SwapStats[];
  positionFeeUsd?: BigNumber;
  swapPriceImpactDeltaUsd?: BigNumber;
  positionPriceImpactDeltaUsd?: BigNumber;
}): TradeFees | undefined {
  const swapBasis = p.initialCollateralUsd;
  const positionBasis = p.sizeDeltaUsd;

  const swapFees: SwapFeeItem[] | undefined = swapBasis
    ? p.swapSteps?.map((step) => ({
        tokenInAddress: step.tokenInAddress,
        tokenOutAddress: step.tokenOutAddress,
        marketAddress: step.marketAddress,
        deltaUsd: step.swapFeeUsd.mul(-1),
        bps: getBasisPoints(step.swapFeeUsd.mul(-1), swapBasis),
      }))
    : undefined;

  const swapPriceImpactFee = getFeeItem(p.swapPriceImpactDeltaUsd, swapBasis);

  const positionFee = getFeeItem(p.positionFeeUsd?.mul(-1), positionBasis);

  const positionPriceImpactFee = getFeeItem(p.positionPriceImpactDeltaUsd, positionBasis);

  const totalFees = getTotalFeeItem(
    [...(swapFees || []), swapPriceImpactFee, positionFee, positionPriceImpactFee].filter(Boolean) as FeeItem[]
  );

  return {
    totalFees,
    swapFees,
    swapPriceImpact: swapPriceImpactFee,
    positionFee,
    positionPriceImpact: positionPriceImpactFee,
    positionFeeFactor: p.feesConfig?.positionFeeFactor,
  };
}
