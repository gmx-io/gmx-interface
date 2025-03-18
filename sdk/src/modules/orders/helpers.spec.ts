import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import * as swapPath from "utils/swap/swapPath";
import * as tradeAmounts from "utils/trade/amounts";
import { arbitrumSdk } from "utils/testUtil";
import { ARBITRUM } from "configs/chains";
import { getByKey } from "utils/objects";
import { MarketInfo, MarketsInfoData } from "types/markets";
import { TokenData, TokensData } from "types/tokens";

describe("increaseOrderHelper", () => {
  let mockParams;
  let createIncreaseOrderSpy;

  let marketsInfoData: MarketsInfoData;
  let tokensData: TokensData;

  let market: MarketInfo;
  let payToken: TokenData;
  let collateralToken: TokenData;

  beforeAll(async () => {
    const result = await arbitrumSdk.markets.getMarketsInfo();

    if (!result.marketsInfoData || !result.tokensData) {
      throw new Error("Markets info data or tokens data is not available");
    }

    marketsInfoData = result.marketsInfoData;
    tokensData = result.tokensData;
  });

  beforeEach(() => {
    vi.clearAllMocks();

    createIncreaseOrderSpy = vi.spyOn(arbitrumSdk.orders, "createIncreaseOrder").mockResolvedValue();

    market = getByKey(marketsInfoData, "0x70d95587d40A2caf56bd97485aB3Eec10Bee6336")!;

    if (!market) {
      throw new Error("Market is not available");
    }

    payToken = market.indexToken;
    collateralToken = market.shortToken;

    mockParams = {
      payAmount: 1000n,
      marketAddress: "0x70d95587d40A2caf56bd97485aB3Eec10Bee6336",
      payTokenAddress: market.indexToken.address,
      collateralTokenAddress: market.shortToken.address,
      allowedSlippageBps: 125,
      leverage: 50000n,
      marketsInfoData,
      tokensData,
    };
  });

  it("should call createIncreaseOrder with correct parameters for a market order with payAmount", async () => {
    const findSwapPathSpy = vi.spyOn(swapPath, "createFindSwapPath");
    const getIncreasePositionAmountsSpy = vi.spyOn(tradeAmounts, "getIncreasePositionAmounts");

    await arbitrumSdk.orders.long(mockParams);

    expect(findSwapPathSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        chainId: ARBITRUM,
        fromTokenAddress: payToken.address,
        toTokenAddress: collateralToken.address,
        marketsInfoData: expect.any(Object),
        gasEstimationParams: expect.objectContaining({
          gasPrice: expect.any(BigInt),
          gasLimits: expect.any(Object),
          tokensData: expect.any(Object),
        }),
      } satisfies Parameters<typeof swapPath.createFindSwapPath>[0])
    );

    expect(getIncreasePositionAmountsSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        isLong: true,
        initialCollateralAmount: 1000n,
        leverage: 50000n,
        strategy: "leverageByCollateral",
        marketInfo: market,
      })
    );

    expect(createIncreaseOrderSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        marketsInfoData: expect.any(Object),
        tokensData: expect.any(Object),
        marketInfo: market,
        indexToken: market.indexToken,
        isLimit: false,
        marketAddress: market.marketTokenAddress,
        allowedSlippage: 125,
        collateralTokenAddress: collateralToken.address,
        collateralToken,
        isLong: true,
        receiveTokenAddress: collateralToken.address,
        increaseAmounts: expect.objectContaining({
          initialCollateralAmount: 1000n,
          estimatedLeverage: 50000n,
          triggerPrice: undefined,
          acceptablePrice: 0n,
          acceptablePriceDeltaBps: 0n,
          positionFeeUsd: 0n,
          uiFeeUsd: 0n,
          swapUiFeeUsd: 0n,
          feeDiscountUsd: 0n,
          borrowingFeeUsd: 0n,
          fundingFeeUsd: 0n,
          positionPriceImpactDeltaUsd: 0n,
          limitOrderType: undefined,
          triggerThresholdType: undefined,
          externalSwapQuote: undefined,
        }),
      })
    );
  });
});
