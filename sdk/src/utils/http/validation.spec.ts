import { expect, it } from "vitest";

import { readApiUnsignedBigInt } from "./validation";

it("reads unsigned API amounts without losing precision or accepting coercible values", () => {
  const name = "amount";
  const endpoint = "/v1/example";
  const largeAmount = 1n << 256n;
  const accepted: [unknown, bigint][] = [
    ["0", 0n],
    ["000123", 123n],
    [largeAmount.toString(), largeAmount],
    [0, 0n],
    [-0, 0n],
    [Number.MAX_SAFE_INTEGER, BigInt(Number.MAX_SAFE_INTEGER)],
  ];
  for (const [value, expected] of accepted) {
    expect(readApiUnsignedBigInt({ record: { amount: value }, name, endpoint })).toBe(expected);
  }
  for (const value of [
    undefined,
    null,
    true,
    false,
    "",
    " ",
    " 1",
    "1 ",
    "+1",
    "-1",
    "1.0",
    "1e3",
    "0x10",
    -1,
    1.5,
    NaN,
    Infinity,
    Number.MAX_SAFE_INTEGER + 1,
    0n,
    [],
    {},
  ]) {
    expect(() => readApiUnsignedBigInt({ record: { amount: value }, name, endpoint })).toThrow(
      '/v1/example: expected bigint field "amount"'
    );
  }
});
