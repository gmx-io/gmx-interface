import { ARBITRUM } from "configs/chains";
import { GmxSdk } from "../../index";
import { find } from "lodash";

describe("Positions", () => {
  const sdk = new GmxSdk({
    chainId: ARBITRUM,
    account: "0x9f7198eb1b9Ccc0Eb7A07eD228d8FbC12963ea33",
    oracleUrl: "https://arbitrum-api.gmxinfra.io",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
  });

  describe("read", () => {
    it("should be able to get orders", async () => {
      const { marketsInfoData, tokensData } = (await sdk.markets.getMarketsInfo()) ?? {};

      if (!tokensData || !marketsInfoData) {
        throw new Error("Tokens data or markets info is not available");
      }

      const orders = await sdk.orders.getOrders({
        marketsInfoData,
        tokensData,
      });
      expect(orders).toBeDefined();
    });
  });
  describe("write", async () => {
    const tokens = await sdk.tokens.getTokensData();
    const { marketsInfoData, tokensData } = await sdk.markets.getMarketsInfo();

    if (!tokensData || !marketsInfoData) {
      throw new Error("Tokens data or markets info is not available");
    }

    const getToken = (symbol: string) => find(tokensData, { symbol })!;

    const market = marketsInfoData!["0x70d95587d40A2caf56bd97485aB3Eec10Bee6336"];

    sdk.orders.createIncreaseOrder({
      isLimit: false,
      isLong: true,
      marketsInfoData,
      tokensData,
      collateralToken: getToken("USDC"),
      indexToken: market.indexToken,
      fromToken: getToken("USDC"),
      marketAddress: market.indexTokenAddress,
      triggerPrice: undefined,
      increaseAmounts: {
        initialCollateralAmount: 2500000n,
        initialCollateralUsd: 2499580750000000000000000000000n,
        collateralDeltaAmount: 2497627n,
        collateralDeltaUsd: 2497208404159126875000000000000n,
        indexTokenAmount: 1805851426965311n,
        sizeDeltaUsd: 4744691681746250000000000000000n,
        sizeDeltaInTokens: 1805567913627189n,
        estimatedLeverage: 19000n,
        indexPrice: 2627398694542433000000000000000000n,
        initialCollateralPrice: 999832300000000000000000000000n,
        collateralPrice: 999832300000000000000000000000n,
        triggerPrice: 0n,
        swapPathStats: undefined,
        acceptablePrice: 2627811190766929725578922802056883n,
        acceptablePriceDeltaBps: 1n,
        positionFeeUsd: 2372345840873125000000000000n,
        uiFeeUsd: 0n,
        swapUiFeeUsd: 0n,
        feeDiscountUsd: 0n,
        borrowingFeeUsd: 0n,
        fundingFeeUsd: 0n,
        positionPriceImpactDeltaUsd: 744906895625215489838763241n,
      },
      allowedSlippage: 0.01,
      collateralTokenAddress: getToken("USDC").address,
      receiveTokenAddress: "0x123",
      marketInfo: market,
    });
  });
});
