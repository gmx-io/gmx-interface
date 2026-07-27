import { describe, it, expect } from "vitest";

import { USD_DECIMALS } from "configs/factors";
import { mockMarketsInfoData, mockTokensData } from "test/mock";
import { getFundingFactorPerPeriod, getPriceImpactForPosition } from "utils/fees";
import type { MarketInfo } from "utils/markets/types";
import { expandDecimals, numberToBigint } from "utils/numbers";
import { convertToTokenAmountForIncrease, convertToUsd } from "utils/tokens";

const dollar = 10n ** BigInt(USD_DECIMALS);
const eightMillion = 8_000_000n;
const tenMillion = 10_000_000n;

function toFactor(percent: `${number}%`) {
  const value = parseFloat(percent.replace("%", ""));
  return numberToBigint(value, 30 - 2);
}

const second = 1n;

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

describe("getPriceImpactForPosition token OI parity", () => {
  const tokensData = mockTokensData();
  const sizeDeltaInTokens = expandDecimals(1, tokensData.BTC.decimals) / 1000n;
  const sizeDeltaUsd = convertToUsd(sizeDeltaInTokens, tokensData.BTC.decimals, tokensData.BTC.prices.minPrice)!;
  const virtualInventoryForPositionsInTokens = -expandDecimals(2, tokensData.BTC.decimals) / 1000n;
  const virtualInventoryForPositions = convertToUsd(
    virtualInventoryForPositionsInTokens,
    tokensData.BTC.decimals,
    tokensData.BTC.prices.minPrice
  )!;
  const baseMarket = mockMarketsInfoData(tokensData, ["BTC-BTC-USDC"])["BTC-BTC-USDC"];
  const tokenOiMarket = {
    ...baseMarket,
    useOpenInterestInTokensForBalance: true,
    virtualInventoryForPositions: virtualInventoryForPositions * -1n,
    virtualInventoryForPositionsInTokens,
  };
  const usdOiMarket = {
    ...baseMarket,
    useOpenInterestInTokensForBalance: false,
    longInterestUsd: convertToUsd(
      baseMarket.longInterestInTokens,
      tokensData.BTC.decimals,
      tokensData.BTC.prices.minPrice
    )!,
    shortInterestUsd: convertToUsd(
      baseMarket.shortInterestInTokens,
      tokensData.BTC.decimals,
      tokensData.BTC.prices.minPrice
    )!,
    virtualInventoryForPositions,
  };

  for (const [label, signedSizeDeltaUsd] of [
    ["increase", sizeDeltaUsd],
    ["decrease", -sizeDeltaUsd],
  ] as const) {
    it(`matches USD OI pricing for a representative ${label}`, () => {
      const tokenOiResult = getPriceImpactForPosition(tokenOiMarket, signedSizeDeltaUsd, true, {
        sizeDeltaInTokens,
      });
      const usdOiResult = getPriceImpactForPosition(usdOiMarket, signedSizeDeltaUsd, true, {
        sizeDeltaInTokens,
      });

      expect(tokenOiResult).toEqual(usdOiResult);
    });
  }
});

describe("getPriceImpactForPosition contract parity", () => {
  it("rounds short increases up to the next atomic token unit", () => {
    expect(convertToTokenAmountForIncrease(10n, 0, 3n, true)).toBe(3n);
    expect(convertToTokenAmountForIncrease(10n, 0, 3n, false)).toBe(4n);
  });

  it("recomputes the contract token delta after a non-round-tripping USD conversion", () => {
    const sizeDeltaUsd = convertToUsd(4n, 1, 3n)!;

    expect(sizeDeltaUsd).toBe(1n);
    expect(convertToTokenAmountForIncrease(sizeDeltaUsd, 1, 3n, true)).toBe(3n);
  });

  it("returns the virtual pool balance classification when virtual impact wins", () => {
    const tokensData = mockTokensData();
    const baseMarket = mockMarketsInfoData(tokensData, ["BTC-BTC-USDC"])["BTC-BTC-USDC"];
    const market = {
      ...baseMarket,
      useOpenInterestInTokensForBalance: false,
      longInterestUsd: 0n,
      shortInterestUsd: 100n * dollar,
      positionImpactFactorPositive: toFactor("0.01%"),
      positionImpactFactorNegative: toFactor("0.1%"),
      positionImpactExponentFactorPositive: toFactor("100%"),
      positionImpactExponentFactorNegative: toFactor("100%"),
    };
    const sizeDeltaUsd = 150n * dollar;
    const primaryResult = getPriceImpactForPosition(market, sizeDeltaUsd, true);
    const virtualResult = getPriceImpactForPosition(
      {
        ...market,
        virtualInventoryForPositions: -100n * dollar,
      },
      sizeDeltaUsd,
      true
    );

    expect(primaryResult.balanceWasImproved).toBe(true);
    expect(primaryResult.priceImpactDeltaUsd).toBeLessThan(0n);
    expect(virtualResult.priceImpactDeltaUsd).toBeLessThan(primaryResult.priceImpactDeltaUsd);
    expect(virtualResult.balanceWasImproved).toBe(false);
  });
});
