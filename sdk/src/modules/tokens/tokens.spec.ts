import { ARBITRUM } from "configs/chains";
import { GmxSdk } from "../../index";

describe("Tokens", () => {
  const sdk = new GmxSdk({
    chainId: ARBITRUM,
    account: "0x9f7198eb1b9Ccc0Eb7A07eD228d8FbC12963ea33",
    oracleUrl: "https://arbitrum-api.gmxinfra.io",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
  });

  it("should be able to fetch tokens", async () => {
    const response = await sdk.oracle.getTokens();
    expect(response).toBeDefined();
  });

  it("should be able to get tokens balances", async () => {
    const response = await sdk.tokens.getTokensBalances();
    expect(response).toBeDefined();
  });

  it("should be able to get tokens prices", async () => {
    const response = await sdk.tokens.getTokenRecentPrices();
    expect(response).toBeDefined();
  });

  it.only("should be able to get tokens data", async () => {
    const response = await sdk.tokens.getTokensData();
    expect(response).toBeDefined();
  });
});
