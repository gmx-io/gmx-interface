import { BN_ZERO } from '@/config/constants';
import { calculateImpactForCrossoverRebalance } from '@/utils/fee/calculateImpactForCrossoverRebalance';
import { calculateImpactForSameSideRebalance } from '@/utils/fee/calculateImpactForSameSideRebalance';
import { BN } from '@coral-xyz/anchor';

export function getPriceImpactUsd(p: {
  currentLongUsd: BN;
  currentShortUsd: BN;
  nextLongUsd: BN;
  nextShortUsd: BN;
  factorPositive: BN;
  factorNegative: BN;
  exponentFactor: BN;
  fallbackToZero?: boolean;
}) {
  const {
    currentLongUsd,
    currentShortUsd,
    nextLongUsd,
    nextShortUsd,
    factorPositive,
    factorNegative,
    exponentFactor,
  } = p;

  if (nextLongUsd.lt(BN_ZERO) || nextShortUsd.lt(BN_ZERO)) {
    if (p.fallbackToZero) {
      return BN_ZERO;
    } else {
      throw new Error('Negative pool amount');
    }
  }

  const currentDiff = currentLongUsd.sub(currentShortUsd).abs();
  const nextDiff = nextLongUsd.sub(nextShortUsd).abs();

  const isSameSideRebalance =
    currentLongUsd.lt(currentShortUsd) === nextLongUsd.lt(nextShortUsd);

  let impactUsd: BN;

  if (isSameSideRebalance) {
    const hasPositiveImpact = nextDiff.lt(currentDiff);
    const factor = hasPositiveImpact ? factorPositive : factorNegative;

    impactUsd = calculateImpactForSameSideRebalance({
      currentDiff,
      nextDiff,
      hasPositiveImpact,
      factor,
      exponentFactor,
    });
  } else {
    impactUsd = calculateImpactForCrossoverRebalance({
      currentDiff,
      nextDiff,
      factorPositive,
      factorNegative,
      exponentFactor,
    });
  }

  return impactUsd;
}
