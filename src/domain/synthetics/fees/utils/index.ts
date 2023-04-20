import { HIGH_PRICE_IMPACT_BPS } from "config/factors";
import { MarketInfo } from "domain/synthetics/markets";
import { BigNumber } from "ethers";
import { applyFactor, getBasisPoints } from "lib/numbers";
import { FeeItem } from "../types";
import { PRECISION } from "lib/legacy";

export * from "./executionFee";
export * from "./priceImpact";

export function getPositionFee(marketInfo: MarketInfo, sizeDeltaUsd: BigNumber) {
  return applyFactor(sizeDeltaUsd, marketInfo.positionFeeFactor);
}

export function getFundingFeeFactor(marketInfo: MarketInfo, isLong: boolean, periodInSeconds: number) {
  const { fundingPerSecond, longsPayShorts } = marketInfo;

  const isPositive = isLong ? longsPayShorts : !longsPayShorts;

  return fundingPerSecond.mul(isPositive ? 1 : -1).mul(periodInSeconds || 1);
}

export function getFundingApr(marketInfo: MarketInfo, isLong: boolean, periodInSeconds: number) {
  const fundingFactor = getFundingFeeFactor(marketInfo, isLong, periodInSeconds);

  const usdImbalance = marketInfo.longInterestUsd.sub(marketInfo.shortInterestUsd).abs();
  const fundingUsd = applyFactor(usdImbalance, fundingFactor);

  if (fundingUsd.eq(0)) {
    return BigNumber.from(0);
  }

  if (isLong && marketInfo.longInterestUsd.gt(0)) {
    return fundingUsd.mul(PRECISION).div(marketInfo.longInterestUsd).mul(100);
  } else if (!isLong && marketInfo.shortInterestUsd.gt(0)) {
    return fundingUsd.mul(PRECISION).div(marketInfo.shortInterestUsd).mul(100);
  }

  return BigNumber.from(0);
}

export function getFundingFeeRateUsd(
  marketInfo: MarketInfo,
  isLong: boolean,
  sizeInUsd: BigNumber,
  periodInSeconds: number
) {
  const factor = getFundingFeeFactor(marketInfo, isLong, periodInSeconds);

  return applyFactor(sizeInUsd, factor);
}

export function getBorrowingFeeFactor(marketInfo: MarketInfo, isLong: boolean, periodInSeconds: number) {
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
  const factor = getBorrowingFeeFactor(marketInfo, isLong, periodInSeconds);

  return applyFactor(sizeInUsd, factor);
}

export function getIsHighPriceImpact(priceImpact?: FeeItem) {
  return priceImpact?.deltaUsd.lt(0) && priceImpact.bps.abs().gte(HIGH_PRICE_IMPACT_BPS);
}

export function getFeeItem(feeDeltaUsd?: BigNumber, basis?: BigNumber): FeeItem | undefined {
  if (!feeDeltaUsd || !basis?.gt(0)) return undefined;

  return {
    deltaUsd: feeDeltaUsd,
    bps: getBasisPoints(feeDeltaUsd, basis),
  };
}

export function getTotalFeeItem(feeItems: (FeeItem | undefined)[]): FeeItem {
  const totalFeeItem: FeeItem = {
    deltaUsd: BigNumber.from(0),
    bps: BigNumber.from(0),
  };

  (feeItems.filter(Boolean) as FeeItem[]).forEach((feeItem) => {
    totalFeeItem.deltaUsd = totalFeeItem.deltaUsd.add(feeItem.deltaUsd);
    totalFeeItem.bps = totalFeeItem.bps.add(feeItem.bps);
  });

  return totalFeeItem;
}
