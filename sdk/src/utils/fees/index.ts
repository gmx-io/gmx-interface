import { HIGH_PRICE_IMPACT_BPS } from "configs/factors";
import { bigMath } from "utils/bigmath";
import { getOpenInterestForBalance } from "utils/markets";
import { MarketInfo } from "utils/markets/types";
import { applyFactor, getBasisPoints, PRECISION } from "utils/numbers";
import { SwapPricingType } from "utils/orders/types";
import { SwapStats } from "utils/trade/types";

import { FeeItem } from "./types";

export * from "./types";
export * from "./estimateOraclePriceCount";
export * from "./executionFee";
export * from "./priceImpact";
export * from "./getNaiveEstimatedGasBySwapCount";

export function getSwapFee(
  marketInfo: MarketInfo,
  swapAmount: bigint,
  balanceWasImproved: boolean,
  swapPricingType: SwapPricingType
) {
  let factor: bigint;

  if (swapPricingType === SwapPricingType.AtomicSwap) {
    factor = marketInfo.atomicSwapFeeFactor;
  } else if (swapPricingType === SwapPricingType.Withdrawal) {
    factor = balanceWasImproved
      ? marketInfo.withdrawalFeeFactorBalanceWasImproved ?? marketInfo.swapFeeFactorForBalanceWasImproved
      : marketInfo.withdrawalFeeFactorBalanceWasNotImproved ?? marketInfo.swapFeeFactorForBalanceWasNotImproved;
  } else {
    factor = balanceWasImproved
      ? marketInfo.swapFeeFactorForBalanceWasImproved
      : marketInfo.swapFeeFactorForBalanceWasNotImproved;
  }

  return applyFactor(swapAmount, factor);
}

export function getPositionFee(
  marketInfo: MarketInfo,
  sizeDeltaUsd: bigint,
  balanceWasImproved: boolean,
  referralInfo: { totalRebateFactor: bigint; discountFactor: bigint } | undefined,
  uiFeeFactor?: bigint
) {
  const factor = balanceWasImproved
    ? marketInfo.positionFeeFactorForBalanceWasImproved
    : marketInfo.positionFeeFactorForBalanceWasNotImproved;

  let positionFeeUsd = applyFactor(sizeDeltaUsd, factor);
  const uiFeeUsd = applyFactor(sizeDeltaUsd, uiFeeFactor ?? 0n);

  if (!referralInfo) {
    return { positionFeeUsd, discountUsd: 0n, totalRebateUsd: 0n, uiFeeUsd };
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

export function getFundingFactorPerPeriod(marketInfo: MarketInfo, isLong: boolean, periodInSeconds: bigint) {
  const { fundingFactorPerSecond, longsPayShorts } = marketInfo;

  const longInterestUsd = getOpenInterestForBalance(marketInfo, true);
  const shortInterestUsd = getOpenInterestForBalance(marketInfo, false);

  const payingInterestUsd = longsPayShorts ? longInterestUsd : shortInterestUsd;
  const receivingInterestUsd = longsPayShorts ? shortInterestUsd : longInterestUsd;

  const fundingForPayingSide = fundingFactorPerSecond;
  let fundingForReceivingSide = 0n;
  if (receivingInterestUsd !== 0n) {
    fundingForReceivingSide = bigMath.mulDiv(fundingForPayingSide, payingInterestUsd, receivingInterestUsd);
  }

  if ((longsPayShorts && isLong) || (!longsPayShorts && !isLong)) {
    return fundingForPayingSide * periodInSeconds * -1n;
  } else {
    return fundingForReceivingSide * periodInSeconds;
  }
}

export function getFundingFeeRateUsd(
  marketInfo: MarketInfo,
  isLong: boolean,
  sizeInUsd: bigint,
  periodInSeconds: bigint
) {
  const factor = getFundingFactorPerPeriod(marketInfo, isLong, periodInSeconds);

  return applyFactor(sizeInUsd, factor);
}

export function getBorrowingFactorPerPeriod(marketInfo: MarketInfo, isLong: boolean, periodInSeconds: bigint) {
  const factorPerSecond = isLong
    ? marketInfo.borrowingFactorPerSecondForLongs
    : marketInfo.borrowingFactorPerSecondForShorts;

  return factorPerSecond * periodInSeconds;
}

export function getBorrowingFeeRateUsd(
  marketInfo: MarketInfo,
  isLong: boolean,
  sizeInUsd: bigint,
  periodInSeconds: bigint
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
    precisePercentage: basis !== undefined && basis > 0 ? bigMath.mulDiv(feeDeltaUsd, PRECISION, basis) : 0n,
  };
}

export function getTotalFeeItem(feeItems: (FeeItem | undefined)[]): FeeItem {
  const totalFeeItem: FeeItem = {
    deltaUsd: 0n,
    bps: 0n,
    precisePercentage: 0n,
  };

  (feeItems.filter(Boolean) as FeeItem[]).forEach((feeItem) => {
    totalFeeItem.deltaUsd = totalFeeItem.deltaUsd + feeItem.deltaUsd;
    totalFeeItem.bps = totalFeeItem.bps + feeItem.bps;
    totalFeeItem.precisePercentage = totalFeeItem.precisePercentage + feeItem.precisePercentage;
  });

  return totalFeeItem;
}

export function getTotalSwapVolumeFromSwapStats(swapSteps?: SwapStats[]) {
  if (!swapSteps) return 0n;

  return swapSteps.reduce((acc, curr) => {
    return acc + curr.usdIn;
  }, 0n);
}
