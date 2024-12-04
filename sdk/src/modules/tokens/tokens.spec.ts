import { GmxSdk } from "../..";
import { arbitrumSdk, arbitrumSdkConfig } from "utils/testUtil";

describe("Tokens", () => {
  it("should be able to fetch tokens", async () => {
    const response = await arbitrumSdk.oracle.getTokens();
    expect(response).toBeDefined();
  });

  it("should respect passed config", async () => {
    const ARB = "0x912CE59144191C1204E64559FE8253a0e49E6548";
    const sdk = new GmxSdk({
      ...arbitrumSdkConfig,
      tokens: {
        [ARB]: {
          symbol: "testARB",
        },
      },
    });

    const data = await sdk.tokens.getTokensData();

    expect(sdk.tokens.tokensConfig[ARB]?.symbol).toBe("testARB");
    expect(data.tokensData?.[ARB].symbol).toBe("testARB");
  });

  it("should be able to get tokens data", async () => {
    const response = await arbitrumSdk.tokens.getTokensData();
    expect(response).toBeDefined();
  });
});
