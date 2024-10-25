import { ARBITRUM } from "configs/chains";
import { GmxSdk } from "../../index";

describe("Accounts", () => {
  const sdk = new GmxSdk({
    chainId: ARBITRUM,
    account: "0x9f7198eb1b9Ccc0Eb7A07eD228d8FbC12963ea33",
    oracleUrl: "https://arbitrum-api.gmxinfra.io",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
  });

  it("should be able to get delegates", async () => {
    const delegates = await sdk.accounts.getGovTokenDelegates();
    expect(delegates).toBeDefined();
  });
});
