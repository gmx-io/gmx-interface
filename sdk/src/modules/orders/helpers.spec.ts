import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { increaseOrderHelper } from "./helpers";
import { createFindSwapPath } from "utils/swap/swapPath";
import { getIncreasePositionAmounts } from "utils/trade/amounts";
import { arbitrumSdk } from "utils/testUtil";
import { ARBITRUM } from "configs/chains";
import { getByKey } from "utils/objects";
import { MarketsInfoData } from "types/markets";
import { TokensData } from "types/tokens";

describe("increaseOrderHelper", () => {
  let mockParams;
  let createIncreaseOrderSpy;

  let marketsInfoData: MarketsInfoData;
  let tokensData: TokensData;

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

    const market = getByKey(marketsInfoData, "0x70d95587d40A2caf56bd97485aB3Eec10Bee6336");

    if (!market) {
      throw new Error("Market is not available");
    }

    mockParams = {
      payAmount: 1000n,
      marketAddress: "0x70d95587d40A2caf56bd97485aB3Eec10Bee6336",
      payTokenAddress: market.indexToken.address,
      collateralIn: market.shortToken.address,
      isLong: true,
      allowedSlippageBps: 125,
      leverage: 50000n,
      marketsInfoData,
      tokensData,
    };
  });

  it("should call createIncreaseOrder with correct parameters for a market order with payAmount", async () => {
    await increaseOrderHelper(arbitrumSdk, mockParams);

    expect(createFindSwapPath).toHaveBeenCalledWith({
      chainId: ARBITRUM,
      fromTokenAddress: "0xPayToken",
      toTokenAddress: "0xCollateralToken",
      marketsInfoData: expect.any(Object),
    });

    expect(getIncreasePositionAmounts).toHaveBeenCalledWith(
      expect.objectContaining({
        isLong: true,
        initialCollateralAmount: 1000n,
        leverage: 10n,
        strategy: "leverageByCollateral",
      })
    );

    expect(createIncreaseOrderSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        isLimit: false,
        marketAddress: "0xMarket",
        allowedSlippage: 50,
        collateralTokenAddress: "0xCollateralToken",
        isLong: true,
        receiveTokenAddress: "0xCollateralToken",
        increaseAmounts: expect.objectContaining({
          initialCollateralAmount: 1000n,
        }),
      })
    );
  });

  it("should call createIncreaseOrder with correct parameters for a limit order", async () => {
    const limitParams = {
      ...mockParams,
      limitPrice: 2100n,
    };

    await increaseOrderHelper(arbitrumSdk, limitParams);

    expect(createIncreaseOrderSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        isLimit: true,
        triggerPrice: 2100n,
      })
    );
  });

  it("should call createIncreaseOrder with correct parameters for a size-based order", async () => {
    const sizeParams = {
      sizeAmount: 5000n,
      marketAddress: "0xMarket",
      payTokenAddress: "0xPayToken",
      collateralIn: "0xCollateralToken",
      isLong: true,
      allowedSlippageBps: 50,
      leverage: 10n,
    };

    await increaseOrderHelper(arbitrumSdk, sizeParams);

    expect(getIncreasePositionAmounts).toHaveBeenCalledWith(
      expect.objectContaining({
        initialCollateralAmount: 5000n,
        indexTokenAmount: 5000n,
        strategy: "leverageBySize",
      })
    );
  });

  it("should use provided marketsInfoData and tokensData if available", async () => {
    const paramsWithData = {
      ...mockParams,
      marketsInfoData: {
        /* mock data */
      },
      tokensData: {
        /* mock data */
      },
      uiFeeFactor: 200n,
    };

    await increaseOrderHelper(arbitrumSdk, paramsWithData);

    expect(getIncreasePositionAmounts).toHaveBeenCalledWith(
      expect.objectContaining({
        uiFeeFactor: 200n,
      })
    );
  });

  it("should handle receiveTokenAddress for tp/sl orders", async () => {
    const tpSlParams = {
      ...mockParams,
      tpSl: [{ valueBps: 500, price: 2500n }],
      receiveTokenAddress: "0xReceiveToken",
    };

    await increaseOrderHelper(arbitrumSdk, tpSlParams);

    expect(createFindSwapPath).toHaveBeenCalledWith(
      expect.objectContaining({
        toTokenAddress: "0xReceiveToken",
      })
    );

    expect(createIncreaseOrderSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        receiveTokenAddress: "0xReceiveToken",
      })
    );
  });

  it("should throw an error if tp/sl is provided without receiveTokenAddress", async () => {
    const invalidParams = {
      ...mockParams,
      tpSl: [{ valueBps: 500, price: 2500n }],
    };

    await expect(increaseOrderHelper(arbitrumSdk, invalidParams)).rejects.toThrow(
      "Receive token address is required for tp/sl orders"
    );
  });
});
