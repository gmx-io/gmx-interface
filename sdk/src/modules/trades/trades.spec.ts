import { arbitrumSdk } from "utils/test";

describe("Trades", () => {
  it("should be able to get positions", async () => {
    const { marketsInfoData, tokensData } = await arbitrumSdk.markets.getMarketsInfo();

    const trades = await arbitrumSdk.trades.getTradeHistory({
      forAllAccounts: false,
      pageSize: 50,
      marketsInfoData,
      tokensData,
      pageIndex: 0,
    });

    expect(trades).toBeDefined();
  });
});
