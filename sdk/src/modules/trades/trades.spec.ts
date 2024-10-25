import { ARBITRUM } from "configs/chains";
import { GmxSdk } from "../../index";

describe("Trades", () => {
  const sdk = new GmxSdk({
    chainId: ARBITRUM,
    account: "0x9f7198eb1b9Ccc0Eb7A07eD228d8FbC12963ea33",
    oracleUrl: "https://arbitrum-api.gmxinfra.io",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
  });

  it("should be able to get positions", async () => {
    const { marketsInfoData, tokensData } = await sdk.markets.getMarketsInfo();

    const trades = await sdk.trades.getTradeHistory({
      forAllAccounts: false,
      pageSize: 50,
      marketsInfoData,
      tokensData,
      pageIndex: 0,
    });

    expect(trades).toBeDefined();
  });
});
