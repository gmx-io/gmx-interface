import { describe, expect, it } from "vitest";

import { GmxSdk } from "clients/v1";
import { arbitrumSdk, arbitrumSdkConfig } from "clients/v1/testUtil";

describe("Markets", () => {
  describe("getMarkets", () => {
    it("should be able to get markets data", { timeout: 90_000 }, async () => {
      const marketsData = await arbitrumSdk.markets.getMarkets();
      expect(marketsData.marketsAddresses).toBeDefined();
      expect(marketsData.marketsData).toBeDefined();
    });

    it("should respect config filters", { timeout: 90_000 }, async () => {
      const sdk = new GmxSdk({
        ...arbitrumSdkConfig,
        markets: {
          "0x47c031236e19d024b42f8AE6780E44A573170703": {
            isListed: false,
          },
        },
      });
      const baseSdkResponse = await arbitrumSdk.markets.getMarkets();
      const sdkResponse = await sdk.markets.getMarkets();
      expect(baseSdkResponse.marketsData?.["0x47c031236e19d024b42f8AE6780E44A573170703"]).toBeDefined();
      expect(sdkResponse.marketsData?.["0x47c031236e19d024b42f8AE6780E44A573170703"]).not.toBeDefined();
    });
  });

  describe("getMarketsInfo", () => {
    it("should be able to get markets info", { timeout: 90_000 }, async () => {
      const response = await arbitrumSdk.markets.getMarketsInfo();
      expect(response).toBeDefined();
    });
  });

  describe("getDailyVolumes", () => {
    it("should be able to get daily volumes", { timeout: 90_000 }, async () => {
      const response = await arbitrumSdk.markets.getDailyVolumes();
      expect(response).toBeDefined();
    });
  });
});
