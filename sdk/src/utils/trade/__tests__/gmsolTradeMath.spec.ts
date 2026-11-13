import { describe, expect, it } from "vitest";

import { ARBITRUM } from "configs/chainIds";
import { mockMarginCheckMarketInfo, mockTokensData } from "test/mock";
import type { MarketInfo } from "utils/markets/types";
import { PRECISION } from "utils/numbers";
import { DecreasePositionSwapType, OrderType, SwapPricingType } from "utils/orders/types";
import { getPositionInfo } from "utils/positions";
import type { PositionInfoLoaded } from "utils/positions/types";
import { getAcceptablePriceInfo } from "utils/prices";
import { getSwapPathStats } from "utils/swap/swapStats";
import { getDecreasePositionAmounts, getOptimalDecreaseAndSwapAmounts } from "utils/trade/decrease";
import { getIncreasePositionAmounts } from "utils/trade/increase";
import { getIncreaseResultingPositionState } from "utils/trade/increaseMarginCheck";

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
  });
});
