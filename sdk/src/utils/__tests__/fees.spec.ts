import { zeroHash } from "viem";
import { describe, expect, it } from "vitest";

import { USD_DECIMALS } from "configs/factors";
import { mockMarketsInfoData, mockTokensData, usdToToken } from "test/mock";
import {
  getFundingFactorPerPeriod,
  getPositionFee,
  getPriceImpactForPosition,
  getPriceImpactForSwap,
  getPriceImpactUsd,
} from "utils/fees";
import type { MarketInfo } from "utils/markets/types";
import { numberToBigint } from "utils/numbers";
import { convertToTokenAmountForIncrease } from "utils/tokens";
import { getDecreasePositionSizeDeltaInTokens } from "utils/trade/decrease";

const dollar = 10n ** BigInt(USD_DECIMALS);
const eightMillion = 8_000_000n;
const tenMillion = 10_000_000n;
const marketKey = "BTC-BTC-USDC";
const configuredVirtualIndexTokenId = `0x${"1".repeat(64)}`;

function toFactor(percent: `${number}%`) {
  const value = parseFloat(percent.replace("%", ""));
  return numberToBigint(value, 30 - 2);
}

const second = 1n;

function makePriceImpactMarket(overrides: Partial<MarketInfo> = {}) {
  const tokensData = mockTokensData();

  return mockMarketsInfoData(tokensData, [marketKey], {
    [marketKey]: {
      useOpenInterestInTokensForBalance: false,
      positionImpactFactorPositive: toFactor("1%"),
      positionImpactFactorNegative: toFactor("1%"),
      positionImpactExponentFactorPositive: toFactor("200%"),
      positionImpactExponentFactorNegative: toFactor("200%"),
      virtualIndexTokenId: zeroHash,
      ...overrides,
    },
  })[marketKey];
}

describe("getFundingFactorPerPeriod", () => {
  it("works when short pay, shorts OI bigger", () => {
    const marketInfo = {
      fundingFactorPerSecond: toFactor("50%"),
      longsPayShorts: false,
      longInterestUsd: eightMillion * dollar,
      shortInterestUsd: tenMillion * dollar,
    } as MarketInfo;

    const forLongs = getFundingFactorPerPeriod(marketInfo, true, second);
    expect(forLongs.toString()).toBe(toFactor("62.5%").toString());

    const forShorts = getFundingFactorPerPeriod(marketInfo, false, second);
    expect(forShorts.toString()).toBe(toFactor("-50%").toString());
  });

  it("works when short pay, longs OI bigger", () => {
    const marketInfo = {
      fundingFactorPerSecond: toFactor("50%"),
      longsPayShorts: false,
      longInterestUsd: tenMillion * dollar,
      shortInterestUsd: eightMillion * dollar,
    } as MarketInfo;

    const forLongs = getFundingFactorPerPeriod(marketInfo, true, second);
    expect(forLongs.toString()).toBe(toFactor("40%").toString());

    const forShorts = getFundingFactorPerPeriod(marketInfo, false, second);
    expect(forShorts.toString()).toBe(toFactor("-50%").toString());
  });

  it("works when long pay, shorts OI bigger", () => {
    const marketInfo = {
      fundingFactorPerSecond: toFactor("50%"),
      longsPayShorts: true,
      longInterestUsd: eightMillion * dollar,
      shortInterestUsd: tenMillion * dollar,
    } as MarketInfo;

    const forLongs = getFundingFactorPerPeriod(marketInfo, true, second);
    expect(forLongs.toString()).toBe(toFactor("-50%").toString());

    const forShorts = getFundingFactorPerPeriod(marketInfo, false, second);
    expect(forShorts.toString()).toBe(toFactor("40%").toString());
  });

  it("works when long pay, longs OI bigger", () => {
    const marketInfo = {
      fundingFactorPerSecond: toFactor("50%"),
      longsPayShorts: true,
      longInterestUsd: tenMillion * dollar,
      shortInterestUsd: eightMillion * dollar,
    } as MarketInfo;

    const forLongs = getFundingFactorPerPeriod(marketInfo, true, second);
    expect(forLongs.toString()).toBe(toFactor("-50%").toString());

    const forShorts = getFundingFactorPerPeriod(marketInfo, false, second);
    expect(forShorts.toString()).toBe(toFactor("62.5%").toString());
  });
});

describe("position price impact", () => {
  it("matches contract rounding for long and short increases", () => {
    expect(convertToTokenAmountForIncrease(10n, 0, 3n, true)).toBe(3n);
    expect(convertToTokenAmountForIncrease(10n, 0, 3n, false)).toBe(4n);
  });

  it.each([
    { isLong: true, expectedSizeDeltaInTokens: 4n },
    { isLong: false, expectedSizeDeltaInTokens: 3n },
  ])(
    "uses the position ratio and contract rounding for a non-round-tripping $isLong decrease",
    ({ isLong, expectedSizeDeltaInTokens }) => {
      const sizeDeltaUsd = 10n * dollar;
      const baseMarket = makePriceImpactMarket();
      const marketInfo = makePriceImpactMarket({
        useOpenInterestInTokensForBalance: true,
        indexToken: {
          ...baseMarket.indexToken,
          decimals: 0,
          prices: {
            minPrice: 2n * dollar,
            maxPrice: 2n * dollar,
          },
        },
        longInterestInTokens: 100n,
        shortInterestInTokens: 80n,
      });
      const sizeDeltaInTokens = getDecreasePositionSizeDeltaInTokens({
        sizeInUsd: 31n * dollar,
        sizeInTokens: 10n,
        sizeDeltaUsd,
        isLong,
      });
      const exactResult = getPriceImpactForPosition(marketInfo, -sizeDeltaUsd, isLong, {
        sizeDeltaInTokens,
      });
      const midPriceFallbackResult = getPriceImpactForPosition(marketInfo, -sizeDeltaUsd, isLong, {
        sizeDeltaInTokens: 5n,
      });

      expect(sizeDeltaInTokens).toBe(expectedSizeDeltaInTokens);
      expect(exactResult).not.toEqual(midPriceFallbackResult);
      expect(() => getPriceImpactForPosition(marketInfo, -sizeDeltaUsd, isLong)).toThrowError(
        `Missing sizeDeltaInTokens for token-OI decrease market ${marketInfo.marketTokenAddress}`
      );
    }
  );

  it.each([
    { shortInterestUsd: 100n * dollar, virtualInventoryForPositions: 100n * dollar, expectedSign: -1n },
    { shortInterestUsd: 105n * dollar, virtualInventoryForPositions: -100n * dollar, expectedSign: 0n },
    { shortInterestUsd: 110n * dollar, virtualInventoryForPositions: -100n * dollar, expectedSign: 1n },
  ])(
    "returns $expectedSign impact at the local balance boundary",
    ({ shortInterestUsd, virtualInventoryForPositions, expectedSign }) => {
      const marketInfo = makePriceImpactMarket({
        longInterestUsd: 100n * dollar,
        shortInterestUsd,
        virtualIndexTokenId: configuredVirtualIndexTokenId,
        virtualInventoryForPositions,
      });
      const expected = getPriceImpactUsd({
        currentLongUsd: 100n * dollar,
        currentShortUsd: shortInterestUsd,
        nextLongUsd: 110n * dollar,
        nextShortUsd: shortInterestUsd,
        factorPositive: marketInfo.positionImpactFactorPositive,
        factorNegative: marketInfo.positionImpactFactorNegative,
        exponentFactorPositive: marketInfo.positionImpactExponentFactorPositive,
        exponentFactorNegative: marketInfo.positionImpactExponentFactorNegative,
      });

      const result = getPriceImpactForPosition(marketInfo, 10n * dollar, true);
      const actualSign = result.priceImpactDeltaUsd < 0n ? -1n : result.priceImpactDeltaUsd > 0n ? 1n : 0n;

      expect(result).toEqual(expected);
      expect(actualSign).toBe(expectedSign);
    }
  );

  it("selects token inventory only in token-OI mode", () => {
    const baseMarket = makePriceImpactMarket();
    const openInterestInTokens = usdToToken(100, baseMarket.indexToken);
    const sizeDeltaInTokens = usdToToken(10, baseMarket.indexToken);
    const tokenInventory = -usdToToken(100, baseMarket.indexToken);
    const marketInfo = {
      ...baseMarket,
      shortInterestUsd: 100n * dollar,
      longInterestUsd: 100n * dollar,
      longInterestInTokens: openInterestInTokens,
      shortInterestInTokens: openInterestInTokens,
      virtualIndexTokenId: configuredVirtualIndexTokenId,
      virtualInventoryForPositions: 100n * dollar,
      virtualInventoryForPositionsInTokens: tokenInventory,
    };
    const tokenModeResult = getPriceImpactForPosition(
      { ...marketInfo, useOpenInterestInTokensForBalance: true },
      10n * dollar,
      true,
      { sizeDeltaInTokens }
    );
    const usdModeResult = getPriceImpactForPosition(
      { ...marketInfo, useOpenInterestInTokensForBalance: false },
      10n * dollar,
      true
    );
    const expectedTokenInventoryResult = getPriceImpactUsd({
      currentLongUsd: 100n * dollar,
      currentShortUsd: 0n,
      nextLongUsd: 110n * dollar,
      nextShortUsd: 0n,
      factorPositive: marketInfo.positionImpactFactorPositive,
      factorNegative: marketInfo.positionImpactFactorNegative,
      exponentFactorPositive: marketInfo.positionImpactExponentFactorPositive,
      exponentFactorNegative: marketInfo.positionImpactExponentFactorNegative,
    });
    const expectedLocalResult = getPriceImpactUsd({
      currentLongUsd: 100n * dollar,
      currentShortUsd: 100n * dollar,
      nextLongUsd: 110n * dollar,
      nextShortUsd: 100n * dollar,
      factorPositive: marketInfo.positionImpactFactorPositive,
      factorNegative: marketInfo.positionImpactFactorNegative,
      exponentFactorPositive: marketInfo.positionImpactExponentFactorPositive,
      exponentFactorNegative: marketInfo.positionImpactExponentFactorNegative,
    });

    expect(tokenModeResult).toEqual(expectedTokenInventoryResult);
    expect(usdModeResult).toEqual(expectedLocalResult);
    expect(
      getPriceImpactForPosition(
        {
          ...marketInfo,
          useOpenInterestInTokensForBalance: true,
          virtualInventoryForPositions: -1_000n * dollar,
        },
        10n * dollar,
        true,
        { sizeDeltaInTokens }
      )
    ).toEqual(tokenModeResult);
    expect(
      getPriceImpactForPosition(
        {
          ...marketInfo,
          useOpenInterestInTokensForBalance: false,
          virtualInventoryForPositionsInTokens: usdToToken(1_000, baseMarket.indexToken),
        },
        10n * dollar,
        true
      )
    ).toEqual(usdModeResult);
  });

  it("uses zero token-OI delta at a zero index price", () => {
    const baseMarket = makePriceImpactMarket();
    const marketInfo = makePriceImpactMarket({
      useOpenInterestInTokensForBalance: true,
      indexToken: {
        ...baseMarket.indexToken,
        prices: {
          minPrice: 0n,
          maxPrice: 0n,
        },
      },
      longInterestInTokens: usdToToken(100, baseMarket.indexToken),
      shortInterestInTokens: usdToToken(100, baseMarket.indexToken),
    });

    const result = getPriceImpactForPosition(marketInfo, 10n * dollar, true, {
      sizeDeltaInTokens: usdToToken(10, baseMarket.indexToken),
    });

    expect(result.priceImpactDeltaUsd).toBe(0n);
  });

  it("requires token inventory only when token-OI mode evaluates virtual impact", () => {
    const baseMarket = makePriceImpactMarket();
    const openInterestInTokens = usdToToken(100, baseMarket.indexToken);
    const sizeDeltaInTokens = usdToToken(10, baseMarket.indexToken);
    const marketWithoutTokenInventory = {
      ...baseMarket,
      longInterestUsd: 100n * dollar,
      shortInterestUsd: 100n * dollar,
      longInterestInTokens: openInterestInTokens,
      shortInterestInTokens: openInterestInTokens,
      virtualIndexTokenId: configuredVirtualIndexTokenId,
      virtualInventoryForPositions: -100n * dollar,
      virtualInventoryForPositionsInTokens: undefined,
    } as unknown as MarketInfo;

    expect(() =>
      getPriceImpactForPosition(
        { ...marketWithoutTokenInventory, useOpenInterestInTokensForBalance: true },
        10n * dollar,
        true,
        { sizeDeltaInTokens }
      )
    ).toThrowError(`Missing virtualInventoryForPositionsInTokens for token-OI market ${marketKey}`);
    expect(() =>
      getPriceImpactForPosition(
        { ...marketWithoutTokenInventory, useOpenInterestInTokensForBalance: false },
        10n * dollar,
        true
      )
    ).not.toThrow();
  });

  it("evaluates a configured zero token inventory", () => {
    const baseMarket = makePriceImpactMarket();
    const longInterestInTokens = usdToToken(100, baseMarket.indexToken);
    const shortInterestInTokens = usdToToken(105, baseMarket.indexToken);
    const sizeDeltaInTokens = usdToToken(11, baseMarket.indexToken);
    const marketInfo = {
      ...baseMarket,
      useOpenInterestInTokensForBalance: true,
      longInterestInTokens,
      shortInterestInTokens,
      virtualInventoryForPositionsInTokens: 0n,
      virtualIndexTokenId: configuredVirtualIndexTokenId,
    };
    const localResult = getPriceImpactUsd({
      currentLongUsd: 100n * dollar,
      currentShortUsd: 105n * dollar,
      nextLongUsd: 111n * dollar,
      nextShortUsd: 105n * dollar,
      factorPositive: marketInfo.positionImpactFactorPositive,
      factorNegative: marketInfo.positionImpactFactorNegative,
      exponentFactorPositive: marketInfo.positionImpactExponentFactorPositive,
      exponentFactorNegative: marketInfo.positionImpactExponentFactorNegative,
    });
    const zeroInventoryResult = getPriceImpactUsd({
      currentLongUsd: 0n,
      currentShortUsd: 0n,
      nextLongUsd: 11n * dollar,
      nextShortUsd: 0n,
      factorPositive: marketInfo.positionImpactFactorPositive,
      factorNegative: marketInfo.positionImpactFactorNegative,
      exponentFactorPositive: marketInfo.positionImpactExponentFactorPositive,
      exponentFactorNegative: marketInfo.positionImpactExponentFactorNegative,
    });

    expect(
      getPriceImpactForPosition(marketInfo, 11n * dollar, true, {
        sizeDeltaInTokens,
      })
    ).toEqual(zeroInventoryResult);
    expect(
      getPriceImpactForPosition({ ...marketInfo, virtualIndexTokenId: zeroHash }, 11n * dollar, true, {
        sizeDeltaInTokens,
      })
    ).toEqual(localResult);
    expect(zeroInventoryResult.priceImpactDeltaUsd).toBeLessThan(localResult.priceImpactDeltaUsd);
  });

  it("clamps rounded close OI to zero instead of suppressing its impact", () => {
    const baseMarket = makePriceImpactMarket();
    const marketInfo = makePriceImpactMarket({
      useOpenInterestInTokensForBalance: true,
      indexToken: {
        ...baseMarket.indexToken,
        decimals: 0,
        prices: {
          minPrice: dollar,
          maxPrice: dollar,
        },
      },
      longInterestInTokens: 8n,
      shortInterestInTokens: 20n,
    });
    const expected = getPriceImpactUsd({
      currentLongUsd: 8n * dollar,
      currentShortUsd: 20n * dollar,
      nextLongUsd: 0n,
      nextShortUsd: 20n * dollar,
      factorPositive: marketInfo.positionImpactFactorPositive,
      factorNegative: marketInfo.positionImpactFactorNegative,
      exponentFactorPositive: marketInfo.positionImpactExponentFactorPositive,
      exponentFactorNegative: marketInfo.positionImpactExponentFactorNegative,
      fallbackToZero: true,
    });

    const result = getPriceImpactForPosition(marketInfo, -9n * dollar, true, {
      sizeDeltaInTokens: 9n,
      fallbackToZero: true,
    });

    expect(result).toEqual(expected);
    expect(result.priceImpactDeltaUsd).toBeLessThan(0n);
  });

  it("does not use position inventory fields for swap impact", () => {
    const baseMarket = makePriceImpactMarket();
    const marketInfo = {
      ...baseMarket,
      virtualPoolAmountForLongToken: usdToToken(1_000, baseMarket.longToken),
      virtualPoolAmountForShortToken: usdToToken(500, baseMarket.shortToken),
    };
    const expected = getPriceImpactForSwap(
      marketInfo,
      marketInfo.longToken,
      marketInfo.shortToken,
      100n * dollar,
      -100n * dollar
    );
    const marketWithPositionInventoryChanges = {
      ...marketInfo,
      useOpenInterestInTokensForBalance: true,
      virtualIndexTokenId: configuredVirtualIndexTokenId,
      virtualInventoryForPositions: 10_000n * dollar,
      virtualInventoryForPositionsInTokens: undefined,
    } as unknown as MarketInfo;

    expect(
      getPriceImpactForSwap(
        marketWithPositionInventoryChanges,
        marketWithPositionInventoryChanges.longToken,
        marketWithPositionInventoryChanges.shortToken,
        100n * dollar,
        -100n * dollar
      )
    ).toEqual(expected);
  });
});

describe("getPositionFee", () => {
  // 0.1% of 100 000 → 100 of opening fee
  const marketInfo = {
    positionFeeFactorForBalanceWasImproved: toFactor("0.05%"),
    positionFeeFactorForBalanceWasNotImproved: toFactor("0.1%"),
  } as MarketInfo;

  const sizeDeltaUsd = 100_000n * dollar;
  // 10% of the fee is rebated, half of it goes back to the trader → 5 of discount
  const referralInfo = { totalRebateFactor: toFactor("10%"), discountFactor: toFactor("50%") };

  it("keeps the referral discount when no pro tier is set", () => {
    const noPro = getPositionFee(marketInfo, sizeDeltaUsd, false, referralInfo);
    const zeroPro = getPositionFee(marketInfo, sizeDeltaUsd, false, referralInfo, undefined, 0n);

    expect(noPro.discountUsd).toBe(5n * dollar);
    expect(noPro.positionFeeUsd).toBe(95n * dollar);
    expect(zeroPro).toEqual(noPro);
  });

  it("takes the bigger of the pro and referral discounts, never their sum", () => {
    const bigPro = getPositionFee(marketInfo, sizeDeltaUsd, false, referralInfo, undefined, toFactor("10%"));

    expect(bigPro.discountUsd).toBe(10n * dollar);
    expect(bigPro.positionFeeUsd).toBe(90n * dollar);

    const smallPro = getPositionFee(marketInfo, sizeDeltaUsd, false, referralInfo, undefined, toFactor("3%"));

    expect(smallPro.discountUsd).toBe(5n * dollar);
    expect(smallPro.positionFeeUsd).toBe(95n * dollar);
  });

  it("is indifferent when the pro discount equals the referral one", () => {
    const equalPro = getPositionFee(marketInfo, sizeDeltaUsd, false, referralInfo, undefined, toFactor("5%"));

    expect(equalPro.discountUsd).toBe(5n * dollar);
    expect(equalPro.positionFeeUsd).toBe(95n * dollar);
  });

  it("applies the pro discount without a referral code", () => {
    const proOnly = getPositionFee(marketInfo, sizeDeltaUsd, false, undefined, undefined, toFactor("10%"));

    expect(proOnly.totalRebateUsd).toBe(0n);
    expect(proOnly.discountUsd).toBe(10n * dollar);
    expect(proOnly.positionFeeUsd).toBe(90n * dollar);
  });
});
