import { describe, expect, it } from "vitest";

import { parseRatioVestingResponse } from "./ratioVestingData";

function result() {
  return {
    data: {
      gmx: { balance: { returnValues: [11n] } },
      esGmx: { balance: { returnValues: [22n] }, allowance: { returnValues: [100n] } },
      pairToken: { balance: { returnValues: [33n] }, allowance: { returnValues: [500n] } },
      vester: { isFrozen: { returnValues: [false] }, isIssuerBindingConfirmed: { returnValues: [true] } },
      reader: {
        vesting: { returnValues: [100n, 500n, 22n, 20n, 15n, 7n, 80n, 200n, 1n, 365n, 0n, 5n * 10n ** 30n] },
        issuer: { returnValues: [100n, 50n, 50n, 100n, 50n] },
        tranches: { returnValues: [[100n], [120n], [20n]] },
      },
    },
  };
}

describe("ratio vesting data", () => {
  it("separates the current vesting position from lifetime cap usage and unpaid claims", () => {
    const parsed = parseRatioVestingResponse(result() as any);
    expect(parsed.claimableEsGmxRewards).toBe(50n);
    expect(parsed.freePairAmount).toBe(33n);
    expect(parsed.vestingInfo.vestedAmount).toBe(120n);
    expect(parsed.vestingInfo.maxVestableAmount).toBe(200n);
    expect(parsed.ratioVesting).toEqual({
      capUsedAmount: 180n,
      unpaidClaimAmount: 7n,
      deactivatedAt: 0n,
      pairRatioFactor: 5n * 10n ** 30n,
      isFrozen: false,
      isIssuerBindingConfirmed: true,
      esTokenAllowance: 100n,
      pairTokenAllowance: 500n,
      tranches: [{ startTime: 100n, totalAmount: 120n, convertedAmount: 20n }],
    });
  });

  it("fails closed when the reader or token allowances are incomplete", () => {
    const missingAllowance = result();
    missingAllowance.data.esGmx.allowance.returnValues = [];
    expect(() => parseRatioVestingResponse(missingAllowance as any)).toThrow("Incomplete ratio vesting response");
    const missingTranche = result();
    missingTranche.data.reader.tranches.returnValues[1] = [];
    expect(() => parseRatioVestingResponse(missingTranche as any)).toThrow("Incomplete ratio vesting response");
  });
});
