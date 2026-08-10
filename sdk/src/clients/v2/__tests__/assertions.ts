import { expect } from "vitest";

/**
 * Two prepares are priced moments apart, so oracle drift moves the fee in the last digits.
 * Assert they agree well within a basis point rather than bit-for-bit.
 *
 * Lives outside testUtil because globalSetup imports that file, and importing vitest from
 * globalSetup breaks the run before any test is collected.
 */
export function expectFeesEqual(a: bigint, b: bigint): void {
  const diff = a > b ? a - b : b - a;
  expect(diff * 10_000n).toBeLessThanOrEqual(a);
}
