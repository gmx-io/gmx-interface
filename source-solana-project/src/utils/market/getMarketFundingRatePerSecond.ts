import { BN_ZERO } from '@/config/constants';
import { BN } from '@coral-xyz/anchor';

export function getMarketFundingRatePerSecond(
  longMarketOpenInterest: BN,
  shortMarketOpenInterest: BN,
  fundingFactor: BN
): { longFundingRatePerSecond: BN; shortFundingRatePerSecond: BN } {
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

  return { longFundingRatePerSecond, shortFundingRatePerSecond };
}
