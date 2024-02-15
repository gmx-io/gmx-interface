export function numericBinarySearch<T>(
  from: number,
  to: number,
  validator: (x: number) => { isValid: boolean; returnValue: T }
) {
  let returnValue: T | undefined = undefined;

  while (from < to) {
    const mid = Math.floor((from + to) / 2);
    const { isValid, returnValue: v } = validator(mid);
    if (isValid) {
      returnValue = v;
      from = mid;
    } else {
      to = mid - 1;
    }
  }

  return { result: from, returnValue };
}
