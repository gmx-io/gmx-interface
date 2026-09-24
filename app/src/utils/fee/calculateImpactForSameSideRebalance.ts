import { applyImpactFactor } from '@/utils/fee/applyImpactFactor';
import { BN } from '@coral-xyz/anchor';

export function calculateImpactForSameSideRebalance(p: {
  currentDiff: BN;
  nextDiff: BN;
  hasPositiveImpact: boolean;
  factor: BN;
  exponentFactor: BN;
}) {
  const { currentDiff, nextDiff, hasPositiveImpact, factor, exponentFactor } =
    p;

  const currentImpact = applyImpactFactor(currentDiff, factor, exponentFactor);
  const nextImpact = applyImpactFactor(nextDiff, factor, exponentFactor);

  const deltaDiff = currentImpact.sub(nextImpact).abs();

  return hasPositiveImpact ? deltaDiff : deltaDiff.neg();
}
