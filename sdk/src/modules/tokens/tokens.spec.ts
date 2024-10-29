import { arbitrumSdk } from "utils/test";

describe("Tokens", () => {
  it("should be able to fetch tokens", async () => {
    const response = await arbitrumSdk.oracle.getTokens();
    expect(response).toBeDefined();
  });

  it("should be able to get tokens balances", async () => {
    const response = await arbitrumSdk.tokens.getTokensBalances();
    expect(response).toBeDefined();
  });

  it("should be able to get tokens prices", async () => {
    const response = await arbitrumSdk.tokens.getTokenRecentPrices();
    expect(response).toBeDefined();
  });

  it.only("should be able to get tokens data", async () => {
    const response = await arbitrumSdk.tokens.getTokensData();
    expect(response).toBeDefined();
  });
});
