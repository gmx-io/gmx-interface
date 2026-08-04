import { describe, expect, it } from "vitest";

import { MaxUint256 } from "sdk/utils/numbers";

import { getPendingOneClickTokenApprovals } from "./useOneClickTokenApproval";

describe("getPendingOneClickTokenApprovals", () => {
  it("selects only tokens without an unlimited allowance and preserves address casing", () => {
    const tokenAddresses = [
      "0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa",
      "0xBbbBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbbBBbB",
      "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC",
    ];

    expect(getPendingOneClickTokenApprovals(tokenAddresses, [0n, MaxUint256, MaxUint256 - 1n])).toEqual([
      { tokenAddress: tokenAddresses[0], amount: MaxUint256 },
      { tokenAddress: tokenAddresses[2], amount: MaxUint256 },
    ]);
  });

  it("does not guess approval state before every configured allowance is loaded", () => {
    expect(getPendingOneClickTokenApprovals(["0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa"], undefined)).toEqual([]);
    expect(
      getPendingOneClickTokenApprovals(
        ["0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa", "0xBbbBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbbBBbB"],
        [0n]
      )
    ).toEqual([]);
  });
});
