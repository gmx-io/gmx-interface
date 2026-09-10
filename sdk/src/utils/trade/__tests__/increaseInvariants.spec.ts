import { describe, expect, it } from "vitest";

import { ARBITRUM } from "configs/chains";
import { BASIS_POINTS_DIVISOR_BIGINT } from "configs/factors";
import { mockMarketsInfoData, mockTokensData } from "test/mock";
import { USD_DECIMALS, expandDecimals } from "utils/numbers";
import { OrderType } from "utils/orders/types";
import { getIncreaseEvaluationIndexPrice, getMarkPrice } from "utils/prices";
import { convertToTokenAmount, convertToTokenAmountForIncrease, convertToUsd } from "utils/tokens";
import type { TokenData } from "utils/tokens/types";
import type { ExternalSwapQuoteParams } from "utils/trade/types";

import { getIncreasePositionAmounts } from "../increase";

/**
 * Deterministic PRNG — fast-check is not a dependency, and a fixed seed keeps a failing
 * case reproducible from the run alone.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;

  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SEED = 20260820;

const ORDER_TYPES = [OrderType.MarketIncrease, OrderType.LimitIncrease, OrderType.StopIncrease] as const;

describe("getIncreasePositionAmounts — one price for sizing and for evaluation", () => {
  // a spread makes the long/short sides of the mark price distinguishable
  const tokensData = mockTokensData({
    ETH: { prices: { minPrice: expandDecimals(1180, USD_DECIMALS), maxPrice: expandDecimals(1220, USD_DECIMALS) } },
  });
  const marketsInfoData = mockMarketsInfoData(tokensData, ["ETH-ETH-USDC"]);
  const marketInfo = marketsInfoData["ETH-ETH-USDC"];

  const eth = tokensData.ETH;
  const usdc = tokensData.USDC;

  function getAmounts(p: {
    orderType: (typeof ORDER_TYPES)[number];
    triggerPrice: bigint | undefined;
    isLong: boolean;
    strategy: "independent" | "leverageByCollateral";
    initialCollateralAmount: bigint;
    indexTokenAmount: bigint;
    leverage: bigint;
  }) {
    const limitOrderType = p.orderType === OrderType.MarketIncrease ? undefined : p.orderType;

    return getIncreasePositionAmounts({
      marketInfo,
      indexToken: eth,
      initialCollateralToken: usdc,
      collateralToken: usdc,
      isLong: p.isLong,
      initialCollateralAmount: p.initialCollateralAmount,
      indexTokenAmount: p.indexTokenAmount,
      position: undefined,
      externalSwapQuote: undefined,
      userReferralInfo: undefined,
      strategy: p.strategy,
      leverage: p.strategy === "leverageByCollateral" ? p.leverage : undefined,
      triggerPrice: p.triggerPrice,
      limitOrderType,
      findSwapPath: (() => undefined) as never,
      uiFeeFactor: 0n,
      marketsInfoData,
      chainId: ARBITRUM,
      externalSwapQuoteParams: undefined,
      isSetAcceptablePriceImpactEnabled: false,
    });
  }

  it("sizes every order at the price its resulting position is evaluated at", () => {
    const random = mulberry32(SEED);
    let checked = 0;

    for (let i = 0; i < 400; i++) {
      const orderType = ORDER_TYPES[i % ORDER_TYPES.length];
      const isLong = random() < 0.5;
      const strategy = random() < 0.5 ? "independent" : "leverageByCollateral";

      const markPrice = getMarkPrice({ prices: eth.prices, isIncrease: true, isLong });
      // ±10% around the mark, so both the executable-now and the resting side are hit
      const triggerFactorBps = 9000n + BigInt(Math.floor(random() * 2001));
      const triggerPrice =
        orderType === OrderType.MarketIncrease ? undefined : (markPrice * triggerFactorBps) / 10000n;

      const initialCollateralAmount = expandDecimals(100 + Math.floor(random() * 9900), usdc.decimals);
      const indexTokenAmount = convertToTokenAmount(
        expandDecimals(500 + Math.floor(random() * 50000), USD_DECIMALS),
        eth.decimals,
        markPrice
      )!;
      const leverage = BigInt(2 + Math.floor(random() * 30)) * BASIS_POINTS_DIVISOR_BIGINT;

      const values = getAmounts({
        orderType,
        triggerPrice,
        isLong,
        strategy,
        initialCollateralAmount,
        indexTokenAmount,
        leverage,
      });

      const evaluationPrice =
        getIncreaseEvaluationIndexPrice({
          orderType,
          triggerPrice,
        }) ?? markPrice;

      const context = `${OrderType[orderType]} ${isLong ? "long" : "short"} ${strategy} trigger=${triggerPrice}`;

      expect(values.indexPrice, context).toBe(evaluationPrice);
      expect(values.sizeDeltaInTokens, context).toBe(
        convertToTokenAmountForIncrease(values.sizeDeltaUsd, eth.decimals, evaluationPrice, isLong)
      );
      expect(values.sizeDeltaUsd, context).toBeGreaterThan(0n);

      checked++;
    }

    expect(checked).toBe(400);
  });

  it("keeps the resting limit sized at its trigger while the mark has crossed it", () => {
    // the executable-now window: a long limit whose trigger sits above the current mark
    const markPrice = getMarkPrice({ prices: eth.prices, isIncrease: true, isLong: true });
    const triggerPrice = (markPrice * 110n) / 100n;

    const values = getAmounts({
      orderType: OrderType.LimitIncrease,
      triggerPrice,
      isLong: true,
      strategy: "independent",
      initialCollateralAmount: expandDecimals(1000, usdc.decimals),
      indexTokenAmount: convertToTokenAmount(expandDecimals(10_000, USD_DECIMALS), eth.decimals, markPrice)!,
      leverage: 10n * BASIS_POINTS_DIVISOR_BIGINT,
    });

    expect(getIncreaseEvaluationIndexPrice({ orderType: OrderType.LimitIncrease, triggerPrice })).toBe(triggerPrice);
    expect(values.indexPrice).toBe(triggerPrice);
  });
});

describe("getIncreasePositionAmounts — both swap-strategy paths agree on equivalent tokens", () => {
  /**
   * The tradebox always passes `externalSwapQuoteParams` (→ `buildSwapStrategy`), the order
   * editor and the orders list never do (→ `getSwapAmountsByFromValueDefault`). For tokens that
   * need no route the two must value the deposit identically — the contract credits it whole.
   */
  function getAmounts(p: {
    tokensData: ReturnType<typeof mockTokensData>;
    marketKey: string;
    indexToken: TokenData;
    initialCollateralToken: TokenData;
    collateralToken: TokenData;
    initialCollateralAmount: bigint;
    indexTokenAmount: bigint;
    isLong: boolean;
    strategy: "independent" | "leverageByCollateral";
    leverage: bigint;
    uiFeeFactor: bigint;
    externalSwapQuoteParams: ExternalSwapQuoteParams | undefined;
  }) {
    const marketsInfoData = mockMarketsInfoData(p.tokensData, [p.marketKey]);

    return getIncreasePositionAmounts({
      marketInfo: marketsInfoData[p.marketKey],
      indexToken: p.indexToken,
      initialCollateralToken: p.initialCollateralToken,
      collateralToken: p.collateralToken,
      isLong: p.isLong,
      initialCollateralAmount: p.initialCollateralAmount,
      indexTokenAmount: p.indexTokenAmount,
      position: undefined,
      externalSwapQuote: undefined,
      userReferralInfo: undefined,
      strategy: p.strategy,
      leverage: p.strategy === "leverageByCollateral" ? p.leverage : undefined,
      findSwapPath: (() => undefined) as never,
      uiFeeFactor: p.uiFeeFactor,
      marketsInfoData,
      chainId: ARBITRUM,
      externalSwapQuoteParams: p.externalSwapQuoteParams,
      isSetAcceptablePriceImpactEnabled: false,
    });
  }

  it("values the deposit the same with and without the external-swap params", () => {
    const random = mulberry32(SEED + 1);
    let sameToken = 0;
    let nativeToWrapped = 0;

    for (let i = 0; i < 200; i++) {
      // a spread is what a re-valuation haircut would show up as
      const spreadBps = BigInt(Math.floor(random() * 500));
      const ethMin = expandDecimals(1200, USD_DECIMALS);
      const ethMax = ethMin + (ethMin * spreadBps) / 10000n;
      const avaxMin = expandDecimals(12, USD_DECIMALS);
      const avaxMax = avaxMin + (avaxMin * spreadBps) / 10000n;

      const tokensData = mockTokensData({
        ETH: { prices: { minPrice: ethMin, maxPrice: ethMax } },
        // the mock spreads the AVAX override onto WAVAX too, so both sides of the pair move
        AVAX: { prices: { minPrice: avaxMin, maxPrice: avaxMax } },
      });

      const isNativePair = i % 2 === 0;
      const marketKey = isNativePair ? "AVAX-AVAX-USDC" : "ETH-ETH-USDC";
      const indexToken = isNativePair ? tokensData.AVAX : tokensData.ETH;
      // AVAX is native with `wrappedAddress: WAVAX` — equivalent, so no route is needed
      const initialCollateralToken = isNativePair ? tokensData.AVAX : tokensData.ETH;
      const collateralToken = isNativePair ? tokensData.WAVAX : tokensData.ETH;

      const isLong = random() < 0.5;
      const strategy = random() < 0.5 ? "independent" : "leverageByCollateral";
      const uiFeeFactor = random() < 0.5 ? 0n : expandDecimals(1, 27);
      const depositTargetUsd = expandDecimals(1000 + Math.floor(random() * 20000), USD_DECIMALS);
      const initialCollateralAmount = convertToTokenAmount(
        depositTargetUsd,
        initialCollateralToken.decimals,
        initialCollateralToken.prices.minPrice
      )!;
      const indexTokenAmount = convertToTokenAmount(
        depositTargetUsd * BigInt(2 + Math.floor(random() * 20)),
        indexToken.decimals,
        indexToken.prices.maxPrice
      )!;
      const leverage = BigInt(2 + Math.floor(random() * 30)) * BASIS_POINTS_DIVISOR_BIGINT;

      const shared = {
        tokensData,
        marketKey,
        indexToken,
        initialCollateralToken,
        collateralToken,
        initialCollateralAmount,
        indexTokenAmount,
        isLong,
        strategy,
        leverage,
        uiFeeFactor,
      } as const;

      const withParams = getAmounts({ ...shared, externalSwapQuoteParams: {} as ExternalSwapQuoteParams });
      const withoutParams = getAmounts({ ...shared, externalSwapQuoteParams: undefined });

      const depositUsd = convertToUsd(
        initialCollateralAmount,
        initialCollateralToken.decimals,
        initialCollateralToken.prices.minPrice
      )!;

      const context = `${isNativePair ? "native→wrapped" : "same-token"} ${strategy} spread=${spreadBps}`;

      expect(withParams.collateralDeltaUsd, context).toBe(withoutParams.collateralDeltaUsd);
      expect(withParams.sizeDeltaUsd, context).toBe(withoutParams.sizeDeltaUsd);
      // no haircut: the whole deposit reaches the position, minus the position-level fees only
      expect(withParams.collateralDeltaUsd, context).toBe(
        depositUsd - withParams.positionFeeUsd - withParams.uiFeeUsd
      );
      expect(withParams.swapUiFeeUsd, context).toBe(0n);

      if (isNativePair) {
        nativeToWrapped++;
      } else {
        sameToken++;
      }
    }

    expect(sameToken).toBeGreaterThan(0);
    expect(nativeToWrapped).toBeGreaterThan(0);
  });
});
