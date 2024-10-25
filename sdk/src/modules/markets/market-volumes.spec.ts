import { ARBITRUM } from "configs/chains";
import { GmxSdk } from "../../index";

describe("Markets' volumes", () => {
  const sdk = new GmxSdk({
    chainId: ARBITRUM,
    account: "0x9f7198eb1b9Ccc0Eb7A07eD228d8FbC12963ea33",
    oracleUrl: "https://arbitrum-api.gmxinfra.io",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
  });

  it("should be able to get daily volumes", async () => {
    const response = await sdk.markets.getDailyVolumes();
    expect(response).toBeDefined();
    const markets = await sdk.markets.getMarkets();
    expect(response).toEqual(markets.marketsAddresses?.reduce((acc, market) => ({ ...acc, [market]: 300n }), {}));
  });
});
