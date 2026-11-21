import { describe, expect, it } from "vitest";

import { getIsRewardRouterClaimNeeded } from "../rewardsClaim";

const NO_ROUTER_REWARDS = {
  shouldClaimGmx: true,
  stakingGmxRewards: 0n,
  orphanVesterRewards: 0n,
  shouldClaimEsGmx: true,
  esGmxRewards: 0n,
  shouldClaimNativeToken: true,
  nativeTokenRewards: 0n,
};

describe("getIsRewardRouterClaimNeeded", () => {
  it.each([
    { name: "only the old vaults have GMX", rewards: {}, isNeeded: false },
    {
      name: "the Legacy vault GMX is paid by handleRewards ECO-1",
      rewards: { orphanVesterRewards: 10n ** 18n },
      isNeeded: true,
    },
    {
      name: "GMX claiming is off",
      rewards: { shouldClaimGmx: false, stakingGmxRewards: 10n ** 18n, orphanVesterRewards: 10n ** 18n },
      isNeeded: false,
    },
    { name: "esGMX rewards", rewards: { esGmxRewards: 10n ** 18n }, isNeeded: true },
  ])("$name", ({ rewards, isNeeded }) => {
    expect(getIsRewardRouterClaimNeeded({ ...NO_ROUTER_REWARDS, ...rewards })).toBe(isNeeded);
  });
});
