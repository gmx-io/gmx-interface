import { describe, expect, it } from "vitest";

import { ARBITRUM, AVALANCHE } from "config/chains";

import { buildAccountDashboardUrl } from "./buildAccountDashboardUrl";

const ACCOUNT = "0x8446ea6eA4f7bECCe4b9dBC5c61Ce1e9Cd25f22f";

describe("buildAccountDashboardUrl", () => {
  it("builds the trader activity url when there is no account", () => {
    expect(buildAccountDashboardUrl(undefined, ARBITRUM, 2)).toBe("/traders?network=arbitrum&v=2");
  });

  it("builds the trader profile url when there is an account", () => {
    expect(buildAccountDashboardUrl(ACCOUNT, AVALANCHE, 1)).toBe(`/traders/${ACCOUNT}?network=avalanche&v=1`);
  });

  it("omits the network without a chain and falls back to v2 without a version", () => {
    expect(buildAccountDashboardUrl(ACCOUNT, undefined)).toBe(`/traders/${ACCOUNT}?v=2`);
  });
});
