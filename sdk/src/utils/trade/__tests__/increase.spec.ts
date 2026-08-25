import { describe, expect, it } from "vitest";

import { ARBITRUM } from "configs/chains";
import { BASIS_POINTS_DIVISOR_BIGINT } from "configs/factors";
import { mockMarketsInfoData, mockTokensData } from "test/mock";
import type { MarketsInfoData } from "utils/markets/types";
import { USD_DECIMALS, expandDecimals } from "utils/numbers";
import { OrderType, SwapPricingType } from "utils/orders/types";
import { getSwapPathStats } from "utils/swap";
import { convertToTokenAmount, convertToUsd } from "utils/tokens";
import {
  ExternalSwapAggregator,
  type ExternalSwapQuote,
  type ExternalSwapQuoteParams,
  type SwapPathStats,
  type SwapStats,
} from "utils/trade/types";

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

describe("getIncreasePositionAmounts — collateral valuation without a swap", () => {
  // a wide oracle spread makes any min/max round trip visible
  const tokensData = mockTokensData({
    ETH: { prices: { minPrice: expandDecimals(1200, USD_DECIMALS), maxPrice: expandDecimals(1260, USD_DECIMALS) } },
  });
  const marketsInfoData = mockMarketsInfoData(tokensData, ["ETH-ETH-USDC"]);
  const marketInfo = marketsInfoData["ETH-ETH-USDC"];
  const eth = tokensData.ETH;

  const amountIn = expandDecimals(1, eth.decimals);

  function getAmounts(externalSwapQuoteParams: ExternalSwapQuoteParams | undefined) {
    return getIncreasePositionAmounts({
      marketInfo,
      indexToken: eth,
      initialCollateralToken: eth,
      collateralToken: eth,
      isLong: true,
      initialCollateralAmount: amountIn,
      indexTokenAmount: convertToTokenAmount(expandDecimals(5000, USD_DECIMALS), eth.decimals, eth.prices.maxPrice),
      position: undefined,
      externalSwapQuote: undefined,
      userReferralInfo: undefined,
      strategy: "independent",
      findSwapPath: (() => undefined) as never,
      uiFeeFactor: 0n,
      marketsInfoData,
      chainId: ARBITRUM,
      externalSwapQuoteParams,
      isSetAcceptablePriceImpactEnabled: false,
    });
  }

  it("credits the full deposit, the way the contract does, on both swap-strategy paths", () => {
    // the tradebox always passes the params object, the order editor never does
    const withParams = getAmounts({} as ExternalSwapQuoteParams);
    const withoutParams = getAmounts(undefined);

    const depositUsd = convertToUsd(amountIn, eth.decimals, eth.prices.minPrice)!;

    expect(withParams.initialCollateralUsd).toBe(depositUsd);
    expect(withParams.positionFeeUsd).toBeGreaterThan(0n);
    expect(withParams.collateralDeltaUsd).toBe(depositUsd - withParams.positionFeeUsd);
    expect(withoutParams.collateralDeltaUsd).toBe(withParams.collateralDeltaUsd);
  });

  it("sizes leverageByCollateral off the same undiscounted deposit", () => {
    const leverage = 10n * BASIS_POINTS_DIVISOR_BIGINT;

    const byCollateral = getIncreasePositionAmounts({
      ...({
        marketInfo,
        indexToken: eth,
        initialCollateralToken: eth,
        collateralToken: eth,
        isLong: true,
        initialCollateralAmount: amountIn,
        indexTokenAmount: undefined,
        position: undefined,
        externalSwapQuote: undefined,
        userReferralInfo: undefined,
        findSwapPath: (() => undefined) as never,
        uiFeeFactor: 0n,
        marketsInfoData,
        chainId: ARBITRUM,
        isSetAcceptablePriceImpactEnabled: false,
      } as const),
      strategy: "leverageByCollateral",
      leverage,
      externalSwapQuoteParams: {} as ExternalSwapQuoteParams,
    });

    const depositUsd = convertToUsd(amountIn, eth.decimals, eth.prices.minPrice)!;

    expect(byCollateral.collateralDeltaUsd).toBe(depositUsd - byCollateral.positionFeeUsd);
  });
});

describe("getIncreasePositionAmounts — collateral valuation through an internal swap", () => {
  const tokensData = mockTokensData();
  const marketsInfoData = mockMarketsInfoData(tokensData, ["ETH-ETH-USDC"]);
  const marketInfo = marketsInfoData["ETH-ETH-USDC"];

  const usdc = tokensData.USDC;
  const eth = tokensData.ETH;

  const amountIn = expandDecimals(1000, usdc.decimals);
  const usdIn = expandDecimals(1000, USD_DECIMALS);
  // the swap path itself eats 1%
  const swapOutUsd = expandDecimals(990, USD_DECIMALS);
  const swapOutAmount = convertToTokenAmount(swapOutUsd, eth.decimals, eth.prices.maxPrice)!;

  const findSwapPath = (): SwapPathStats =>
    ({
      swapPath: [marketInfo.marketTokenAddress],
      swapSteps: [{ usdIn, usdOut: swapOutUsd } as SwapStats],
      totalSwapPriceImpactDeltaUsd: 0n,
      totalSwapFeeUsd: 0n,
      totalFeesDeltaUsd: 0n,
      tokenInAddress: usdc.address,
      tokenOutAddress: eth.address,
      usdOut: swapOutUsd,
      amountOut: swapOutAmount,
    }) as SwapPathStats;

  it("charges the swap ui fee once", () => {
    const uiFeeFactor = expandDecimals(1, 27); // 0.1%

    const values = getIncreasePositionAmounts({
      marketInfo,
      indexToken: eth,
      initialCollateralToken: usdc,
      collateralToken: eth,
      isLong: true,
      initialCollateralAmount: amountIn,
      indexTokenAmount: convertToTokenAmount(expandDecimals(5000, USD_DECIMALS), eth.decimals, eth.prices.maxPrice),
      position: undefined,
      externalSwapQuote: undefined,
      userReferralInfo: undefined,
      strategy: "independent",
      findSwapPath,
      uiFeeFactor,
      marketsInfoData,
      chainId: ARBITRUM,
      // the order editor / orders list path, where the strategy holds the net swap output
      externalSwapQuoteParams: undefined,
      isSetAcceptablePriceImpactEnabled: false,
    });

    const grossSwapOutUsd = convertToUsd(swapOutAmount, eth.decimals, eth.prices.minPrice)!;

    expect(values.swapUiFeeUsd).toBe(expandDecimals(1, USD_DECIMALS));
    expect(values.uiFeeUsd).toBeGreaterThan(0n);
    expect(values.collateralDeltaUsd).toBe(
      grossSwapOutUsd - values.positionFeeUsd - values.uiFeeUsd - values.swapUiFeeUsd
    );
  });
});

describe("getIncreasePositionAmounts — pro tier discount", () => {
  const tokensData = mockTokensData();
  const marketsInfoData = mockMarketsInfoData(tokensData, ["ETH-ETH-USDC"]);
  const marketInfo = marketsInfoData["ETH-ETH-USDC"];
  const eth = tokensData.ETH;

  function getAmounts(proDiscountFactor: bigint | undefined) {
    return getIncreasePositionAmounts({
      marketInfo,
      indexToken: eth,
      initialCollateralToken: eth,
      collateralToken: eth,
      isLong: true,
      initialCollateralAmount: expandDecimals(1, eth.decimals),
      indexTokenAmount: convertToTokenAmount(expandDecimals(5000, USD_DECIMALS), eth.decimals, eth.prices.maxPrice),
      position: undefined,
      externalSwapQuote: undefined,
      userReferralInfo: undefined,
      proDiscountFactor,
      strategy: "independent",
      findSwapPath: (() => undefined) as never,
      uiFeeFactor: 0n,
      marketsInfoData,
      chainId: ARBITRUM,
      externalSwapQuoteParams: undefined,
      isSetAcceptablePriceImpactEnabled: false,
    });
  }

  it("leaves more collateral to the resulting position", () => {
    const noPro = getAmounts(undefined);
    // 50% off the opening fee
    const withPro = getAmounts(expandDecimals(5, 29));

    expect(withPro.positionFeeUsd).toBeLessThan(noPro.positionFeeUsd);
    expect(withPro.feeDiscountUsd).toBe(noPro.positionFeeUsd - withPro.positionFeeUsd);
    expect(withPro.collateralDeltaUsd).toBe(noPro.collateralDeltaUsd + withPro.feeDiscountUsd);
  });
});

describe("getIncreasePositionAmounts — deposit prices for a resting order", () => {
  const tokensData = mockTokensData();
  const marketsInfoData = mockMarketsInfoData(tokensData, ["ETH-ETH-USDC"]);
  const marketInfo = marketsInfoData["ETH-ETH-USDC"];

  const eth = tokensData.ETH;
  const usdc = tokensData.USDC;
  const triggerPrice = expandDecimals(1000, USD_DECIMALS);
  const amountIn = expandDecimals(1, eth.decimals);

  const build = (overrides: Partial<Parameters<typeof getIncreasePositionAmounts>[0]>) =>
    getIncreasePositionAmounts({
      marketInfo,
      indexToken: eth,
      initialCollateralToken: eth,
      collateralToken: eth,
      isLong: true,
      initialCollateralAmount: amountIn,
      indexTokenAmount: convertToTokenAmount(expandDecimals(5000, USD_DECIMALS), eth.decimals, triggerPrice),
      position: undefined,
      externalSwapQuote: undefined,
      userReferralInfo: undefined,
      strategy: "independent",
      findSwapPath: (() => undefined) as never,
      uiFeeFactor: 0n,
      marketsInfoData,
      chainId: ARBITRUM,
      externalSwapQuoteParams: undefined,
      isSetAcceptablePriceImpactEnabled: false,
      triggerPrice,
      limitOrderType: OrderType.LimitIncrease,
      ...overrides,
    });

  it("prices the deposit at the current price, but the collateral it turns into at the trigger", () => {
    const values = build({});

    expect(values.indexPrice).toBe(triggerPrice);
    // "Pay" is what leaves the wallet now, so it keeps the current price
    expect(values.initialCollateralPrice).toBe(eth.prices.minPrice);
    expect(values.initialCollateralUsd).toBe(expandDecimals(1200, USD_DECIMALS));
    // the deposit becomes collateral at execution, when the index token is worth the trigger
    expect(values.collateralPrice).toBe(triggerPrice);
    expect(values.collateralDeltaUsd).toBe(expandDecimals(1000, USD_DECIMALS) - values.positionFeeUsd);
    // fees leave the deposit in tokens converted at the execution price, as the contract does
    expect(values.collateralDeltaAmount).toBe(
      convertToTokenAmount(values.collateralDeltaUsd, eth.decimals, triggerPrice)
    );
  });

  it("keeps the current price for a deposit that does not track the index", () => {
    const values = build({ initialCollateralToken: usdc, collateralToken: usdc });

    expect(values.indexPrice).toBe(triggerPrice);
    expect(values.initialCollateralPrice).toBe(usdc.prices.minPrice);
    expect(values.collateralPrice).toBe(usdc.prices.minPrice);
  });

  it("keeps the current price for a market order", () => {
    const values = build({ triggerPrice: undefined, limitOrderType: undefined });

    expect(values.initialCollateralPrice).toBe(eth.prices.minPrice);
    expect(values.collateralPrice).toBe(eth.prices.minPrice);
    expect(values.initialCollateralUsd).toBe(expandDecimals(1200, USD_DECIMALS));
  });
});

describe("getIncreasePositionAmounts — internal swap of the index token on a resting order", () => {
  const tokensData = mockTokensData();
  const marketsInfoData = mockMarketsInfoData(tokensData, ["ETH-ETH-USDC"]);
  const marketInfo = marketsInfoData["ETH-ETH-USDC"];

  const eth = tokensData.ETH;
  const usdc = tokensData.USDC;
  const triggerPrice = expandDecimals(1000, USD_DECIMALS);
  const amountIn = expandDecimals(1, eth.decimals) / 10n;

  const ethAtTrigger = { ...eth, prices: { minPrice: triggerPrice, maxPrice: triggerPrice } };
  const marketsAtTrigger: MarketsInfoData = {
    ...marketsInfoData,
    [marketInfo.marketTokenAddress]: { ...marketInfo, indexToken: ethAtTrigger, longToken: ethAtTrigger },
  };

  const swapStatsOn = (markets: MarketsInfoData, usdIn: bigint) =>
    getSwapPathStats({
      marketsInfoData: markets,
      swapPath: [marketInfo.marketTokenAddress],
      initialCollateralAddress: eth.address,
      wrappedNativeTokenAddress: eth.address,
      usdIn,
      shouldUnwrapNativeToken: false,
      shouldApplyPriceImpact: true,
      swapPricingType: SwapPricingType.Swap,
    })!;

  const build = (overrides: Partial<Parameters<typeof getIncreasePositionAmounts>[0]>) =>
    getIncreasePositionAmounts({
      marketInfo,
      indexToken: eth,
      initialCollateralToken: eth,
      collateralToken: usdc,
      isLong: true,
      initialCollateralAmount: amountIn,
      indexTokenAmount: convertToTokenAmount(expandDecimals(5000, USD_DECIMALS), eth.decimals, triggerPrice),
      position: undefined,
      externalSwapQuote: undefined,
      userReferralInfo: undefined,
      strategy: "independent",
      findSwapPath: ((usdIn: bigint) => swapStatsOn(marketsInfoData, usdIn)) as never,
      uiFeeFactor: 0n,
      marketsInfoData,
      chainId: ARBITRUM,
      externalSwapQuoteParams: undefined,
      isSetAcceptablePriceImpactEnabled: false,
      triggerPrice,
      limitOrderType: OrderType.LimitIncrease,
      ...overrides,
    });

  it("projects the swap output at the trigger price and leaves the route untouched", () => {
    const values = build({});
    const expectedOut = swapStatsOn(marketsAtTrigger, expandDecimals(100, USD_DECIMALS)).amountOut;

    expect(expectedOut).toBeGreaterThan(0n);
    expect(values.collateralDeltaUsd).toBe(
      convertToUsd(expectedOut, usdc.decimals, usdc.prices.minPrice)! - values.positionFeeUsd
    );
    expect(values.swapStrategy.type).toBe("internalSwap");
    expect(values.swapStrategy.amountIn).toBe(amountIn);

    const atMark = build({ triggerPrice: undefined, limitOrderType: undefined });
    expect(atMark.collateralDeltaUsd).toBeGreaterThan(values.collateralDeltaUsd);
  });

  it("projects the swap output at the trigger price when the size drives the swap", () => {
    const leverage = 5n * BASIS_POINTS_DIVISOR_BIGINT;
    const values = build({
      strategy: "leverageBySize",
      leverage,
      indexTokenAmount: convertToTokenAmount(expandDecimals(500, USD_DECIMALS), eth.decimals, triggerPrice),
    });
    const swapAmountIn = values.swapStrategy.amountIn;
    const expectedOut = swapStatsOn(
      marketsAtTrigger,
      convertToUsd(swapAmountIn, eth.decimals, triggerPrice)!
    ).amountOut;

    expect(swapAmountIn).toBeGreaterThan(0n);
    expect(values.collateralDeltaUsd).toBe(
      convertToUsd(expectedOut, usdc.decimals, usdc.prices.minPrice)! - values.positionFeeUsd
    );
    expect(values.collateralDeltaAmount).toBe(
      convertToTokenAmount(values.collateralDeltaUsd, usdc.decimals, usdc.prices.minPrice)
    );
  });

});
