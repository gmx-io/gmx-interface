import { describe, expect, it } from "vitest";

import { ARBITRUM } from "configs/chainIds";
import { mockMarginCheckMarketInfo, mockTokensData } from "test/mock";
import { getPositionFee, getPriceImpactUsd, GmsolPriceImpactError } from "utils/fees";
import type { MarketInfo } from "utils/markets/types";
import { PRECISION } from "utils/numbers";
import { DecreasePositionSwapType, OrderType, SwapPricingType } from "utils/orders/types";
import { getPositionInfo } from "utils/positions";
import type { PositionInfoLoaded } from "utils/positions/types";
import { getAcceptablePriceInfo } from "utils/prices";
import { createSwapEstimator, getBestSwapPath } from "utils/swap/swapRouting";
import { getSwapPathStats } from "utils/swap/swapStats";
import { getDecreasePositionAmounts, getOptimalDecreaseAndSwapAmounts } from "utils/trade/decrease";
import {
  getDecreaseResultingPositionMarginState,
  getTriggerDecreaseRemainingPositionMarginState,
} from "utils/trade/decreaseMarginCheck";
import { getIncreasePositionAmounts } from "utils/trade/increase";
import { getIncreaseResultingPositionState, getResultingPositionMarginState } from "utils/trade/increaseMarginCheck";
import { getTwapIncreasePartsGrossCollateralUsd } from "utils/trade/twapIncreaseMarginCheck";

const P = PRECISION;

function market(p: {
  decimals: number;
  minPrice: bigint;
  maxPrice: bigint;
  overrides?: Record<string, bigint>;
  tradeMath?: "gmsol";
}): MarketInfo {
  const tokens = mockTokensData({
    BTC: { decimals: p.decimals, prices: { minPrice: p.minPrice, maxPrice: p.maxPrice } },
  });
  return {
    ...mockMarginCheckMarketInfo(tokens, { positionImpactPoolAmount: 0n, ...p.overrides }),
    tradeMath: p.tradeMath,
    minCollateralUsd: 0n,
    minPositionSizeUsd: 0n,
  };
}

function increase(marketInfo: MarketInfo, isLong: boolean, collateralAmount: bigint, trigger?: bigint, fixed?: bigint) {
  return getIncreasePositionAmounts({
    marketInfo,
    indexToken: marketInfo.indexToken,
    initialCollateralToken: marketInfo.shortToken,
    collateralToken: marketInfo.shortToken,
    isLong,
    initialCollateralAmount: collateralAmount,
    indexTokenAmount: undefined,
    leverage: 10_000n,
    position: undefined,
    externalSwapQuote: undefined,
    userReferralInfo: undefined,
    strategy: "leverageByCollateral",
    findSwapPath: () => undefined,
    uiFeeFactor: 0n,
    marketsInfoData: { [marketInfo.marketTokenAddress]: marketInfo },
    chainId: ARBITRUM,
    externalSwapQuoteParams: undefined,
    limitOrderType: trigger === undefined ? undefined : OrderType.LimitIncrease,
    triggerPrice: trigger,
    fixedAcceptablePriceImpactBps: fixed,
    acceptablePriceImpactBuffer: 30,
    isSetAcceptablePriceImpactEnabled: true,
  });
}

function positionInfo(marketInfo: MarketInfo, sizeInUsd: bigint, sizeInTokens: bigint, isLong = true) {
  const value =
    (sizeInTokens * (isLong ? marketInfo.indexToken.prices.minPrice : marketInfo.indexToken.prices.maxPrice)) /
    10n ** BigInt(marketInfo.indexToken.decimals);
  return getPositionInfo({
    marketInfo,
    minCollateralUsd: 0n,
    position: {
      key: "position",
      contractKey: "position",
      account: "account",
      marketAddress: marketInfo.marketTokenAddress,
      collateralTokenAddress: marketInfo.shortToken.address,
      sizeInUsd,
      sizeInTokens,
      collateralAmount: 100_000_000n,
      pendingBorrowingFeesUsd: 0n,
      increasedAtTime: 0n,
      decreasedAtTime: 0n,
      isLong,
      fundingFeeAmount: 0n,
      claimableLongTokenAmount: 0n,
      claimableShortTokenAmount: 0n,
      pnl: isLong ? value - sizeInUsd : sizeInUsd - value,
      positionValueInUsd: value,
      positionFeeAmount: 0n,
      traderDiscountAmount: 0n,
      uiFeeAmount: 0n,
      pendingImpactAmount: 0n,
      data: "",
    },
  }) as PositionInfoLoaded;
}

describe("gmsol trade math", () => {
  it("deducts increase fees in collateral token atoms FESOL-57", () => {
    const marketInfo = market({
      decimals: 8,
      minPrice: 60000n * P,
      maxPrice: 60000n * P,
      tradeMath: "gmsol",
      overrides: {
        positionFeeFactorForBalanceWasImproved: P / 2500n,
        positionFeeFactorForBalanceWasNotImproved: P / 2500n,
      },
    });
    const result = getIncreasePositionAmounts({
      marketInfo,
      indexToken: marketInfo.indexToken,
      initialCollateralToken: marketInfo.longToken,
      collateralToken: marketInfo.longToken,
      isLong: true,
      initialCollateralAmount: 100000n,
      indexTokenAmount: 1667083n,
      position: undefined,
      externalSwapQuote: undefined,
      userReferralInfo: undefined,
      strategy: "independent",
      findSwapPath: () => undefined,
      uiFeeFactor: 0n,
      marketsInfoData: { [marketInfo.marketTokenAddress]: marketInfo },
      chainId: ARBITRUM,
      externalSwapQuoteParams: undefined,
      isSetAcceptablePriceImpactEnabled: false,
    });
    expect(result.sizeDeltaUsd).toBe((10002498n * P) / 10000n);
    expect(result.positionFeeUsd).toBe((40009992n * P) / 100000000n);
    expect(result.collateralDeltaAmount).toBe(99334n);
    expect(result.collateralDeltaUsd).toBe((596004n * P) / 10000n);
  });

  it("values trigger collateral and funding at the execution price FESOL-57", () => {
    const marketInfo = market({ decimals: 8, minPrice: 50000n * P, maxPrice: 50000n * P, tradeMath: "gmsol" });
    const position = getPositionInfo({
      marketInfo,
      minCollateralUsd: 0n,
      position: {
        ...positionInfo(marketInfo, 600n * P, 1000000n),
        collateralTokenAddress: marketInfo.longTokenAddress,
        collateralAmount: 100000n,
        fundingFeeAmount: 1000n,
      },
    }) as PositionInfoLoaded;
    const result = getDecreasePositionAmounts({
      marketInfo,
      collateralToken: marketInfo.longToken,
      isLong: true,
      position,
      closeSizeUsd: position.sizeInUsd,
      keepLeverage: false,
      userReferralInfo: undefined,
      minCollateralUsd: 0n,
      minPositionSizeUsd: 0n,
      uiFeeFactor: 0n,
      isSetAcceptablePriceImpactEnabled: false,
      forceDecreaseSwapType: DecreasePositionSwapType.NoSwap,
      triggerOrderType: OrderType.LimitDecrease,
      triggerPrice: 60000n * P,
    });
    expect(result.fundingFeeUsd).toBe((6n * P) / 10n);
    expect(result.collateralDeltaUsd).toBe(60n * P);
    expect(result.receiveTokenAmount).toBe(99000n);
    expect(result.receiveUsd).toBe((594n * P) / 10n);
    expect(position.pendingFundingFeesUsd).toBe(P / 2n);
  });

  it("settles each collateral shortfall in PnL token atoms FESOL-57", () => {
    const size = (250125n * P) / 100n;
    for (const [
      markPrice,
      triggerPrice,
      isTwap,
      fundingFeeAmount,
      feeFactor,
      pnlAmount,
      collateralAmount,
      pnlUsd,
      unpaidUsd,
    ] of [
      [60000n * P, undefined, false, 10_000_300n, P / 2500n, 829583n, 0n, (4977498n * P) / 10000n, 0n],
      [60000n * P, 60000n * P, false, 10_000_300n, P / 2500n, 829583n, 0n, (4977498n * P) / 10000n, 0n],
      [60000n * P, undefined, true, 10_000_300n, P / 2500n, 829583n, 0n, (4977498n * P) / 10000n, 0n],
      [50000n * P, 60000n * P, false, 0n, 0n, 831250n, 10_000_000n, (49875n * P) / 100n, 0n],
      [60000n * P, undefined, false, 509_750_000n, 0n, 0n, 0n, 0n, (9996n * P) / 10000n],
    ] as const) {
      const marketInfo = market({
        decimals: 8,
        minPrice: markPrice,
        maxPrice: markPrice,
        tradeMath: "gmsol",
        overrides: {
          longInterestUsd: size,
          shortInterestUsd: size,
          longInterestInTokens: 5_000_000n,
          shortInterestInTokens: 5_000_000n,
          longPoolAmount: 100n * 10n ** 8n,
          shortPoolAmount: 1_000_000n * 10n ** 6n,
          maxPnlFactorForTradersLong: P,
          positionFeeFactorForBalanceWasImproved: feeFactor,
          positionFeeFactorForBalanceWasNotImproved: feeFactor,
        },
      });
      const position = getPositionInfo({
        marketInfo,
        minCollateralUsd: 0n,
        position: {
          ...positionInfo(marketInfo, size, 5_000_000n),
          collateralAmount: 10_000_000n,
          fundingFeeAmount,
        },
      }) as PositionInfoLoaded;
      const result = getDecreasePositionAmounts({
        marketInfo,
        collateralToken: marketInfo.shortToken,
        isLong: true,
        position,
        closeSizeUsd: size,
        keepLeverage: false,
        userReferralInfo: undefined,
        minCollateralUsd: 0n,
        minPositionSizeUsd: 0n,
        uiFeeFactor: 0n,
        isSetAcceptablePriceImpactEnabled: false,
        forceDecreaseSwapType: DecreasePositionSwapType.NoSwap,
        triggerOrderType: triggerPrice === undefined ? undefined : OrderType.LimitDecrease,
        triggerPrice,
        isTwap,
      });
      expect(result.primaryOutput).toEqual({
        tokenAddress: marketInfo.longTokenAddress,
        amount: pnlAmount,
        usd: pnlUsd,
      });
      expect(result.secondaryOutput.amount).toBe(collateralAmount);
      expect(result.payedRemainingCollateralAmount).toBe(10_000_000n - collateralAmount);
      expect(result.unpaidCostUsd).toBe(unpaidUsd);
      expect(marketInfo.indexToken.prices.minPrice).toBe(markPrice);
    }
  });

  it("values a gmsol close with the impact withheld beyond the cap FESOL-57", () => {
    for (const tradeMath of ["gmsol", undefined] as const) {
      const marketInfo = market({
        decimals: 8,
        minPrice: P,
        maxPrice: P,
        tradeMath,
        overrides: {
          longInterestUsd: 100n * P,
          shortInterestUsd: 100n * P,
          longInterestInTokens: 100n * 10n ** 8n,
          shortInterestInTokens: 100n * 10n ** 8n,
          positionImpactFactorNegative: 2n * 10n ** 27n,
          maxPositionImpactFactorNegative: 5n * 10n ** 28n,
        },
      });
      const position = positionInfo(marketInfo, 100n * P, 100n * 10n ** 8n);
      const close = getDecreasePositionAmounts({
        marketInfo,
        collateralToken: marketInfo.shortToken,
        isLong: true,
        position,
        closeSizeUsd: position.sizeInUsd,
        keepLeverage: false,
        userReferralInfo: undefined,
        minCollateralUsd: 0n,
        minPositionSizeUsd: 0n,
        uiFeeFactor: 0n,
        isSetAcceptablePriceImpactEnabled: false,
      });

      expect(position.closePriceImpactDeltaUsd).toBe(close.closePriceImpactDeltaUsd);
      expect(position.closePriceImpactDeltaUsd).toBeLessThan(-19n * P);
      expect(position.netPriceImapctDeltaUsd).toBe(tradeMath ? -5n * P : position.closePriceImpactDeltaUsd);
      expect(position.netValueAfterAllFees).toBe(position.collateralUsd + position.closePriceImpactDeltaUsd);
      expect(position.pnlAfterAllFees).toBe(position.closePriceImpactDeltaUsd);
      expect(position.netValueAfterAllFees - close.receiveUsd).toBeLessThanOrEqual(10n ** 24n);
      expect(close.receiveUsd - position.netValueAfterAllFees).toBeLessThanOrEqual(10n ** 24n);
    }
  });

  it("rejects gmsol increases that fill no index token atoms FESOL-57", () => {
    const imbalanced = {
      longInterestUsd: 1000n * P,
      longInterestInTokens: 5n * 10n ** 6n,
      positionImpactFactorNegative: 10n ** 25n,
      positionImpactExponentFactorNegative: P,
    };
    for (const { name, overrides, collateralAmount } of [
      { name: "below one atom", overrides: {}, collateralAmount: 100n },
      { name: "one atom consumed by impact", overrides: imbalanced, collateralAmount: 300n },
      { name: "below one atom with impact", overrides: imbalanced, collateralAmount: 100n },
    ]) {
      const marketInfo = market({
        decimals: 8,
        minPrice: 20_000n * P,
        maxPrice: 20_000n * P,
        overrides,
        tradeMath: "gmsol",
      });
      const values = increase(marketInfo, true, collateralAmount);
      const sizeDeltaUsd = collateralAmount * 10n ** 24n;

      expect([name, values.sizeDeltaUsd, values.sizeDeltaInTokens, values.acceptablePrice]).toEqual([name, 0n, 0n, 0n]);
      expect(
        getIncreaseResultingPositionState({
          marketInfo,
          collateralToken: marketInfo.shortToken,
          isLong: true,
          existingPosition: {
            sizeInUsd: 100n * P,
            sizeInTokens: 5n * 10n ** 5n,
            collateralAmount: 100n * 10n ** 6n,
            pendingImpactAmount: 0n,
          },
          sizeDeltaUsd,
          sizeDeltaInTokens: 1n,
          collateralDeltaAmount: collateralAmount,
          minCollateralUsd: 0n,
          userReferralInfo: undefined,
        })
      ).toBeUndefined();
    }
  });

  it("rounds decrease execution adjustments in native price units FESOL-57", () => {
    for (const { isLong, improved, cap, expectedUnitPrice } of [
      { isLong: true, improved: false, cap: P, expectedUnitPrice: 74_750_000_000n },
      { isLong: false, improved: true, cap: P, expectedUnitPrice: 76_850_000_000n },
      { isLong: true, improved: false, cap: P / 100n, expectedUnitPrice: 79_000_000_000n },
      { isLong: false, improved: true, cap: P / 100n, expectedUnitPrice: 79_000_000_000n },
    ]) {
      const sideOi = improved ? 200n : 100n;
      const otherOi = improved ? 100n : 200n;
      const marketInfo = market({
        decimals: 9,
        minPrice: (4n * P) / 5n,
        maxPrice: (4n * P) / 5n,
        tradeMath: "gmsol",
        overrides: {
          longInterestUsd: (isLong ? sideOi : otherOi) * P,
          shortInterestUsd: (isLong ? otherOi : sideOi) * P,
          positionImpactFactorPositive: (21n * P) / 100_000n,
          positionImpactFactorNegative: (21n * P) / 100_000n,
          positionImpactExponentFactorPositive: 2n * P,
          positionImpactExponentFactorNegative: 2n * P,
          positionImpactPoolAmount: 10_000_000_000n,
          maxPositionImpactFactorPositive: cap,
          maxPositionImpactFactorNegative: cap,
        },
      });
      for (const sizeDeltaInTokens of [undefined, 0n, 50_000_000_000n]) {
        const result = getAcceptablePriceInfo({
          marketInfo,
          isIncrease: false,
          isLimit: false,
          isLong,
          indexPrice: (4n * P) / 5n,
          sizeDeltaUsd: 50n * P,
          sizeDeltaInTokens,
          positionSizeInUsd: 100n * P,
          positionSizeInTokens: 99_999_999_999n,
        });
        expect(result.acceptablePrice).toBe(expectedUnitPrice * 10n ** 19n);
      }
    }
  });

  it("evaluates gmsol limit increases at the trigger and covers the execution FESOL-57", () => {
    for (const { isLong, isLimit, indexPrice, atoms } of [
      { isLong: true, isLimit: false, indexPrice: 110n * P, atoms: 889n },
      { isLong: false, isLimit: false, indexPrice: 90n * P, atoms: 1111n },
      { isLong: true, isLimit: true, indexPrice: 100n * P, atoms: 980n },
      { isLong: false, isLimit: true, indexPrice: 100n * P, atoms: 1000n },
    ]) {
      const marketInfo = market({
        decimals: 2,
        minPrice: 90n * P,
        maxPrice: 110n * P,
        tradeMath: "gmsol",
        overrides: {
          longInterestUsd: 100n * P,
          shortInterestUsd: 100n * P,
          positionImpactFactorNegative: P / 100n,
          positionImpactExponentFactorNegative: P,
        },
      });
      const result = getAcceptablePriceInfo({
        marketInfo,
        isIncrease: true,
        isLimit,
        isLong,
        indexPrice,
        sizeDeltaUsd: 990n * P,
      });

      expect(result.acceptablePrice).toBe((990n * P * 100n) / atoms);
      expect(marketInfo.indexToken.prices).toEqual({ minPrice: 90n * P, maxPrice: 110n * P });
    }

    for (const { tradeMath, isLong, decimals, price, factor, exponent, minBps } of [
      { tradeMath: "gmsol", isLong: true, decimals: 6, price: P, factor: P / 1000n, exponent: 2n * P, minBps: 1142n },
      { tradeMath: "gmsol", isLong: false, decimals: 6, price: P, factor: P / 1000n, exponent: 2n * P, minBps: 940n },
      { tradeMath: "gmsol", isLong: true, decimals: 2, price: 3n * P, factor: 0n, exponent: P, minBps: 132n },
      { tradeMath: "gmsol", isLong: false, decimals: 2, price: 3n * P, factor: 0n, exponent: P, minBps: 227n },
      { tradeMath: undefined, isLong: true, decimals: 2, price: 3n * P, factor: 0n, exponent: P, minBps: 30n },
    ] as const) {
      const marketInfo = market({
        decimals,
        minPrice: price,
        maxPrice: price,
        tradeMath,
        overrides: {
          longInterestUsd: 100n * P,
          shortInterestUsd: 100n * P,
          positionImpactFactorNegative: factor,
          positionImpactExponentFactorNegative: exponent,
          maxPositionImpactFactorNegative: P / 2n,
        },
      });
      const sizeDeltaUsd = (decimals === 6 ? 100n : 1n) * P;
      const values = increase(marketInfo, isLong, sizeDeltaUsd / 10n ** 24n, price);
      const execution = (values.sizeDeltaUsd * 10n ** BigInt(decimals)) / values.sizeDeltaInTokens;
      const bufferUsd = (price * 30n) / 10_000n;

      expect(values.recommendedAcceptablePriceDeltaBps).toBe(minBps);
      if (tradeMath) {
        expect(isLong ? values.acceptablePrice - execution : execution - values.acceptablePrice).toBeGreaterThanOrEqual(
          bufferUsd
        );
      }
    }

    const fixedMarket = market({
      decimals: 6,
      minPrice: P,
      maxPrice: P,
      tradeMath: "gmsol",
      overrides: {
        longInterestUsd: 100n * P,
        shortInterestUsd: 100n * P,
        positionImpactFactorNegative: P / 1000n,
        positionImpactExponentFactorNegative: 2n * P,
      },
    });
    const fixed = increase(fixedMarket, true, 100_000_000n, P, 500n);

    expect(fixed.acceptablePrice).toBe((105n * P) / 100n);
  });
  it("preserves native partial-close boundaries and zero UI fees FESOL-57", () => {
    for (const { tradeMath, price, size, closeSize, units, minimum, full, withdrawal } of [
      {
        tradeMath: "gmsol",
        price: 94n * P,
        size: 1000n * P,
        closeSize: 500n * P,
        units: 10_000_000_000n,
        minimum: 0n,
        full: false,
        withdrawal: 20n * P,
      },
      {
        tradeMath: "gmsol",
        price: 92n * P,
        size: 1000n * P,
        closeSize: 500n * P,
        units: 10_000_000_000n,
        minimum: 0n,
        full: false,
        withdrawal: 10n * P,
      },
      {
        tradeMath: "gmsol",
        price: (91998n * P) / 1000n,
        size: 1000n * P,
        closeSize: 500n * P,
        units: 10_000_000_000n,
        minimum: 0n,
        full: true,
        withdrawal: 100n * P,
      },
      {
        tradeMath: undefined,
        price: 94n * P,
        size: 1000n * P,
        closeSize: 500n * P,
        units: 10_000_000_000n,
        minimum: 0n,
        full: false,
        withdrawal: 20n * P,
      },
      {
        tradeMath: "gmsol",
        price: 100n * P,
        size: 10n * P,
        closeSize: (95n * P) / 10n,
        units: 100_000_000n,
        minimum: P / 10n,
        full: false,
        withdrawal: 0n,
      },
      {
        tradeMath: undefined,
        price: 100n * P,
        size: 10n * P,
        closeSize: (95n * P) / 10n,
        units: 100_000_000n,
        minimum: P / 10n,
        full: true,
        withdrawal: 100n * P,
      },
    ] as const) {
      const marketInfo = market({
        decimals: 9,
        minPrice: price,
        maxPrice: price,
        tradeMath,
        overrides: { minCollateralFactor: P / 50n },
      });
      marketInfo.minCollateralUsd = 10n * P;
      marketInfo.minPositionSizeUsd = minimum;
      const position = positionInfo(marketInfo, size, units);
      const result = getDecreasePositionAmounts({
        marketInfo,
        collateralToken: marketInfo.shortToken,
        isLong: true,
        position,
        closeSizeUsd: closeSize,
        keepLeverage: size > 10n * P,
        userReferralInfo: undefined,
        minCollateralUsd: 10n * P,
        minPositionSizeUsd: minimum,
        uiFeeFactor: 0n,
        isSetAcceptablePriceImpactEnabled: false,
        forceDecreaseSwapType: DecreasePositionSwapType.NoSwap,
      });
      expect([result.isFullClose, result.sizeDeltaUsd, result.collateralDeltaUsd]).toEqual([
        full,
        full ? size : closeSize,
        withdrawal,
      ]);
    }

    for (const triggerOrderType of [undefined, OrderType.LimitDecrease] as const) {
      const marketInfo = market({
        decimals: 8,
        minPrice: 100n * P,
        maxPrice: 100n * P,
        tradeMath: "gmsol",
        overrides: {
          longInterestUsd: 1000n * P,
          shortInterestUsd: 1000n * P,
          positionImpactFactorNegative: P / 25n,
          positionImpactExponentFactorNegative: P,
          maxPositionImpactFactorNegative: P / 50n,
        },
      });
      const position = positionInfo(marketInfo, 1000n * P, 10n * 10n ** 8n);
      const result = getDecreasePositionAmounts({
        marketInfo,
        collateralToken: marketInfo.shortToken,
        isLong: true,
        position,
        closeSizeUsd: 500n * P,
        keepLeverage: true,
        userReferralInfo: undefined,
        minCollateralUsd: 0n,
        minPositionSizeUsd: 0n,
        uiFeeFactor: 0n,
        triggerOrderType,
        triggerPrice: 100n * P,
        isSetAcceptablePriceImpactEnabled: false,
        forceDecreaseSwapType: DecreasePositionSwapType.NoSwap,
      });
      expect(result.isFullClose).toBe(false);
      expect(result.closePriceImpactDeltaUsd).toBe(-20n * P);
      expect(result.priceImpactDiffUsd).toBe(10n * P);
      expect(result.collateralDeltaUsd).toBe(30n * P);
      expect(result.payedRemainingCollateralUsd).toBe(20n * P);
      expect(result.receiveUsd).toBe(20n * P);
    }

    for (const tradeMath of ["gmsol", undefined] as const) {
      const marketInfo = market({
        decimals: 8,
        minPrice: P,
        maxPrice: P,
        tradeMath,
        overrides: {
          swapFeeFactorForBalanceWasImproved: 0n,
          swapFeeFactorForBalanceWasNotImproved: 0n,
          swapImpactFactorPositive: 0n,
          swapImpactFactorNegative: 0n,
        },
      });
      const position = positionInfo(marketInfo, 100n * P, 100n * 10n ** 8n, false);
      const marketsInfoData = { [marketInfo.marketTokenAddress]: marketInfo };
      const findSwapPath = (usdIn: bigint) =>
        getSwapPathStats({
          marketsInfoData,
          swapPath: [marketInfo.marketTokenAddress],
          initialCollateralAddress: marketInfo.shortToken.address,
          wrappedNativeTokenAddress: "WETH",
          usdIn,
          shouldUnwrapNativeToken: false,
          shouldApplyPriceImpact: true,
          swapPricingType: SwapPricingType.Swap,
        });
      for (const uiFeeFactor of [0n, P / 100n]) {
        const result = getOptimalDecreaseAndSwapAmounts({
          marketInfo,
          collateralToken: marketInfo.shortToken,
          isLong: false,
          position,
          closeSizeUsd: position.sizeInUsd,
          keepLeverage: false,
          userReferralInfo: undefined,
          minCollateralUsd: 0n,
          minPositionSizeUsd: 0n,
          uiFeeFactor,
          isSetAcceptablePriceImpactEnabled: false,
          receiveToken: marketInfo.indexToken,
          findSwapPath,
          findSwapPathFromPnl: findSwapPath,
          marketsInfoData,
          chainId: ARBITRUM,
        });
        expect(result.swapAmounts?.usdOut).toBe(tradeMath || uiFeeFactor === 0n ? 100n * P : (9801n * P) / 100n);
        expect(result.decreaseAmounts.uiFeeUsd).toBe(tradeMath || uiFeeFactor === 0n ? 0n : P);
      }
    }

    const evm = market({
      decimals: 8,
      minPrice: P,
      maxPrice: P,
      overrides: {
        swapFeeFactorForBalanceWasImproved: 0n,
        swapFeeFactorForBalanceWasNotImproved: 0n,
        swapImpactFactorPositive: 0n,
        swapImpactFactorNegative: 0n,
      },
    });
    const marketsInfoData = {
      evm: { ...evm, marketTokenAddress: "evm" },
      gmsol: { ...evm, marketTokenAddress: "gmsol", tradeMath: "gmsol" as const },
    };
    for (const [swapPath, collateralToken, partUsd] of [
      [["evm"], evm.shortToken, 99n * P],
      [["gmsol"], evm.shortToken, 100n * P],
      [["gmsol", "evm"], evm.longToken, 99n * P],
    ] as const) {
      const parts = getTwapIncreasePartsGrossCollateralUsd({
        marketsInfoData,
        swapPath: [...swapPath],
        initialCollateralToken: evm.longToken,
        collateralToken,
        initialCollateralAmountPerPart: 100n * 10n ** 8n,
        numberOfParts: 2,
        uiFeeFactor: P / 100n,
        wrappedNativeTokenAddress: "WETH",
      });
      expect([swapPath, parts]).toEqual([swapPath, [partUsd, partUsd]]);
    }
  });

  it("settles gmsol closes, close margins and closing fees with native rounding FESOL-57", () => {
    for (const [tradeMath, priceDelta, longOi, impactFactor, capFactor, exponent, receive] of [
      ["gmsol", 0n, 100n, 200000005n * 10n ** 21n, P / 20n, 1n, 79_999_999n],
      [undefined, 0n, 100n, 200000005n * 10n ** 21n, P / 20n, 1n, 80_000_000n],
      ["gmsol", 0n, 100n, 20000001n * 10n ** 22n, 50000005n * 10n ** 21n, 1n, 79_999_998n],
      ["gmsol", -6n * 10n ** 21n, 100n, 6n * 10n ** 21n, P, 1n, 99_999_998n],
      ["gmsol", 6n * 10n ** 21n, 200n, 6n * 10n ** 21n, P, 1n, 100_000_000n],
      ["gmsol", 0n, 200n, 21n * 10n ** 25n, P, 2n, 102_100_000n],
      ["gmsol", 0n, 200n, 21n * 10n ** 23n, P, 3n, 102_100_000n],
      ["gmsol", 0n, 200n, 21n * 10n ** 21n, P, 4n, 102_100_000n],
      [undefined, 0n, 200n, 21n * 10n ** 25n, P, 2n, 102_099_999n],
    ] as const) {
      const marketInfo = market({
        decimals: 9,
        minPrice: P + priceDelta,
        maxPrice: P + priceDelta,
        tradeMath,
        overrides: {
          longInterestUsd: longOi * P,
          shortInterestUsd: 100n * P,
          longInterestInTokens: longOi * 10n ** 9n,
          shortInterestInTokens: 100n * 10n ** 9n,
          positionImpactPoolAmount: 10n * 10n ** 9n,
          positionImpactFactorPositive: impactFactor,
          positionImpactFactorNegative: impactFactor,
          positionImpactExponentFactorPositive: exponent * P,
          positionImpactExponentFactorNegative: exponent * P,
          maxPositionImpactFactorPositive: P,
          maxPositionImpactFactorNegative: capFactor,
          longPoolAmount: 1_000_000_000_000n,
          shortPoolAmount: 1_000_000_000_000n,
          maxPnlFactorForTradersLong: P,
        },
      });
      marketInfo.longToken = marketInfo.shortToken;
      marketInfo.longTokenAddress = marketInfo.shortTokenAddress;
      marketInfo.isSameCollaterals = true;
      const position = positionInfo(marketInfo, 100n * P, 100n * 10n ** 9n);
      const close = getDecreasePositionAmounts({
        marketInfo,
        collateralToken: marketInfo.shortToken,
        isLong: true,
        position,
        closeSizeUsd: position.sizeInUsd,
        keepLeverage: false,
        userReferralInfo: undefined,
        minCollateralUsd: 0n,
        minPositionSizeUsd: 0n,
        uiFeeFactor: 0n,
        isSetAcceptablePriceImpactEnabled: false,
        forceDecreaseSwapType: DecreasePositionSwapType.NoSwap,
      });
      expect([priceDelta, impactFactor, close.receiveTokenAmount]).toEqual([priceDelta, impactFactor, receive]);
    }

    for (const [tradeMath, minCollateralFactor, sizeDeltaUsd, withdrawal, expected] of [
      ["gmsol", P / 100n, 500n * P, 50_000_000n, undefined],
      [undefined, P / 100n, 500n * P, 50_000_000n, [false, true]],
      ["gmsol", P / 100n, 500n * P, 20_000_000n, [false, false]],
      ["gmsol", (15n * P) / 100n, 500n * P, 50_000_000n, [false, true]],
      ["gmsol", P / 100n, 0n, 50_000_000n, [true, false]],
    ] as const) {
      const marketInfo = market({
        decimals: 9,
        minPrice: P,
        maxPrice: P,
        tradeMath,
        overrides: { minCollateralFactor, longInterestUsd: 1000n * P, shortInterestUsd: 1000n * P },
      });
      marketInfo.minCollateralUsd = 75n * P;
      const params = {
        marketInfo,
        collateralToken: marketInfo.shortToken,
        isLong: true,
        position: positionInfo(marketInfo, 1000n * P, 1000n * 10n ** 9n),
        minCollateralUsd: 75n * P,
        minPositionSizeUsd: 0n,
        userReferralInfo: undefined,
      };
      const direct = getDecreaseResultingPositionMarginState({
        ...params,
        sizeDeltaUsd,
        sizeDeltaInTokens: sizeDeltaUsd / 10n ** 21n,
        collateralDeltaAmount: withdrawal,
        payedRemainingCollateralAmount: 0n,
        priceImpactDiffUsd: 0n,
      });
      const row = [tradeMath, minCollateralFactor, sizeDeltaUsd, withdrawal];
      expect([row, direct && [direct.isLiquidatable, direct.isCollateralWithdrawalCancelled]]).toEqual([row, expected]);

      if (sizeDeltaUsd > 0n) {
        const decreaseAmounts = getDecreasePositionAmounts({
          ...params,
          closeSizeUsd: sizeDeltaUsd,
          keepLeverage: false,
          uiFeeFactor: 0n,
          triggerOrderType: OrderType.LimitDecrease,
          triggerPrice: P,
          isSetAcceptablePriceImpactEnabled: false,
        });
        const stored = getTriggerDecreaseRemainingPositionMarginState({
          ...params,
          decreaseAmounts,
          collateralDeltaAmount: withdrawal,
        });
        expect([row, stored]).toEqual([row, direct]);
      }
    }

    for (const [tradeMath, collateralAmount, remainingCollateralUsd, isLiquidatable] of [
      ["gmsol", 1_005_150n, (100015n * P) / 100000n, false],
      ["gmsol", 1_005_149n, (1000149n * P) / 1000000n, true],
      [undefined, 1_005_150n, (1000149n * P) / 1000000n, true],
    ] as const) {
      const marketInfo = market({
        decimals: 9,
        minPrice: P,
        maxPrice: P,
        tradeMath,
        overrides: {
          positionFeeFactorForBalanceWasImproved: 10n ** 26n,
          positionFeeFactorForBalanceWasNotImproved: 10n ** 26n,
        },
      });
      const state = getResultingPositionMarginState({
        marketInfo,
        collateralToken: marketInfo.shortToken,
        sizeInUsd: (100015n * P) / 1000n,
        sizeInTokens: 100_015_000_000n,
        collateralAmount,
        pendingImpactAmount: 0n,
        minCollateralUsd: 0n,
        isLong: true,
        userReferralInfo: undefined,
        proDiscountFactor: P / 2n,
        feeDiscountFactor: P / 2n,
      });
      expect([collateralAmount, state.remainingCollateralUsd, state.isLiquidatable]).toEqual([
        collateralAmount,
        remainingCollateralUsd,
        isLiquidatable,
      ]);
      const fee = getPositionFee(marketInfo, P + 15000n * 10n ** 10n, false, undefined, undefined, P / 2n, P / 2n);
      expect([fee.positionFeeUsd, fee.discountUsd]).toEqual(
        tradeMath === "gmsol"
          ? [50000000000000010000000000n, 50000000000000000000000000n]
          : [50000000000000007500000000n, 50000000000000007500000000n]
      );
    }
  });
  it("keeps native impact precision and propagates unavailable Solana quotes FESOL-57", () => {
    const calculate = (diff: bigint, exponent: bigint, next = 0n) =>
      getPriceImpactUsd({
        currentLongUsd: diff,
        currentShortUsd: 0n,
        nextLongUsd: next,
        nextShortUsd: 0n,
        factorPositive: P,
        factorNegative: P,
        exponentFactorPositive: exponent,
        exponentFactorNegative: exponent,
        tradeMath: "gmsol",
      }).priceImpactDeltaUsd;
    for (const [diff, exponent, expected] of [
      [P - 10n ** 10n, 0n, 0n],
      [P, P / 2n, P],
      [2n * P, P / 2n, 1414213557n * 10n ** 21n],
      [100n * P, (3n * P) / 2n, 999999998638n * 10n ** 21n],
      [(123456n * P) / 10n, (11n * P) / 10n, 31670982733137n * 10n ** 21n],
      [123456789123456789123n * 10n ** 10n, 2n * P + 10n ** 10n, 1524157877n * 10n ** 21n],
      [P + 10n ** 21n, (257n * P) / 2n, 1000000129n * 10n ** 21n],
      [2n * P - 10n ** 10n, 10n ** 10n, P],
      [9223372036854775807n * 10n ** 21n, P / 2n, 96035880027389n * 10n ** 21n],
      [18446744073709551615n * 10n ** 21n, P + 10n ** 10n, 18446744073709551615n * 10n ** 21n],
      [(13n * P) / 10n + 10n ** 10n, 4n * P, 285610000000000000007n * 10n ** 10n],
      [P + 10n ** 10n, 128n * P, P + 128n * 10n ** 10n],
    ])
      expect(calculate(diff, exponent)).toBe(expected);
    for (const [diff, exponent] of [
      [10_000_000_000n * P, P / 2n],
      [2n * P, (257n * P) / 2n],
      [P + 10n ** 10n, 9223372036854775808n * 10n ** 21n],
      [P + 10n ** 10n, 129n * P],
      [P + 1n, P],
      [(1n << 127n) * 10n ** 10n, P],
      [((1n << 128n) - 1n) * 10n ** 10n, 2n * P],
    ])
      expect(() => calculate(diff, exponent)).toThrow(GmsolPriceImpactError);

    for (const tradeMath of ["gmsol", undefined] as const) {
      const m = market({
        decimals: 8,
        minPrice: P,
        maxPrice: P,
        tradeMath,
        overrides: {
          swapImpactExponentFactor: 129n * P,
          longPoolAmount: 1_000_000n * 10n ** 8n,
          shortPoolAmount: 1_000_000n * 10n ** 6n,
          swapImpactFactorPositive: P / 1000n,
          swapImpactFactorNegative: P / 1000n,
        },
      });
      const marketsInfoData = { [m.marketTokenAddress]: m };
      const route = [{ marketAddress: m.marketTokenAddress, from: m.longTokenAddress, to: m.shortTokenAddress }];
      const quote = () =>
        getSwapPathStats({
          marketsInfoData,
          swapPath: [m.marketTokenAddress],
          initialCollateralAddress: m.longTokenAddress,
          wrappedNativeTokenAddress: "WETH",
          usdIn: 100n * P,
          shouldUnwrapNativeToken: false,
          shouldApplyPriceImpact: true,
          swapPricingType: SwapPricingType.Swap,
        });
      const best = () =>
        getBestSwapPath({
          routes: [route],
          usdIn: 100n * P,
          estimator: createSwapEstimator(marketsInfoData, SwapPricingType.Swap),
        });
      if (tradeMath) {
        expect(quote).toThrow(GmsolPriceImpactError);
        expect(best).toThrow(GmsolPriceImpactError);
      } else {
        expect(quote).not.toThrow();
        expect(best()).toEqual(route);
      }
      m.longToken.prices = { minPrice: P, maxPrice: 2n * P };
      Object.assign(m, {
        swapImpactExponentFactor: 2n * P,
        longPoolAmount: 1000n * 10n ** BigInt(m.longToken.decimals),
        shortPoolAmount: 1500n * 10n ** BigInt(m.shortToken.decimals),
        swapImpactFactorPositive: P / 1_000_000n,
        swapImpactFactorNegative: P / 1_000_000n,
        longInterestUsd: 0n,
        shortInterestUsd: 0n,
        longInterestInTokens: 0n,
        shortInterestInTokens: 0n,
      });
      expect(quote()?.totalSwapPriceImpactDeltaUsd).toBe((-(tradeMath ? 9n : 4n) * P) / 100n);
    }
  });
});
