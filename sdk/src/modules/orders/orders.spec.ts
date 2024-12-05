import { arbitrumSdk } from "utils/testUtil";

describe("Positions", () => {
  describe("read", () => {
    it("should be able to get orders", async () => {
      const { marketsInfoData, tokensData } = (await arbitrumSdk.markets.getMarketsInfo()) ?? {};

      if (!tokensData || !marketsInfoData) {
        throw new Error("Tokens data or markets info is not available");
      }

      const orders = await arbitrumSdk.orders.getOrders({
        marketsInfoData,
        tokensData,
      });
      expect(orders).toBeDefined();
    });
  });
});
