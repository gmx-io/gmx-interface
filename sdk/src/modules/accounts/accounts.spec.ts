import { arbitrumSdk } from "utils/test";

describe("Accounts", () => {
  it("should be able to get delegates", async () => {
    const delegates = await arbitrumSdk.accounts.getGovTokenDelegates();
    expect(delegates).toBeDefined();
  });
});
