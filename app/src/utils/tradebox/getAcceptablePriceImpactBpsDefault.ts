import { BN_ZERO } from '@/config/constants';
import { DEFAULT_ACCEPABLE_PRICE_IMPACT_BUFFER } from '@/config/factors';
import { getAcceptablePriceByPriceImpact } from '@/utils/tradebox/getAcceptablePriceByPriceImpact';
import { BN } from '@coral-xyz/anchor';

export function getAcceptablePriceImpactBpsDefault(p: {
  isIncrease: boolean;
  isLong: boolean;
  indexPrice: BN;
  sizeDeltaUsd: BN;
  priceImpactDeltaUsd: BN;
  acceptablePriceImapctBuffer?: number;
}) {
  const {
    indexPrice,
    sizeDeltaUsd,
    priceImpactDeltaUsd,
    acceptablePriceImapctBuffer = DEFAULT_ACCEPABLE_PRICE_IMPACT_BUFFER,
  } = p;

  if (priceImpactDeltaUsd.gt(BN_ZERO)) {
    return acceptablePriceImapctBuffer;
  }

  const baseAcceptablePriceValues = getAcceptablePriceByPriceImpact({
    isIncrease: p.isIncrease,
    isLong: p.isLong,
    indexPrice,
    sizeDeltaUsd,
    priceImpactDeltaUsd,
  });

  if (baseAcceptablePriceValues.acceptablePriceDeltaBps <= 0) {
    return (
      Math.abs(baseAcceptablePriceValues.acceptablePriceDeltaBps) +
      acceptablePriceImapctBuffer
    );
  }

  return acceptablePriceImapctBuffer;
}
