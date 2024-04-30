import { HIGH_PRICE_IMPACT_BPS } from "config/factors";
import { MarketInfo } from "domain/synthetics/markets";
import { BigNumber } from "ethers";
import { PRECISION } from "lib/legacy";
import { applyFactor, getBasisPoints } from "lib/numbers";
import { FeeItem } from "../types";
import { SwapStats } from "domain/synthetics/trade";

export * from "./executionFee";
export * from "./priceImpact";

export function getSwapFee(marketInfo: MarketInfo, swapAmount: BigNumber, forPositiveImpact: boolean) {
  const factor = forPositiveImpact
    ? marketInfo.swapFeeFactorForPositiveImpact
    : marketInfo.swapFeeFactorForNegativeImpact;

  return applyFactor(swapAmount, factor);
}

export function getPositionFee(
  marketInfo: MarketInfo,
  sizeDeltaUsd: BigNumber,
  forPositiveImpact: boolean,
  referralInfo: { totalRebateFactor: BigNumber; discountFactor: BigNumber } | undefined,
  uiFeeFactor?: BigNumber
) {
  const factor = forPositiveImpact
    ? marketInfo.positionFeeFactorForPositiveImpact
    : marketInfo.positionFeeFactorForNegativeImpact;

  let positionFeeUsd = applyFactor(sizeDeltaUsd, factor);
  const uiFeeUsd = applyFactor(sizeDeltaUsd, uiFeeFactor || BigInt(0));

  if (!referralInfo) {
    return { positionFeeUsd, discountUsd: BigInt(0), totalRebateUsd: BigInt(0) };
  }

  const totalRebateUsd = applyFactor(positionFeeUsd, referralInfo.totalRebateFactor);
  const discountUsd = applyFactor(totalRebateUsd, referralInfo.discountFactor);

  positionFeeUsd = positionFeeUsd.sub(discountUsd);

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

  let factorPerSecond: BigNumber;

  if (isLargerSide) {
    factorPerSecond = fundingFactorPerSecond.mul(-1);
  } else {
    const largerInterestUsd = longsPayShorts ? longInterestUsd : shortInterestUsd;
    const smallerInterestUsd = longsPayShorts ? shortInterestUsd : longInterestUsd;

    const ratio = smallerInterestUsd.gt(0) ? largerInterestUsd.mul(PRECISION).div(smallerInterestUsd) : BigInt(0);

    factorPerSecond = applyFactor(ratio, fundingFactorPerSecond);
  }

  return factorPerSecond.mul(periodInSeconds);
}

export function getFundingFeeRateUsd(
  marketInfo: MarketInfo,
  isLong: boolean,
  sizeInUsd: BigNumber,
  periodInSeconds: number
) {
  const factor = getFundingFactorPerPeriod(marketInfo, isLong, periodInSeconds);

  return applyFactor(sizeInUsd, factor);
}

export function getBorrowingFactorPerPeriod(marketInfo: MarketInfo, isLong: boolean, periodInSeconds: number) {
  const factorPerSecond = isLong
    ? marketInfo.borrowingFactorPerSecondForLongs
    : marketInfo.borrowingFactorPerSecondForShorts;

  return factorPerSecond.mul(periodInSeconds || 1);
}

export function getBorrowingFeeRateUsd(
  marketInfo: MarketInfo,
  isLong: boolean,
  sizeInUsd: BigNumber,
  periodInSeconds: number
) {
  const factor = getBorrowingFactorPerPeriod(marketInfo, isLong, periodInSeconds);

  return applyFactor(sizeInUsd, factor);
}

export function getIsHighPriceImpact(positionPriceImpact?: FeeItem, swapPriceImpact?: FeeItem) {
  const totalPriceImpact = getTotalFeeItem([positionPriceImpact, swapPriceImpact]);
  return totalPriceImpact.deltaUsd.lt(0) && totalPriceImpact.bps.abs().gte(HIGH_PRICE_IMPACT_BPS);
}

export function getFeeItem(
  feeDeltaUsd?: BigNumber,
  basis?: BigNumber,
  opts: { shouldRoundUp?: boolean } = {}
): FeeItem | undefined {
  const { shouldRoundUp = false } = opts;
  if (!feeDeltaUsd) return undefined;

  return {
    deltaUsd: feeDeltaUsd,
    bps: basis?.gt(0) ? getBasisPoints(feeDeltaUsd, basis, shouldRoundUp) : BigInt(0),
  };
}

export function getTotalFeeItem(feeItems: (FeeItem | undefined)[]): FeeItem {
  const totalFeeItem: FeeItem = {
    deltaUsd: BigInt(0),
    bps: BigInt(0),
  };

  (feeItems.filter(Boolean) as FeeItem[]).forEach((feeItem) => {
    totalFeeItem.deltaUsd = totalFeeItem.deltaUsd.add(feeItem.deltaUsd);
    totalFeeItem.bps = totalFeeItem.bps.add(feeItem.bps);
  });

  return totalFeeItem;
}

export function getTotalSwapVolumeFromSwapStats(swapSteps?: SwapStats[]) {
  if (!swapSteps) return BigInt(0);

  return swapSteps.reduce((acc, curr) => {
    return acc.add(curr.usdIn);
  }, BigInt(0));
}
