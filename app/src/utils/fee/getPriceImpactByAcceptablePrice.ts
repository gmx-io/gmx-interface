import { BN_NEG_ONE, BN_ONE, BN_ZERO, ONE_USD } from '@/config/constants';
import { getBasisPoints } from '@/utils/legacy/common';
import { BN } from '@coral-xyz/anchor';

export function getPriceImpactByAcceptablePrice(p: {
  sizeDeltaUsd: BN;
  acceptablePrice: BN;
  indexPrice: BN;
  isLong: boolean;
  isIncrease: boolean;
}) {
  const {
    sizeDeltaUsd,
    acceptablePrice,
    indexPrice: markPrice,
    isLong,
    isIncrease,
  } = p;

  const shouldFlipPriceDiff = isIncrease ? !isLong : isLong;

  const priceDelta = markPrice
    .sub(acceptablePrice)
    .mul(shouldFlipPriceDiff ? BN_NEG_ONE : BN_ONE);
  const acceptablePriceDeltaBps = markPrice.isZero()
    ? 0
    : getBasisPoints(priceDelta, markPrice);

  const priceImpactDeltaUsd = acceptablePrice.isZero()
    ? BN_ZERO
    : sizeDeltaUsd.mul(priceDelta).div(acceptablePrice);

  const priceImpactDeltaAmount = markPrice.isZero()
    ? BN_ZERO
    : priceImpactDeltaUsd.mul(ONE_USD).div(markPrice);

  return {
    priceImpactDeltaUsd,
    priceImpactDeltaAmount,
    priceDelta,
    acceptablePriceDeltaBps,
  };
}
