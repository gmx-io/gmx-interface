import { BN } from '@coral-xyz/anchor';

export function getNextPositionExecutionPrice(p: {
  triggerPrice: BN;
  priceImpactUsd: BN;
  sizeDeltaUsd: BN;
  isLong: boolean;
  isIncrease: boolean;
}): BN | null {
  if (p.sizeDeltaUsd.isZero()) {
    return null;
  }

  const adjustedPriceImpactUsd = p.isIncrease
    ? p.isLong
      ? p.priceImpactUsd.neg()
      : p.priceImpactUsd
    : p.isLong
      ? p.priceImpactUsd
      : p.priceImpactUsd.neg();

  const adjustment = p.triggerPrice
    .mul(adjustedPriceImpactUsd)
    .div(p.sizeDeltaUsd);
  return p.triggerPrice.add(adjustment);
}
