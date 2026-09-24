import { getBasisPoints } from '@/utils/legacy/common';
import { BN } from '@coral-xyz/anchor';

export function getMarketOpenInterestPercentage(
  marketOpenInterest: BN,
  totalMarketOpenInterest: BN
): number {
  const basisPoints = getBasisPoints(
    marketOpenInterest,
    totalMarketOpenInterest,
    true
  );
  return Math.round(basisPoints / 100) * 100;
}
