import { describe, expect, it } from "vitest";

import { getVisibleVestVaults, parseOrphanVestingInfo } from "./vestingVaults";

const UNIT = 10n ** 18n;
const YEAR = 365n * 86400n;
const RATIO_10 = 10n ** 31n;

const orphanWith = ({ cap = 0n }: { cap?: bigint }) =>
  parseOrphanVestingInfo({
    vestingInfo: [0n, 0n, 0n, 0n, 0n, 0n, 0n, cap, 0n, YEAR, 0n, RATIO_10],
    trancheStartTimes: [],
  });

const NO_POSITIONS = { gmx: 0n, glp: 0n, affiliate: 0n };

describe("parseOrphanVestingInfo", () => {
  it("splits the session into converted and deposited amounts and ends a year after the last tranche", () => {
    // balance 70 still includes 5 pending conversion; 30 settled, 10 claimed, 2 unpaid from a withdrawn session
    const data = parseOrphanVestingInfo({
      vestingInfo: [
        ...[70n, 700n, 27n, 30n, 10n, 2n, 50n, 200n].map((amount) => amount * UNIT),
        2n,
        YEAR,
        0n,
        RATIO_10,
      ],
      trancheStartTimes: [1_000n, 5_000n],
    });

    expect(data).toEqual({
      eligibleAmount: 200n * UNIT,
      usedAmount: 120n * UNIT,
      depositedAmount: 100n * UNIT,
      convertedAmount: 35n * UNIT,
      reservedAmount: 700n * UNIT,
      claimableAmount: 27n * UNIT,
      pairRatioFactor: RATIO_10,
      vestingDuration: YEAR,
      vestingEndTime: 5_000n + YEAR,
    });
  });
});

describe("getVisibleVestVaults", () => {
  it.each([
    { name: "before the vesting data loads", orphan: undefined, oldVaults: NO_POSITIONS, expected: ["gmx"] },
    {
      name: "Legacy vault without an eligible amount",
      orphan: orphanWith({}),
      oldVaults: NO_POSITIONS,
      expected: ["orphan"],
    },
    {
      name: "old vaults show only while they hold a position",
      orphan: orphanWith({ cap: 10n * UNIT }),
      oldVaults: { gmx: 5n * UNIT, glp: 2n * UNIT, affiliate: 0n },
      expected: ["orphan", "gmx", "glp"],
    },
    {
      name: "chain without the Legacy vault",
      orphan: undefined,
      oldVaults: { gmx: 0n, glp: undefined, affiliate: 3n * UNIT },
      expected: ["affiliate"],
    },
  ])("$name", ({ orphan, oldVaults, expected }) => {
    expect(getVisibleVestVaults({ orphan, oldVaultVestedAmounts: oldVaults })).toEqual(expected);
  });
});
