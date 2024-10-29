import { arbitrumSdk } from "utils/test";

describe("Markets", () => {
  describe("getMarkets", () => {
    it("should be able to get markets", async () => {
      const response = await arbitrumSdk.markets.getMarkets();
      expect(response).toBeDefined();
    });
  });

  describe("getMarkets", () => {
    it("should be able to get markets data", async () => {
      const marketsData = await arbitrumSdk.markets.getMarkets();
      expect(marketsData.marketsAddresses).toBeDefined();
      expect(marketsData.marketsData).toBeDefined();
    });
  });

  describe("getMarketsConfigs", () => {
    it("should be able to get markets configs", async () => {
      const data = await arbitrumSdk.markets.getMarkets();
      const response = await arbitrumSdk.markets.getMarketsConfigs({
        marketsAddresses: data.marketsAddresses,
        marketsData: data.marketsData,
      });
      expect(response).toBeDefined();
    });
  });

  describe("getMarketsInfo", () => {
    it("should be able to get markets info", async () => {
      const response = await arbitrumSdk.markets.getMarketsInfo();
      expect(response).toBeDefined();
    });
  });

  describe("getDailyVolumes", () => {
    it("should be able to get daily volumes", async () => {
      const response = await arbitrumSdk.markets.getDailyVolumes();
      expect(response).toBeDefined();
    });
  });
});
