import { BigNumber } from "ethers";

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
  from: BigNumber,
  to: BigNumber,
  delta: BigNumber,
  validator: (x: BigNumber) => { isValid: boolean; returnValue: T }
) {
  if (delta.lte(0)) delta = BigInt(1);

  to = to.add(1);

  let returnValue: T | undefined = undefined;
  let prevMid: BigNumber | undefined = undefined;

  while (from.lt(to)) {
    const mid = from.add(to).div(2);

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
