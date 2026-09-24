import { BN_TWO, BN_ZERO } from '@/config/constants';
import { BN_ONE } from '@/config/constants';
import { BN } from '@coral-xyz/anchor';

/**
 * Performs a binary search on a numeric range
 * @param from Starting number
 * @param to Ending number (inclusive)
 * @param validator Function that validates each mid point and returns validity status and optional value
 * @returns The search result and optional return value
 */
export function numericBinarySearch<T>(
  from: number,
  to: number,
  validator: (x: number) => { isValid: boolean; returnValue: T }
): { result: number; returnValue: T | undefined } {
  to = to + 1;
  let returnValue: T | undefined = undefined;

  while (from < to) {
    const mid = Math.floor((from + to) / 2);

    if (from === mid) {
      break;
    }

    const { isValid, returnValue: v } = validator(mid);

    if (isValid) {
      returnValue = v;
      from = mid;
    } else {
      to = mid;
    }
  }

  return { result: from, returnValue };
}

/**
 * Performs a binary search using BN (Big Number) values
 * @param from Starting BN value
 * @param to Ending BN value (inclusive)
 * @param delta Minimum difference between iterations (defaults to 1)
 * @param validator Function that validates each mid point and returns validity status and optional value
 * @returns The search result and optional return value
 */
export function bnBinarySearch<T>(
  from: BN,
  to: BN,
  delta: BN,
  validator: (x: BN) => { isValid: boolean; returnValue: T }
): { result: BN; returnValue: T | undefined } {
  if (delta.lte(BN_ZERO)) {
    delta = BN_ONE;
  }

  to = to.add(BN_ONE);

  let returnValue: T | undefined = undefined;
  let prevMid: BN | undefined = undefined;

  while (from.lt(to)) {
    const mid = from.add(to.sub(from).div(BN_TWO));

    if (from.eq(mid)) {
      break;
    }

    if (prevMid && mid.sub(prevMid).abs().lt(delta)) {
      break;
    }

    const { isValid, returnValue: v } = validator(mid);

    if (isValid) {
      returnValue = v;
      from = mid;
    } else {
      to = mid;
    }

    prevMid = mid;
  }

  return { result: from, returnValue };
}
