import { BigNumber } from "ethers";
import { applyFactor, getBasisPoints } from "lib/numbers";
import { FeeItem, MarketsFeesConfigsData } from "../types";
import { HIGH_PRICE_IMPACT_BPS } from "config/synthetics";
import { MarketInfo } from "domain/synthetics/markets";

export * from "./executionFee";
export * from "./priceImpact";

export function getMarketFeesConfig(feeConfigsData: MarketsFeesConfigsData, marketAddress?: string) {
  if (!marketAddress) return undefined;

  return feeConfigsData[marketAddress];
}

export function getPositionFee(marketInfo: MarketInfo, sizeDeltaUsd?: BigNumber) {
  if (!sizeDeltaUsd) return undefined;

  return applyFactor(sizeDeltaUsd, marketInfo.positionFeeFactor);
}

export function getFundingFeeFactor(marketInfo: MarketInfo, isLong?: boolean, periodInSeconds?: number) {
  const { fundingPerSecond, longsPayShorts } = marketInfo;

  const isPositive = isLong ? longsPayShorts : !longsPayShorts;

  return fundingPerSecond.mul(isPositive ? 1 : -1).mul(periodInSeconds || 1);
}

export function getFundingFeeRateUsd(
  marketInfo: MarketInfo,
  isLong?: boolean,
  sizeInUsd?: BigNumber,
  periodInSeconds?: number
) {
  const factor = getFundingFeeFactor(marketInfo, isLong, periodInSeconds);

  if (!factor || !sizeInUsd) return undefined;

  return applyFactor(sizeInUsd, factor);
}

export function getBorrowingFeeFactor(marketInfo: MarketInfo, isLong?: boolean, periodInSeconds?: number) {
  const factorPerSecond = isLong
    ? marketInfo.borrowingFactorPerSecondForLongs
    : marketInfo.borrowingFactorPerSecondForShorts;

  return factorPerSecond.mul(periodInSeconds || 1);
}

export function getBorrowingFeeRateUsd(
  marketInfo: MarketInfo,
  isLong?: boolean,
  sizeInUsd?: BigNumber,
  periodInSeconds?: number
) {
  const factor = getBorrowingFeeFactor(marketInfo, isLong, periodInSeconds);

  if (!factor || !sizeInUsd) return undefined;

  return applyFactor(sizeInUsd, factor);
}

export function isHighPriceImpact(priceImpact?: FeeItem) {
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
