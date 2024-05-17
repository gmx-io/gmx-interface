import { bigMath } from "./bigmath";

export function numericBinarySearch<T>(
  from: number,
  to: number,
  validator: (x: number) => { isValid: boolean; returnValue: T }
) {
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

export function bigNumberBinarySearch<T>(
  from: bigint,
  to: bigint,
  delta: bigint,
  validator: (x: bigint) => { isValid: boolean; returnValue: T }
) {
  if (delta <= 0) delta = BigInt(1);

  to = to + 1n;

  let returnValue: T | undefined = undefined;
  let prevMid: bigint | undefined = undefined;

  while (from < to) {
    const mid = (from + to) / 2n;

    if (from === mid) {
      break;
    }

    if (prevMid !== undefined && bigMath.abs(mid - prevMid) < delta) {
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
