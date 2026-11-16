import { describe, expect, it } from "vitest";

import { compareLeaderboardValues, getLeaderboardRealizedPnl } from "./shared";

describe("getLeaderboardRealizedPnl", () => {
  const account = {
    realizedPnl: 1_000n,
    realizedFees: 100n,
    realizedSwapFees: 20n,
    realizedPriceImpact: -30n,
    realizedSwapImpact: 40n,
    positiveFundingFeesUsd: 10n,
  };

  it("returns gross realized PnL when fees and price impact are excluded", () => {
    expect(getLeaderboardRealizedPnl(account, false)).toBe(1_000n);
  });

  it("includes all realized fees, impacts, and positive funding in net PnL", () => {
    expect(getLeaderboardRealizedPnl(account, true)).toBe(900n);
  });
});

describe("compareLeaderboardValues", () => {
  it.each(["asc", "desc"] as const)("returns zero for equal bigint and number values in %s order", (direction) => {
    expect(compareLeaderboardValues(1n, 1n, direction)).toBe(0);
    expect(compareLeaderboardValues(1, 1, direction)).toBe(0);
  });

  it("sorts bigint and number values in the requested direction", () => {
    expect(compareLeaderboardValues(2n, 1n, "desc")).toBe(-1);
    expect(compareLeaderboardValues(2n, 1n, "asc")).toBe(1);
    expect(compareLeaderboardValues(2, 1, "desc")).toBe(-1);
    expect(compareLeaderboardValues(2, 1, "asc")).toBe(1);
  });
});
