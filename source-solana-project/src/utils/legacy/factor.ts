import {
  FUNDING_AMOUNT_PER_SIZE_ADJUSTMENT,
  ONE_USD,
} from '@/config/constants';
import { BN } from '@coral-xyz/anchor';
import { BN_ZERO } from '@solana/spl-governance/lib/tools/numbers';

/**
 * Applies a factor to a value, using ONE_USD as the base unit
 * The factor is assumed to be in ONE_USD units (1.0 = ONE_USD)
 * @param value The value to apply the factor to
 * @param factor The factor to apply (in ONE_USD units)
 * @returns The value multiplied by the factor, divided by ONE_USD
 */
export function applyFactor(value: BN, factor: BN): BN {
  // First multiply by factor, then divide by ONE_USD to normalize
  return value.mul(factor).div(ONE_USD);
}

/**
 * Converts a division into a factor using ONE_USD as the base unit
 * For example, if numerator/denominator = 2, the result will be 2 * ONE_USD
 * @param numerator The numerator of the division
 * @param denominator The denominator of the division
 * @returns The factor in ONE_USD units, or zero if denominator is zero
 */
export function divToFactor(numerator: BN, denominator: BN): BN {
  if (denominator.isZero()) {
    return BN_ZERO;
  }
  return numerator.mul(ONE_USD).div(denominator);
}

/**
 * Unpacks a factor by applying it to a value and adjusting by both
 * FUNDING_AMOUNT_PER_SIZE_ADJUSTMENT and ONE_USD
 * @param value The value to apply the factor to
 * @param factor The factor to apply
 * @returns The unpacked value after applying the factor and adjustments
 */
export function unpackFactor(value: BN, factor: BN): BN {
  return value.mul(factor).div(FUNDING_AMOUNT_PER_SIZE_ADJUSTMENT).div(ONE_USD);
}
