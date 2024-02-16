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
