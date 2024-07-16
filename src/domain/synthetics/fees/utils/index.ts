import { HIGH_PRICE_IMPACT_BPS } from "config/factors";
import { MarketInfo } from "domain/synthetics/markets";
import { PRECISION } from "lib/legacy";
import { applyFactor, getBasisPoints } from "lib/numbers";
import { FeeItem } from "../types";
import { SwapStats } from "domain/synthetics/trade";
import { bigMath } from "lib/bigmath";

export * from "./executionFee";
export * from "./priceImpact";

export function getSwapFee(marketInfo: MarketInfo, swapAmount: bigint, forPositiveImpact: boolean) {
  const factor = forPositiveImpact
    ? marketInfo.swapFeeFactorForPositiveImpact
    : marketInfo.swapFeeFactorForNegativeImpact;

  return applyFactor(swapAmount, factor);
}

export function getPositionFee(
  marketInfo: MarketInfo,
  sizeDeltaUsd: bigint,
  forPositiveImpact: boolean,
  referralInfo: { totalRebateFactor: bigint; discountFactor: bigint } | undefined,
  uiFeeFactor?: bigint
) {
  const factor = forPositiveImpact
    ? marketInfo.positionFeeFactorForPositiveImpact
    : marketInfo.positionFeeFactorForNegativeImpact;

  let positionFeeUsd = applyFactor(sizeDeltaUsd, factor);
  const uiFeeUsd = applyFactor(sizeDeltaUsd, uiFeeFactor ?? 0n);

  if (!referralInfo) {
    return { positionFeeUsd, discountUsd: 0n, totalRebateUsd: 0n };
  }

  const totalRebateUsd = applyFactor(positionFeeUsd, referralInfo.totalRebateFactor);
  const discountUsd = applyFactor(totalRebateUsd, referralInfo.discountFactor);

  positionFeeUsd = positionFeeUsd - discountUsd;

  return {
    positionFeeUsd,
    discountUsd,
    totalRebateUsd,
    uiFeeUsd,
  };
}

export function getFundingFactorPerPeriod(marketInfo: MarketInfo, isLong: boolean, periodInSeconds: number) {
  const { fundingFactorPerSecond, longsPayShorts, longInterestUsd, shortInterestUsd } = marketInfo;

  const isLargerSide = isLong ? longsPayShorts : !longsPayShorts;

  let factorPerSecond: bigint;

  if (isLargerSide) {
    factorPerSecond = fundingFactorPerSecond * -1n;
  } else {
    const largerInterestUsd = longsPayShorts ? longInterestUsd : shortInterestUsd;
    const smallerInterestUsd = longsPayShorts ? shortInterestUsd : longInterestUsd;

    const ratio = smallerInterestUsd > 0 ? bigMath.mulDiv(largerInterestUsd, PRECISION, smallerInterestUsd) : 0n;

    factorPerSecond = applyFactor(ratio, fundingFactorPerSecond);
  }

  return factorPerSecond * BigInt(periodInSeconds);
}

export function getFundingFeeRateUsd(
  marketInfo: MarketInfo,
  isLong: boolean,
  sizeInUsd: bigint,
  periodInSeconds: number
) {
  const factor = getFundingFactorPerPeriod(marketInfo, isLong, periodInSeconds);

  return applyFactor(sizeInUsd, factor);
}

export function getBorrowingFactorPerPeriod(marketInfo: MarketInfo, isLong: boolean, periodInSeconds: number) {
  const factorPerSecond = isLong
    ? marketInfo.borrowingFactorPerSecondForLongs
    : marketInfo.borrowingFactorPerSecondForShorts;

  return factorPerSecond * BigInt(periodInSeconds || 1);
}

export function getBorrowingFeeRateUsd(
  marketInfo: MarketInfo,
  isLong: boolean,
  sizeInUsd: bigint,
  periodInSeconds: number
) {
  const factor = getBorrowingFactorPerPeriod(marketInfo, isLong, periodInSeconds);

  return applyFactor(sizeInUsd, factor);
}

export function getIsHighPriceImpact(positionPriceImpact?: FeeItem, swapPriceImpact?: FeeItem) {
  const totalPriceImpact = getTotalFeeItem([positionPriceImpact, swapPriceImpact]);
  return totalPriceImpact.deltaUsd < 0 && bigMath.abs(totalPriceImpact.bps) >= HIGH_PRICE_IMPACT_BPS;
}

export function getFeeItem(
  feeDeltaUsd?: bigint,
  basis?: bigint,
  opts: { shouldRoundUp?: boolean } = {}
): FeeItem | undefined {
  const { shouldRoundUp = false } = opts;
  if (feeDeltaUsd === undefined) return undefined;

  return {
    deltaUsd: feeDeltaUsd,
    bps: basis !== undefined && basis > 0 ? getBasisPoints(feeDeltaUsd, basis, shouldRoundUp) : 0n,
  };
}

export function getTotalFeeItem(feeItems: (FeeItem | undefined)[]): FeeItem {
  const totalFeeItem: FeeItem = {
    deltaUsd: 0n,
    bps: 0n,
  };

  (feeItems.filter(Boolean) as FeeItem[]).forEach((feeItem) => {
    totalFeeItem.deltaUsd = totalFeeItem.deltaUsd + feeItem.deltaUsd;
    totalFeeItem.bps = totalFeeItem.bps + feeItem.bps;
  });

  return totalFeeItem;
}

export function getTotalSwapVolumeFromSwapStats(swapSteps?: SwapStats[]) {
  if (!swapSteps) return 0n;

  return swapSteps.reduce((acc, curr) => {
    return acc + curr.usdIn;
  }, 0n);
}
