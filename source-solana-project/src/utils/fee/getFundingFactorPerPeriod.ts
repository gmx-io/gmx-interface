import { BN_ZERO } from '@/config/constants';
import { MarketInfo } from '@/selectors/market/types';
import { BN } from '@coral-xyz/anchor';

export function getFundingFactorPerPeriod(
  marketInfo: MarketInfo,
  isLong: boolean,
  periodInSeconds: BN
) {
  const fundingFactor = marketInfo.fundingFactorPerSecond;

  const longMarketOpenInterest =
    marketInfo.openInterestForLongLongTokenAmount.add(
      marketInfo.openInterestForLongShortTokenAmount
    );
  const shortMarketOpenInterest =
    marketInfo.openInterestForShortLongTokenAmount.add(
      marketInfo.openInterestForShortShortTokenAmount
    );

  let longFundingRatePerSecond: BN, shortFundingRatePerSecond: BN;

  if (longMarketOpenInterest.isZero() || shortMarketOpenInterest.isZero()) {
    longFundingRatePerSecond = BN_ZERO;
    shortFundingRatePerSecond = BN_ZERO;
  } else if (fundingFactor.isNeg()) {
    shortFundingRatePerSecond = fundingFactor;
    longFundingRatePerSecond = fundingFactor
      .mul(shortMarketOpenInterest)
      .div(longMarketOpenInterest)
      .neg();
  } else {
    longFundingRatePerSecond = fundingFactor.neg();
    shortFundingRatePerSecond = fundingFactor
      .mul(longMarketOpenInterest)
      .div(shortMarketOpenInterest);
  }

  const factorPerSecond = isLong
    ? longFundingRatePerSecond
    : shortFundingRatePerSecond;

  return factorPerSecond.mul(periodInSeconds);
}
