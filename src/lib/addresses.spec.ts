import { describe, expect, it } from "vitest";

import { isSameAddress, isSameAddressArray } from "./addresses";

describe("isSameAddress", () => {
  it("compares addresses case-insensitively", () => {
    expect(
      isSameAddress("0xAbC1111111111111111111111111111111111111", "0xabc1111111111111111111111111111111111111")
    ).toBe(true);
    expect(
      isSameAddress("0xAbC1111111111111111111111111111111111111", "0xabc2222222222222222222222222222222222222")
    ).toBe(false);
  });

  it("does not throw on undefined or malformed values", () => {
    expect(isSameAddress(undefined, "0xabc1111111111111111111111111111111111111")).toBe(false);
    expect(isSameAddress("not-an-address", "0xabc1111111111111111111111111111111111111")).toBe(false);
  });
});

describe("isSameAddressArray", () => {
  it("compares arrays element-wise and by length", () => {
    expect(
      isSameAddressArray(["0xAbC1111111111111111111111111111111111111"], ["0xabc1111111111111111111111111111111111111"])
    ).toBe(true);
    expect(isSameAddressArray([], ["0xabc1111111111111111111111111111111111111"])).toBe(false);
  });
});
