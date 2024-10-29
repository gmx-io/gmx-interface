import { arbitrumSdk } from "utils/test";

describe("Markets' volumes", () => {
  it("should be able to get daily volumes", async () => {
    const response = await arbitrumSdk.markets.getDailyVolumes();
    expect(response).toBeDefined();
    const markets = await arbitrumSdk.markets.getMarkets();
    expect(response).toEqual(markets.marketsAddresses?.reduce((acc, market) => ({ ...acc, [market]: 300n }), {}));
  });
});
