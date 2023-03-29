import { HIGH_PRICE_IMPACT_BPS } from "config/factors";
import { MarketInfo } from "domain/synthetics/markets";
import { BigNumber } from "ethers";
import { applyFactor, getBasisPoints } from "lib/numbers";
import { FeeItem } from "../types";

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

export function getTotalFeeItem(feeItems: FeeItem[]): FeeItem {
  const totalFeeItem: FeeItem = {
    deltaUsd: BigNumber.from(0),
    bps: BigNumber.from(0),
  };

  feeItems.forEach((feeItem) => {
    totalFeeItem.deltaUsd = totalFeeItem.deltaUsd.add(feeItem.deltaUsd);
    totalFeeItem.bps = totalFeeItem.bps.add(feeItem.bps);
  });

  return totalFeeItem;
}
