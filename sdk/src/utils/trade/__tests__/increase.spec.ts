import { describe, expect, it } from "vitest";

import { ARBITRUM } from "configs/chains";
import { BASIS_POINTS_DIVISOR_BIGINT } from "configs/factors";
import { mockMarketsInfoData, mockTokensData } from "test/mock";
import { bigMath } from "utils/bigmath";
import type { MarketsInfoData } from "utils/markets/types";
import { USD_DECIMALS, expandDecimals } from "utils/numbers";
import { OrderType, SwapPricingType } from "utils/orders/types";
import type { PositionInfo } from "utils/positions/types";
import { getSwapPathStats } from "utils/swap";
import { convertToTokenAmount, convertToUsd } from "utils/tokens";
import {
  ExternalSwapAggregator,
  type ExternalSwapQuote,
  type ExternalSwapQuoteParams,
  type SwapPathStats,
  type SwapStats,
} from "utils/trade/types";

import { getIncreasePositionAmounts, getNextPositionValuesForIncreaseTrade } from "../increase";

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

  it("pays the deposit that reaches the requested leverage at the trigger when the size drives the swap", () => {
    const leverage = 5n * BASIS_POINTS_DIVISOR_BIGINT;
    const values = build({
      strategy: "leverageBySize",
      leverage,
      indexTokenAmount: convertToTokenAmount(expandDecimals(500, USD_DECIMALS), eth.decimals, triggerPrice),
    });

    // 500 of size at 5× needs 100 of collateral once the order executes at the trigger
    const targetCollateralUsd = bigMath.mulDiv(values.sizeDeltaUsd, BASIS_POINTS_DIVISOR_BIGINT, leverage);
    const toleranceUsd = targetCollateralUsd / 10_000n;

    expect(bigMath.abs(values.collateralDeltaUsd - targetCollateralUsd)).toBeLessThanOrEqual(toleranceUsd);

    // the deposit is priced at the trigger: the current 1 200 price would ask for less ETH
    const grossCollateralUsd = targetCollateralUsd + values.positionFeeUsd;
    const depositUsdAtTrigger = convertToUsd(values.swapStrategy.amountIn, eth.decimals, triggerPrice)!;
    expect(depositUsdAtTrigger).toBeGreaterThan(grossCollateralUsd);
    expect(depositUsdAtTrigger).toBeLessThan((grossCollateralUsd * 102n) / 100n);

    // typing that deposit into the margin field sizes the same order back
    const byCollateral = build({
      strategy: "leverageByCollateral",
      leverage,
      initialCollateralAmount: values.swapStrategy.amountIn,
      indexTokenAmount: undefined,
    });

    expect(bigMath.abs(byCollateral.sizeDeltaUsd - values.sizeDeltaUsd)).toBeLessThanOrEqual(
      values.sizeDeltaUsd / 10_000n
    );
  });

  it("pays the deposit that reaches the requested leverage at the trigger when the collateral is the index token", () => {
    // USDC → ETH: the deposit keeps its price, the collateral it buys is worth the trigger at execution
    const usdcSwapStatsOn = (markets: MarketsInfoData, usdIn: bigint) =>
      getSwapPathStats({
        marketsInfoData: markets,
        swapPath: [marketInfo.marketTokenAddress],
        initialCollateralAddress: usdc.address,
        wrappedNativeTokenAddress: eth.address,
        usdIn,
        shouldUnwrapNativeToken: false,
        shouldApplyPriceImpact: true,
        swapPricingType: SwapPricingType.Swap,
      })!;

    const leverage = 5n * BASIS_POINTS_DIVISOR_BIGINT;
    const values = build({
      strategy: "leverageBySize",
      leverage,
      initialCollateralToken: usdc,
      collateralToken: eth,
      initialCollateralAmount: undefined,
      indexTokenAmount: convertToTokenAmount(expandDecimals(500, USD_DECIMALS), eth.decimals, triggerPrice),
      findSwapPath: ((usdIn: bigint) => usdcSwapStatsOn(marketsInfoData, usdIn)) as never,
    });

    const targetCollateralUsd = bigMath.mulDiv(values.sizeDeltaUsd, BASIS_POINTS_DIVISOR_BIGINT, leverage);

    expect(values.swapStrategy.type).toBe("internalSwap");
    expect(bigMath.abs(values.collateralDeltaUsd - targetCollateralUsd)).toBeLessThanOrEqual(
      targetCollateralUsd / 10_000n
    );
  });
});

describe("getIncreasePositionAmounts — independent strategy, size-only order", () => {
  const tokensData = mockTokensData();
  const marketsInfoData = mockMarketsInfoData(tokensData, ["ETH-ETH-USDC"]);
  const marketInfo = marketsInfoData["ETH-ETH-USDC"];
  const eth = tokensData.ETH;
  const usdc = tokensData.USDC;

  const build = (overrides: Partial<Parameters<typeof getIncreasePositionAmounts>[0]>) =>
    getIncreasePositionAmounts({
      marketInfo,
      indexToken: eth,
      initialCollateralToken: usdc,
      collateralToken: usdc,
      isLong: true,
      initialCollateralAmount: 0n,
      indexTokenAmount: expandDecimals(5, eth.decimals),
      position: undefined,
      externalSwapQuote: undefined,
      userReferralInfo: undefined,
      strategy: "independent",
      findSwapPath: (() => undefined) as never,
      // 0.1%
      uiFeeFactor: expandDecimals(1, 27),
      marketsInfoData,
      chainId: ARBITRUM,
      externalSwapQuoteParams: undefined,
      isSetAcceptablePriceImpactEnabled: false,
      ...overrides,
    });

  it("pays the fees from the existing collateral when nothing is deposited", () => {
    const values = build({
      position: {
        pendingBorrowingFeesUsd: expandDecimals(2, USD_DECIMALS),
        fundingFeeAmount: expandDecimals(4, usdc.decimals),
      } as PositionInfo,
    });

    // 5 ETH at 1 200 = 6 000 of size: 0.05% position fee 3, 0.1% ui fee 6, borrowing 2, funding 4 USDC
    expect(values.sizeDeltaUsd).toBe(expandDecimals(6_000, USD_DECIMALS));
    expect(values.positionFeeUsd).toBe(expandDecimals(3, USD_DECIMALS));
    expect(values.uiFeeUsd).toBe(expandDecimals(6, USD_DECIMALS));
    expect(values.collateralDeltaUsd).toBe(-expandDecimals(15, USD_DECIMALS));
    expect(values.collateralDeltaAmount).toBe(-expandDecimals(15, usdc.decimals));
    expect(values.initialCollateralUsd).toBe(0n);
    expect(values.initialCollateralAmount).toBe(0n);
  });

  it("converts the fees at the trigger price for an index-token collateral", () => {
    const values = build({
      initialCollateralToken: eth,
      collateralToken: eth,
      triggerPrice: expandDecimals(1_000, USD_DECIMALS),
      limitOrderType: OrderType.LimitIncrease,
      position: {
        pendingBorrowingFeesUsd: expandDecimals(2, USD_DECIMALS),
        // 0.001 ETH, worth 1 at the trigger
        fundingFeeAmount: expandDecimals(1, 15),
      } as PositionInfo,
    });

    // 5 ETH at the 1 000 trigger = 5 000 of size: position fee 2.5, ui fee 5, borrowing 2, funding 1
    expect(values.collateralDeltaUsd).toBe(-expandDecimals(105, USD_DECIMALS - 1));
    // 10.5 / 1 000 = 0.0105 ETH
    expect(values.collateralDeltaAmount).toBe(-expandDecimals(105, 14));
    expect(values.initialCollateralUsd).toBe(0n);
  });

  it("leaves the collateral delta at zero without size or deposit", () => {
    const values = build({
      indexTokenAmount: 0n,
      position: { pendingBorrowingFeesUsd: expandDecimals(2, USD_DECIMALS), fundingFeeAmount: 0n } as PositionInfo,
    });

    expect(values.sizeDeltaUsd).toBe(0n);
    expect(values.collateralDeltaUsd).toBe(0n);
    expect(values.collateralDeltaAmount).toBe(0n);
  });
});

describe("getNextPositionValuesForIncreaseTrade — prices the existing collateral like the delta", () => {
  const tokensData = mockTokensData();
  const marketsInfoData = mockMarketsInfoData(tokensData, ["ETH-ETH-USDC"]);
  const marketInfo = marketsInfoData["ETH-ETH-USDC"];
  const eth = tokensData.ETH;
  const usdc = tokensData.USDC;
  const triggerPrice = expandDecimals(1_000, USD_DECIMALS);

  // 500 of collateral entering at the trigger
  const delta = {
    marketInfo,
    isLong: true,
    sizeDeltaUsd: expandDecimals(1_000, USD_DECIMALS),
    sizeDeltaInTokens: expandDecimals(1, eth.decimals),
    collateralDeltaUsd: expandDecimals(500, USD_DECIMALS),
    indexPrice: triggerPrice,
    positionPriceImpactDeltaUsd: 0n,
    showPnlInLeverage: false,
    minCollateralUsd: expandDecimals(1, USD_DECIMALS),
    userReferralInfo: undefined,
  };

  // 1 ETH of collateral, booked at the 1 200 mark
  const ethPosition = {
    sizeInUsd: expandDecimals(6_000, USD_DECIMALS),
    sizeInTokens: expandDecimals(5, eth.decimals),
    collateralAmount: expandDecimals(1, eth.decimals),
    collateralUsd: expandDecimals(1_200, USD_DECIMALS),
    pendingImpactAmount: 0n,
    pendingImpactUsd: 0n,
  } as PositionInfo;

  it("values an index-token collateral at the price the delta was valued at", () => {
    const atTrigger = getNextPositionValuesForIncreaseTrade({
      ...delta,
      collateralToken: eth,
      existingPosition: ethPosition,
      collateralDeltaAmount: expandDecimals(5, eth.decimals - 1),
      collateralPrice: triggerPrice,
    });

    // 1 ETH at 1 000 + 500
    expect(atTrigger.nextCollateralUsd).toBe(expandDecimals(1_500, USD_DECIMALS));
  });

  it("keeps the mark-based value without the price", () => {
    const atMark = getNextPositionValuesForIncreaseTrade({
      ...delta,
      collateralToken: eth,
      existingPosition: ethPosition,
      collateralDeltaAmount: expandDecimals(5, eth.decimals - 1),
    });

    // 1 200 + 500
    expect(atMark.nextCollateralUsd).toBe(expandDecimals(1_700, USD_DECIMALS));
  });

  it("changes nothing for a stable collateral", () => {
    const usdcPosition = {
      ...ethPosition,
      collateralAmount: expandDecimals(1_000, usdc.decimals),
      collateralUsd: expandDecimals(1_000, USD_DECIMALS),
    } as PositionInfo;

    const usdcDelta = {
      ...delta,
      collateralToken: usdc,
      existingPosition: usdcPosition,
      collateralDeltaAmount: expandDecimals(500, usdc.decimals),
    };

    const withPrice = getNextPositionValuesForIncreaseTrade({ ...usdcDelta, collateralPrice: usdc.prices.minPrice });
    const withoutPrice = getNextPositionValuesForIncreaseTrade(usdcDelta);

    expect(withPrice.nextCollateralUsd).toBe(expandDecimals(1_500, USD_DECIMALS));
    expect(withoutPrice.nextCollateralUsd).toBe(expandDecimals(1_500, USD_DECIMALS));
  });
});

describe("getIncreasePositionAmounts — funding fee is a fixed token amount", () => {
  const tokensData = mockTokensData();
  const marketsInfoData = mockMarketsInfoData(tokensData, ["ETH-ETH-USDC"]);
  const marketInfo = marketsInfoData["ETH-ETH-USDC"];
  const eth = tokensData.ETH;
  const triggerPrice = expandDecimals(1_000, USD_DECIMALS);

  // 0.01 ETH of funding owed, 12 at the 1 200 mark
  const fundingFeeAmount = expandDecimals(1, 16);

  const build = (overrides: Partial<Parameters<typeof getIncreasePositionAmounts>[0]>) =>
    getIncreasePositionAmounts({
      marketInfo,
      indexToken: eth,
      initialCollateralToken: eth,
      collateralToken: eth,
      isLong: true,
      initialCollateralAmount: expandDecimals(1, eth.decimals),
      indexTokenAmount: expandDecimals(5, eth.decimals),
      position: {
        pendingBorrowingFeesUsd: 0n,
        fundingFeeAmount,
        pendingFundingFeesUsd: expandDecimals(12, USD_DECIMALS),
      } as PositionInfo,
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

  it("re-prices the owed tokens at the trigger for a resting order", () => {
    const values = build({});

    // 0.01 ETH at 1 000
    expect(values.fundingFeeUsd).toBe(expandDecimals(10, USD_DECIMALS));

    const withoutFunding = build({
      position: { pendingBorrowingFeesUsd: 0n, fundingFeeAmount: 0n, pendingFundingFeesUsd: 0n } as PositionInfo,
    });

    const fundingTokens = withoutFunding.collateralDeltaAmount - values.collateralDeltaAmount;
    expect(bigMath.abs(fundingTokens - fundingFeeAmount)).toBeLessThanOrEqual(1n);
  });

  it("matches the mark-priced pending fee for a market order", () => {
    const values = build({ triggerPrice: undefined, limitOrderType: undefined });

    expect(values.fundingFeeUsd).toBe(expandDecimals(12, USD_DECIMALS));
  });
});
