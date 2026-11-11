import { describe, expect, it } from "vitest";

import { getVisibleVestVaults, parseOrphanVestingInfo } from "./vestingVaults";

const UNIT = 10n ** 18n;
const YEAR = 365n * 86400n;
const RATIO_10 = 10n ** 31n;

const orphanWith = (overrides: Partial<Record<"cap" | "balance" | "claimable", bigint>>) =>
  parseOrphanVestingInfo({
    vestingInfo: [
      overrides.balance ?? 0n,
      0n,
      overrides.claimable ?? 0n,
      0n,
      0n,
      0n,
      0n,
      overrides.cap ?? 0n,
      0n,
      YEAR,
      0n,
      RATIO_10,
    ],
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
      name: "eligible amount without a deposit yet",
      orphan: orphanWith({ cap: 10n * UNIT }),
      oldVaults: NO_POSITIONS,
      expected: ["orphan"],
    },
    {
      name: "claimable GMX left after the cap is used up",
      orphan: orphanWith({ claimable: UNIT }),
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
      name: "preview hosts show the Legacy vault before the snapshot",
      orphan: orphanWith({}),
      oldVaults: { gmx: 5n * UNIT, glp: 0n, affiliate: undefined },
      isOrphanAlwaysVisible: true,
      expected: ["orphan", "gmx"],
    },
  ])("$name", ({ orphan, oldVaults, isOrphanAlwaysVisible = false, expected }) => {
    expect(getVisibleVestVaults({ orphan, oldVaultVestedAmounts: oldVaults, isOrphanAlwaysVisible })).toEqual(expected);
  });
});
