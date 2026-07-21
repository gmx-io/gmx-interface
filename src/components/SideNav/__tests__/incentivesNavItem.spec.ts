import { describe, expect, it } from "vitest";

import { ARBITRUM, AVALANCHE } from "config/chains";

import { resolveIncentivesNavItem } from "../incentivesNavItem";

describe("resolveIncentivesNavItem", () => {
  it("shows Rewards on Arbitrum without consulting a release flag or config", () => {
    expect(resolveIncentivesNavItem(ARBITRUM)).toEqual({
      key: "rewards",
      to: "/rewards",
    });
  });

  it("hides Rewards outside Arbitrum", () => {
    expect(resolveIncentivesNavItem(AVALANCHE)).toBeUndefined();
  });
});
