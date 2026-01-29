import { describe, expect, it } from "vitest";

import { arbitrumSdk } from "clients/v1/testUtil";

describe("Accounts", () => {
  it("should be able to get delegates", async () => {
    const delegates = await arbitrumSdk.accounts.getGovTokenDelegates();
    expect(delegates).toBeDefined();
  });
});
