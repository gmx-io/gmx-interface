import { ONE_USD } from '@/config/constants';
import { BN } from '@coral-xyz/anchor';

//position_impact_exponent = 200,000,000,000,000,000,000
//position_impact_positive_factor = 3,000,000,000
//position_impact_negative_factor = 9,000,000,000

export function applyImpactFactor(diff: BN, factor: BN, exponent: BN): BN {
  const result = diff.div(ONE_USD).pow(exponent.div(ONE_USD)).mul(factor);

  return result;
}
