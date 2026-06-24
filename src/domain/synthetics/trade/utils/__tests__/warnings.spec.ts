import { describe, expect, it } from "vitest";

import type { FeeItem } from "sdk/utils/fees/types";

import { getIsHighSwapProfitFee } from "../warnings";

function fee(deltaUsd: bigint, bps: bigint): FeeItem {
  return { deltaUsd, bps, precisePercentage: bps };
}

describe("getIsHighSwapProfitFee", () => {
  it("is true for a cost at exactly the threshold", () => {
    expect(getIsHighSwapProfitFee(fee(-5n, -100n))).toBe(true);
  });

  it("is true for a cost above the threshold", () => {
    expect(getIsHighSwapProfitFee(fee(-5n, -250n))).toBe(true);
  });

  it("is false below the threshold", () => {
    expect(getIsHighSwapProfitFee(fee(-5n, -99n))).toBe(false);
  });

  it("is false when the fee is not a cost (deltaUsd >= 0)", () => {
    expect(getIsHighSwapProfitFee(fee(5n, -250n))).toBe(false);
  });

  it("is false when undefined", () => {
    expect(getIsHighSwapProfitFee(undefined)).toBe(false);
  });
});
