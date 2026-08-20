import { describe, expect, it } from "vitest";

import { ARBITRUM } from "configs/chains";
import { mockMarketsInfoData, mockTokensData } from "test/mock";
import { USD_DECIMALS, expandDecimals } from "utils/numbers";
import { convertToTokenAmount, convertToUsd } from "utils/tokens";
import { ExternalSwapAggregator, type ExternalSwapQuote } from "utils/trade/types";

import { getIncreasePositionAmounts } from "../increase";

describe("getIncreasePositionAmounts — independent strategy, swapped collateral", () => {
  const tokensData = mockTokensData();
  const marketsInfoData = mockMarketsInfoData(tokensData, ["ETH-ETH-USDC"]);
  const marketInfo = marketsInfoData["ETH-ETH-USDC"];

  const usdc = tokensData.USDC;
  const eth = tokensData.ETH;

  const amountInUsdc = expandDecimals(1000, usdc.decimals);
  // the swap returns tokens worth 990 — fees and price impact of the swap ate 10
  const amountOutEth = convertToTokenAmount(expandDecimals(990, USD_DECIMALS), eth.decimals, eth.prices.minPrice)!;

  const externalSwapQuote: ExternalSwapQuote = {
    aggregator: ExternalSwapAggregator.KyberSwap,
    inTokenAddress: usdc.address,
    outTokenAddress: eth.address,
    receiver: "0x1111111111111111111111111111111111111111",
    amountIn: amountInUsdc,
    amountOut: amountOutEth,
    usdIn: expandDecimals(1000, USD_DECIMALS),
    usdOut: expandDecimals(990, USD_DECIMALS),
    priceIn: usdc.prices.minPrice,
    priceOut: eth.prices.minPrice,
    feesUsd: expandDecimals(10, USD_DECIMALS),
    txnData: { to: "0x", data: "0x", value: 0n, estimatedGas: 0n, estimatedExecutionFee: 0n },
  };

  it("values the collateral by the swap output, net of swap costs", () => {
    const values = getIncreasePositionAmounts({
      marketInfo,
      indexToken: eth,
      initialCollateralToken: usdc,
      collateralToken: eth,
      isLong: true,
      initialCollateralAmount: amountInUsdc,
      indexTokenAmount: convertToTokenAmount(expandDecimals(5000, USD_DECIMALS), eth.decimals, eth.prices.maxPrice),
      position: undefined,
      externalSwapQuote,
      userReferralInfo: undefined,
      strategy: "independent",
      findSwapPath: (() => undefined) as never,
      uiFeeFactor: 0n,
      marketsInfoData,
      chainId: ARBITRUM,
      externalSwapQuoteParams: undefined,
      isSetAcceptablePriceImpactEnabled: false,
    });

    const swapOutputUsd = convertToUsd(amountOutEth, eth.decimals, eth.prices.minPrice)!;

    expect(values.positionFeeUsd).toBeGreaterThan(0n);
    expect(values.collateralDeltaUsd).toBe(swapOutputUsd - values.positionFeeUsd);
    // the pay side keeps the full amountIn
    expect(values.initialCollateralUsd).toBe(expandDecimals(1000, USD_DECIMALS));
  });
});
