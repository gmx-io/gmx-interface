import { ARBITRUM } from "configs/chains";
import { GmxSdk } from "../../index";

describe("Markets", () => {
  const sdk = new GmxSdk({
    chainId: ARBITRUM,
    account: "0x9f7198eb1b9Ccc0Eb7A07eD228d8FbC12963ea33",
    oracleUrl: "https://arbitrum-api.gmxinfra.io",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
  });

  describe.only("getMarkets", () => {
    it("should be able to get markets", async () => {
      const response = await sdk.markets.getMarkets();
      expect(response).toBeDefined();
    });
  });

  describe("getMarkets", () => {
    it("should be able to get markets data", async () => {
      const marketsData = await sdk.markets.getMarkets();
      expect(marketsData.marketsAddresses).toBeDefined();
      expect(marketsData.marketsData).toBeDefined();
    });
  });

  describe("getMarketsConfigs", () => {
    it("should be able to get markets configs", async () => {
      const data = await sdk.markets.getMarkets();
      const response = await sdk.markets.getMarketsConfigs({ marketsAddresses: data.marketsAddresses });
      expect(response).toBeDefined();
    });
  });

  describe("getMarketsInfo", () => {
    it("should be able to get markets info", async () => {
      const response = await sdk.markets.getMarketsInfo();
      expect(response).toBeDefined();
    });
  });
});
