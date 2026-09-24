const BASE58_REGEX =
  /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/;

/**
 * Validates if a string contains only base58 characters
 * Base58 excludes: 0 (zero), O (capital o), I (capital i), l (lower case L)
 */
export function isValidBase58(str: string): boolean {
  return BASE58_REGEX.test(str);
}
