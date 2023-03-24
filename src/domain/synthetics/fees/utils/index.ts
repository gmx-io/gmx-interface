import { BigNumber } from "ethers";
import { applyFactor, getBasisPoints } from "lib/numbers";
import { FeeItem, MarketsFeesConfigsData } from "../types";
import { HIGH_PRICE_IMPACT_BPS } from "config/synthetics";

export * from "./executionFee";
export * from "./priceImpact";

export function getMarketFeesConfig(feeConfigsData: MarketsFeesConfigsData, marketAddress?: string) {
  if (!marketAddress) return undefined;

  return feeConfigsData[marketAddress];
}

export function getPositionFee(feeConfigs: MarketsFeesConfigsData, marketAddress?: string, sizeDeltaUsd?: BigNumber) {
  const feeConfig = getMarketFeesConfig(feeConfigs, marketAddress);

  if (!feeConfig || !sizeDeltaUsd) return undefined;

  return applyFactor(sizeDeltaUsd, feeConfig.positionFeeFactor);
}

export function getFundingFeeFactor(
  feesConfigs: MarketsFeesConfigsData,
  marketAddress?: string,
  isLong?: boolean,
  periodInSeconds?: number
) {
  const feeConfig = getMarketFeesConfig(feesConfigs, marketAddress);

  if (!feeConfig) return undefined;

  const { fundingPerSecond, longsPayShorts } = feeConfig;

  const isPositive = isLong ? longsPayShorts : !longsPayShorts;

  return fundingPerSecond.mul(isPositive ? 1 : -1).mul(periodInSeconds || 1);
}

export function getFundingFeeRateUsd(
  feesConfigs: MarketsFeesConfigsData,
  marketAddress?: string,
  isLong?: boolean,
  sizeInUsd?: BigNumber,
  periodInSeconds?: number
) {
  const factor = getFundingFeeFactor(feesConfigs, marketAddress, isLong, periodInSeconds);

  if (!factor || !sizeInUsd) return undefined;

  return applyFactor(sizeInUsd, factor);
}

export function getBorrowingFeeFactor(
  feeConfigs: MarketsFeesConfigsData,
  marketAddress?: string,
  isLong?: boolean,
  periodInSeconds?: number
) {
  const feeConfig = getMarketFeesConfig(feeConfigs, marketAddress);

  if (!feeConfig) return undefined;

  const factorPerSecond = isLong
    ? feeConfig.borrowingFactorPerSecondForLongs
    : feeConfig.borrowingFactorPerSecondForShorts;

  return factorPerSecond.mul(periodInSeconds || 1);
}

export function getBorrowingFeeRateUsd(
  feesConfigs: MarketsFeesConfigsData,
  marketAddress?: string,
  isLong?: boolean,
  sizeInUsd?: BigNumber,
  periodInSeconds?: number
) {
  const factor = getBorrowingFeeFactor(feesConfigs, marketAddress, isLong, periodInSeconds);

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
