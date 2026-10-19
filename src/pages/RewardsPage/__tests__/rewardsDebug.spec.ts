import { describe, expect, it } from "vitest";

import { getRewardsDebugMode } from "../rewardsDebug";

describe("getRewardsDebugMode", () => {
  it.each([
    "loading",
    "error",
    "empty",
    "banners",
    "vesting-idle",
    "vesting-active",
    "vesting-complete",
    "vesting-error",
    "vesting-loading",
  ] as const)("returns the %s fixture in development", (mode) => {
    expect(getRewardsDebugMode(`?rewardsDebug=${mode}`, true)).toBe(mode);
  });

  it("ignores unknown fixture names", () => {
    expect(getRewardsDebugMode("?rewardsDebug=unknown", true)).toBeUndefined();
  });

  it("ignores debug fixtures in production", () => {
    expect(getRewardsDebugMode("?rewardsDebug=error", false)).toBeUndefined();
  });
});
