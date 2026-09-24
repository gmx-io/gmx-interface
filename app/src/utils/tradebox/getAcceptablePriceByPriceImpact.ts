import { BN_NEG_ONE, BN_ONE, BN_ZERO } from '@/config/constants';
import { getBasisPoints } from '@/utils/legacy/common';
import { BN } from '@coral-xyz/anchor';

export function getAcceptablePriceByPriceImpact(p: {
  isIncrease: boolean;
  isLong: boolean;
  indexPrice: BN;
  sizeDeltaUsd: BN;
  priceImpactDeltaUsd: BN;
}): {
  acceptablePrice: BN;
  acceptablePriceDeltaBps: number;
  priceDelta: BN;
} {
  const { indexPrice, sizeDeltaUsd, priceImpactDeltaUsd } = p;

  if (sizeDeltaUsd.lte(BN_ZERO) || indexPrice.isZero()) {
    return {
      acceptablePrice: indexPrice,
      acceptablePriceDeltaBps: 0,
      priceDelta: BN_ZERO,
    };
  }

  const shouldFlipPriceImpact = getShouldUseMaxPrice(p.isIncrease, p.isLong);

  const priceImpactForPriceAdjustment = shouldFlipPriceImpact
    ? priceImpactDeltaUsd.neg()
    : priceImpactDeltaUsd;
  const acceptablePrice = indexPrice
    .mul(sizeDeltaUsd.add(priceImpactForPriceAdjustment))
    .div(sizeDeltaUsd);

  const priceDelta = indexPrice
    .sub(acceptablePrice)
    .mul(shouldFlipPriceImpact ? BN_ONE : BN_NEG_ONE);
  const acceptablePriceDeltaBps = getBasisPoints(priceDelta, p.indexPrice);
  return {
    acceptablePrice,
    acceptablePriceDeltaBps,
    priceDelta,
  };
}

function getShouldUseMaxPrice(isIncrease: boolean, isLong: boolean) {
  return isIncrease ? isLong : !isLong;
}
