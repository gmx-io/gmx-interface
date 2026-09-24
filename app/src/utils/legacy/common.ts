import { BASIS_POINTS_DIVISOR_BN, ONE_USD } from '@/config/constants';
import {
  MAX_EXCEEDING_THRESHOLD,
  MIN_EXCEEDING_THRESHOLD_SCALE,
} from '@/config/factors';
import { TRIGGER_PREFIX_ABOVE, TRIGGER_PREFIX_BELOW } from '@/config/ui';
import { expandDecimals } from '@/utils/legacy/decimals';
import { BN } from '@coral-xyz/anchor';
import { toBN } from 'gmsol';

export function getUnit(decimals: number): BN {
  return new BN(10).pow(new BN(decimals));
}

export function getBasisPoints(
  numerator: BN,
  denominator: BN,
  shouldRoundUp = false
): number {
  if (denominator.isZero()) {
    return 0;
  }

  // Use string conversion to avoid precision loss
  const result = numerator.mul(BASIS_POINTS_DIVISOR_BN).div(denominator);

  if (shouldRoundUp) {
    const remainder = numerator.mul(BASIS_POINTS_DIVISOR_BN).mod(denominator);
    if (!remainder.isZero()) {
      const adjustedResult = result.isNeg()
        ? result.sub(new BN(1))
        : result.add(new BN(1));
      const resultStr = adjustedResult.toString();
      if (resultStr.length > 15) {
        return result.isNeg()
          ? -Number.MAX_SAFE_INTEGER
          : Number.MAX_SAFE_INTEGER;
      }
      return Number(resultStr);
    }
  }

  const resultStr = result.toString();
  // If the result is too large, return a safe maximum value
  if (resultStr.length > 15) {
    // 2^53 is approximately 15 digits
    return result.isNeg() ? -Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER;
  }

  return Number(resultStr);
}

export function getLimitedDisplay(
  amount: BN,
  tokenDecimals: number,
  opts: {
    maxThreshold?: string;
    minThresholdScale?: number;
    minThreshold?: string;
  } = {}
) {
  const {
    maxThreshold = MAX_EXCEEDING_THRESHOLD,
    minThresholdScale = MIN_EXCEEDING_THRESHOLD_SCALE,
    minThreshold = '0',
  } = opts;
  const max = expandDecimals(new BN(maxThreshold), tokenDecimals);
  const min = new BN(minThreshold).mul(
    toBN(10).pow(toBN(tokenDecimals - minThresholdScale))
  );
  const absAmount = amount.abs();

  if (absAmount.isZero()) {
    return {
      symbol: '',
      value: absAmount,
    };
  }

  const symbol = absAmount.gt(max)
    ? TRIGGER_PREFIX_ABOVE
    : absAmount.lt(min)
      ? TRIGGER_PREFIX_BELOW
      : '';
  const value = absAmount.gt(max) ? max : absAmount.lt(min) ? min : absAmount;

  return {
    symbol,
    value,
  };
}

export function getPlusOrMinusSymbol(
  value?: BN | number | undefined,
  opts: { showPlusForZero?: boolean } = {}
): string {
  if (!value) {
    return '';
  }
  const { showPlusForZero = false } = opts;
  if (typeof value === 'number') {
    return value === 0 ? (showPlusForZero ? '+' : '') : value < 0 ? '-' : '+';
  }
  return value.isZero()
    ? showPlusForZero
      ? '+'
      : ''
    : value.isNeg()
      ? '-'
      : '+';
}

export function getPositiveOrNegativeClass(
  value?: BN | undefined,
  zeroValue: '' | 'text-red-500' | 'text-green-500' = ''
): string {
  if (!value) {
    return '';
  }

  return value.isZero()
    ? zeroValue
    : value.isNeg()
      ? 'text-red-500'
      : 'text-green-500';
}

export function getPriceDecimals(price?: BN | undefined): number {
  if (price === undefined || price?.isZero()) return 2;
  if (price?.gte(ONE_USD.mul(toBN(1000000)))) return 0;
  if (price?.gte(ONE_USD.mul(toBN(100000)))) return 1;
  if (price?.gte(ONE_USD.mul(toBN(1000)))) return 2;
  if (price?.gte(ONE_USD.mul(toBN(100)))) return 3;
  // if (price?.gte(ONE_USD.mul(toBN(10)))) return 4;
  if (price?.gte(ONE_USD)) return 4;
  if (price?.gte(ONE_USD.div(toBN(10)))) return 5;
  if (price?.gte(ONE_USD.div(toBN(100)))) return 6;
  if (price?.gte(ONE_USD.div(toBN(1000)))) return 7;
  if (price?.gte(ONE_USD.div(toBN(10000)))) return 8;
  return 9;
}
