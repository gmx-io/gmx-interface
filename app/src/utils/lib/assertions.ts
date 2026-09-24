// assertions

/**
 * Throws an error if the provided value is never.
 * @param {never} x - The value that must never exist.
 * @returns {never} Always throws an error.
 */
export const mustNeverExist = (x: never): never => {
  throw new Error(`Must never exist: ${String(x)}`);
};

/**
 * Throws an error if the provided value is undefined.
 * @param {T | undefined} x - The value to check.
 * @returns {T} The value if it is defined.
 */
export const assertDefined = <T>(x: T | undefined): T => {
  if (x === undefined) throw new Error(`Expected defined value, got undefined`);
  return x;
};

/**
 * Throws an error if the provided value is undefined or null.
 * @param {T} value - The value to check.
 * @returns {void}
 */
export function definedOrThrow<T>(value: T): asserts value is NonNullable<T> {
  if (value === undefined || value === null) {
    throw new Error('Item is null or undefined');
  }
}

/**
 * Checks if the provided value is defined and not null.
 * @param {T} value - The value to check.
 * @returns {boolean} True if the value is defined and not null, false otherwise.
 */
export function defined<T>(value: T): value is NonNullable<T> {
  return value !== undefined && value !== null;
}
