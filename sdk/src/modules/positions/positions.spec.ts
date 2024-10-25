import { ARBITRUM } from "configs/chains";
import { GmxSdk } from "../../index";
import find from "lodash/find";

describe("Positions", () => {
  const sdk = new GmxSdk({
    chainId: ARBITRUM,
    account: "0x9f7198eb1b9Ccc0Eb7A07eD228d8FbC12963ea33",
    oracleUrl: "https://arbitrum-api.gmxinfra.io",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
  });

  describe("getPositions", () => {
    it("should be able to get positions data", async () => {
      const { marketsInfoData, tokensData } = (await sdk.markets.getMarketsInfo()) ?? {};

      if (!tokensData || !marketsInfoData) {
        throw new Error("Tokens data or markets info is not available");
      }

      const positions = await sdk.positions.getPositions({ tokensData, marketsInfoData });

      expect(positions).toBeDefined();
    });

    it("should be able to get positions info", async () => {
      const { marketsInfoData, tokensData } = (await sdk.markets.getMarketsInfo()) ?? {};

      if (!tokensData || !marketsInfoData) {
        throw new Error("Tokens data or markets info is not available");
      }

      const positions = await sdk.positions.getPositionsInfo({ tokensData, marketsInfoData, showPnlInLeverage: true });

      expect(positions).toBeDefined();
    });
  });
});
