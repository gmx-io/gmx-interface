import { describe, expect, it } from "vitest";

import { arbitrumSdk } from "clients/v1/testUtil";

describe("Trades", () => {
  it("should be able to get positions", { timeout: 90_000 }, async () => {
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
