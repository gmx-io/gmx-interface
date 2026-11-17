import { describe, expect, it } from "vitest";

import { getProtocolStatsFeesWindows, parseProtocolStatsUsd } from "./utils";

describe("parseProtocolStatsUsd", () => {
  it("parses a 30-decimal USD string into a bigint", () => {
    expect(parseProtocolStatsUsd("1500000000000000000000000000000")).toBe(1_500_000_000_000_000_000_000_000_000_000n);
  });

  it("treats an unknown or pending value as absent", () => {
    expect(parseProtocolStatsUsd(null)).toBeUndefined();
    expect(parseProtocolStatsUsd(undefined)).toBeUndefined();
  });
});

describe("getProtocolStatsFeesWindows", () => {
  const DAY = 86_400;
  const day = (n: number) => 1_799_971_200 + n * DAY;
  const usd = (n: number) => (BigInt(n) * 10n ** 30n).toString();
  const points = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ day: day(n), value: usd(1), provisional: n === 8 }));

  it("sums the days from the epoch start and from a week ago, the open day included", () => {
    const windows = getProtocolStatsFeesWindows(points, {
      epochStartedTimestamp: day(4),
      weekAgoTimestamp: day(1) + 3600,
    });

    expect(windows).toEqual({ epochFees: BigInt(usd(5)), weeklyFees: BigInt(usd(7)) });
  });

  it("skips the days a source has not reported", () => {
    const windows = getProtocolStatsFeesWindows([...points, { day: day(9), value: null, provisional: true }], {
      epochStartedTimestamp: day(9),
      weekAgoTimestamp: day(9),
    });

    expect(windows).toEqual({ epochFees: 0n, weeklyFees: 0n });
  });
});
