import { applyImpactFactor } from '@/utils/fee/applyImpactFactor';
import { BN } from '@coral-xyz/anchor';

export function calculateImpactForCrossoverRebalance(p: {
  currentDiff: BN;
  nextDiff: BN;
  factorPositive: BN;
  factorNegative: BN;
  exponentFactor: BN;
}) {
  const {
    currentDiff,
    nextDiff,
    factorNegative,
    factorPositive,
    exponentFactor,
  } = p;

  const positiveImpact = applyImpactFactor(
    currentDiff,
    factorPositive,
    exponentFactor
  );
  const negativeImpact = applyImpactFactor(
    nextDiff,
    factorNegative,
    exponentFactor
  );

  const deltaDiffUsd = positiveImpact.sub(negativeImpact).abs();

  return positiveImpact.gt(negativeImpact) ? deltaDiffUsd : deltaDiffUsd.neg();
}
