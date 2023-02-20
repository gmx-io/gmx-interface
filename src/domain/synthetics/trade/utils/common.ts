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
  sizeDeltaUsd?: BigNumber;
  swapSteps?: SwapStats[];
  positionFeeUsd?: BigNumber;
  swapPriceImpactDeltaUsd?: BigNumber;
  positionPriceImpactDeltaUsd?: BigNumber;
}): TradeFees | undefined {
  if (!p.sizeDeltaUsd) return undefined;

  const basis = p.sizeDeltaUsd;

  const swapFees: SwapFeeItem[] | undefined = p.swapSteps?.map((step) => ({
    tokenInAddress: step.tokenInAddress,
    tokenOutAddress: step.tokenOutAddress,
    marketAddress: step.marketAddress,
    deltaUsd: step.swapFeeUsd.mul(-1),
    bps: getBasisPoints(step.swapFeeUsd.mul(-1), basis),
  }));

  const swapPriceImpactFee = getFeeItem(p.swapPriceImpactDeltaUsd, basis);

  const positionFee = getFeeItem(p.positionFeeUsd?.mul(-1), basis);

  const positionPriceImpactFee = getFeeItem(p.positionPriceImpactDeltaUsd, basis);

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
