import { numberToUsd, usdToNumber } from "../costs";
import type { TradingCostSide } from "../types";
import type { BookSide, HyperliquidBookLevel } from "./types";

export type BookFillResult = {
  status: "filled" | "insufficientDepth";
  averagePrice: number | undefined;
  filledUsd: bigint;
};

export function simulateL2BookFill({
  levels,
  sizeUsd,
}: {
  levels: HyperliquidBookLevel[];
  sizeUsd: bigint;
}): BookFillResult {
  const targetUsd = usdToNumber(sizeUsd) ?? 0;
  let remainingUsd = targetUsd;
  let filledUsd = 0;
  let filledBase = 0;

  for (const level of levels) {
    if (remainingUsd <= 0) break;

    const price = Number(level.px);
    const size = Number(level.sz);
    const levelUsd = price * size;
    const takeUsd = Math.min(levelUsd, remainingUsd);
    const takeBase = takeUsd / price;

    filledUsd += takeUsd;
    filledBase += takeBase;
    remainingUsd -= takeUsd;
  }

  return {
    status: remainingUsd > 0.000001 ? "insufficientDepth" : "filled",
    averagePrice: filledBase > 0 ? filledUsd / filledBase : undefined,
    filledUsd: numberToUsd(filledUsd),
  };
}

export function getHyperliquidExecutionImpactUsd({
  sizeUsd,
  referencePrice,
  averagePrice,
  side,
}: {
  sizeUsd: bigint;
  referencePrice: number;
  averagePrice: number;
  side: BookSide;
}) {
  if (referencePrice <= 0) {
    return 0n;
  }

  const size = usdToNumber(sizeUsd) ?? 0;
  const direction = side === "ask" ? 1 : -1;
  return numberToUsd(size * ((averagePrice - referencePrice) / referencePrice) * direction);
}

export function getBookSideForLeg({
  tradingSide,
  isOpen,
}: {
  tradingSide: TradingCostSide;
  isOpen: boolean;
}): BookSide {
  if (tradingSide === "long") {
    return isOpen ? "ask" : "bid";
  }

  return isOpen ? "bid" : "ask";
}

export function getHyperliquidFundingCostUsd({
  sizeUsd,
  side,
  hourlyFundingRate,
  holdingPeriodHours,
}: {
  sizeUsd: bigint;
  side: TradingCostSide;
  hourlyFundingRate: number;
  holdingPeriodHours: number;
}) {
  const signedRate = side === "long" ? hourlyFundingRate : -hourlyFundingRate;
  return numberToUsd((usdToNumber(sizeUsd) ?? 0) * signedRate * holdingPeriodHours);
}
