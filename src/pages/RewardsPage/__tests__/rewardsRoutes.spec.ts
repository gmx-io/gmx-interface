import { describe, expect, it } from "vitest";

import { getRewardsPath, getRewardsPathFromPointsPath, getRewardsTabFromPathname } from "../rewardsRoutes";

describe("Rewards routes", () => {
  it("resolves canonical tabs and the Tiers alias", () => {
    expect(getRewardsTabFromPathname("/rewards")).toBe("tiers");
    expect(getRewardsTabFromPathname("/rewards/tiers/")).toBe("tiers");
    expect(getRewardsTabFromPathname("/rewards/history")).toBe("history");
    expect(getRewardsTabFromPathname("/rewards/leaderboard")).toBe("leaderboard");
    expect(getRewardsTabFromPathname("/rewards/unknown")).toBeUndefined();
  });

  it("builds canonical Rewards paths", () => {
    expect(getRewardsPath("tiers")).toBe("/rewards");
    expect(getRewardsPath("history")).toBe("/rewards/history");
    expect(getRewardsPath("leaderboard")).toBe("/rewards/leaderboard");
  });

  it("maps every Points route to V2 and safely defaults unknown routes", () => {
    expect(getRewardsPathFromPointsPath("/points")).toBe("/rewards");
    expect(getRewardsPathFromPointsPath("/points/dashboard")).toBe("/rewards");
    expect(getRewardsPathFromPointsPath("/points/history")).toBe("/rewards/history");
    expect(getRewardsPathFromPointsPath("/points/leaderboard")).toBe("/rewards/leaderboard");
    expect(getRewardsPathFromPointsPath("/points/unknown")).toBe("/rewards");
  });
});
