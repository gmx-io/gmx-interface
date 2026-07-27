import { zeroAddress } from "viem";
import { describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "configs/chains";
import { USD_DECIMALS } from "configs/factors";
import { mockTokensData, usdToToken } from "test/mock";
import { expandDecimals } from "utils/numbers";
import { SwapPricingType } from "utils/orders/types";
import { FindSwapPath } from "utils/trade/types";

import { buildSwapStrategy, getAvailableExternalSwapPaths, getSwapAmountsByToValue } from "../index";

describe("getSwapAmountsByToValue", () => {
  it("requotes the adjusted input for exact-output swaps", () => {
    const tokensData = mockTokensData();
    const requestedUsdOut = expandDecimals(90, USD_DECIMALS);
    const requestedAmountOut = usdToToken(90, tokensData.USDC);
    const adjustedUsdIn = expandDecimals(100, USD_DECIMALS);

    const findSwapPath: FindSwapPath = vi.fn((usdIn: bigint) => {
      const usdOut = (usdIn * 9n) / 10n;

      return {
        swapPath: ["ETH-ETH-USDC"],
        swapSteps: [],
        totalSwapPriceImpactDeltaUsd: 0n,
        totalSwapFeeUsd: usdIn - usdOut,
        totalFeesDeltaUsd: usdOut - usdIn,
        tokenInAddress: tokensData.ETH.address,
        tokenOutAddress: tokensData.USDC.address,
        usdOut,
        amountOut: usdToToken(Number(usdOut / expandDecimals(1, USD_DECIMALS)), tokensData.USDC),
      };
    });

    const result = getSwapAmountsByToValue({
      tokenIn: tokensData.ETH,
      tokenOut: tokensData.USDC,
      amountOut: requestedAmountOut,
      isLimit: false,
      findSwapPath,
      uiFeeFactor: 0n,
      allowSameTokenSwap: false,
      marketsInfoData: undefined,
      chainId: ARBITRUM,
      externalSwapQuoteParams: undefined,
    });

    expect(findSwapPath).toHaveBeenNthCalledWith(1, requestedUsdOut, { order: undefined });
    expect(findSwapPath).toHaveBeenNthCalledWith(2, adjustedUsdIn, { order: undefined });
    expect(result.usdIn).toBe(adjustedUsdIn);
    expect(result.usdOut).toBe(requestedUsdOut);
    expect(result.swapStrategy.swapPathStats?.usdOut).toBe(requestedUsdOut);
  });
});

describe("buildSwapStrategy", () => {
  it("keeps the generic public strategy builder without Botanix paths", () => {
    const tokensData = mockTokensData();
    const amountIn = usdToToken(100, tokensData.ETH);

    const result = buildSwapStrategy({
      amountIn,
      tokenIn: tokensData.ETH,
      tokenOut: tokensData.ETH,
      marketsInfoData: undefined,
      chainId: ARBITRUM,
      swapOptimizationOrder: undefined,
      externalSwapQuoteParams: {
        chainId: ARBITRUM,
        receiverAddress: zeroAddress,
        gasPrice: undefined,
        tokensData,
      },
      swapPricingType: SwapPricingType.Swap,
      allowSameTokenSwap: false,
    });

    expect(result.type).toBe("noSwap");
    expect(result.amountIn).toBe(amountIn);
    expect(getAvailableExternalSwapPaths({ chainId: ARBITRUM, fromTokenAddress: tokensData.ETH.address })).toEqual([]);
  });
});
