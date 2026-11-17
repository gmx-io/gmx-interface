import { describe, expect, it } from "vitest";

import { ARBITRUM } from "config/chains";
import { createMockMarketInfo } from "domain/testUtils/mockMarketInfo";
import { expandDecimals } from "lib/numbers";
import { getTokenBySymbol } from "sdk/configs/tokens";

import { getAvailableUsdLiquidityForPosition, getIsPoolTokenPriceInvalid, getMaxReservedUsd } from "./utils";

describe("getAvailableUsdLiquidityForPosition JIT handling", () => {
  const market = createMockMarketInfo();
  const isLong = true;

  const nativeMaxReserved = getMaxReservedUsd(market, isLong);
  const nativeAvailable = getAvailableUsdLiquidityForPosition(market, isLong);

  it("falls back to native liquidity when no JIT value is provided", () => {
    expect(nativeAvailable).toBe(nativeMaxReserved);
  });

  it("adds the JIT delta on top of native liquidity, matching the header figure", () => {
    const extraJit = expandDecimals(1_000_000, 30);
    const jitMaxReserved = nativeMaxReserved + extraJit;

    expect(getAvailableUsdLiquidityForPosition(market, isLong, jitMaxReserved)).toBe(nativeAvailable + extraJit);
  });

  it("never reports less than native liquidity when the JIT value is below native", () => {
    const jitBelowNative = nativeMaxReserved - expandDecimals(1, 30);

    expect(getAvailableUsdLiquidityForPosition(market, isLong, jitBelowNative)).toBe(nativeAvailable);
  });

  it("still caps available liquidity at the open interest limit when JIT is large", () => {
    const oiCap = nativeMaxReserved / 2n;
    const cappedMarket = { ...market, maxOpenInterestLong: oiCap };
    const hugeJit = nativeMaxReserved + expandDecimals(100_000_000, 30);

    expect(getAvailableUsdLiquidityForPosition(cappedMarket, isLong, hugeJit)).toBe(oiCap);
  });
});

describe("getIsPoolTokenPriceInvalid", () => {
  const gmToken = getTokenBySymbol(ARBITRUM, "GM");
  const prices = { minPrice: expandDecimals(1, 30), maxPrice: expandDecimals(1, 30) };
  const oneGm = expandDecimals(1, gmToken.decimals);

  it("treats a pool with less than 1 GM in supply as invalid PRO-4569", () => {
    const market = createMockMarketInfo();

    const cases: [totalSupply: bigint | undefined, expected: boolean][] = [
      [undefined, false],
      [0n, true],
      [1n, true],
      [oneGm - 1n, true],
      [oneGm, false],
    ];

    for (const [totalSupply, expected] of cases) {
      expect(getIsPoolTokenPriceInvalid(market, { ...gmToken, prices, totalSupply })).toBe(expected);
    }
  });

  it("treats a pool with a non-positive pool value as invalid whatever its supply PRO-4569", () => {
    const token = { ...gmToken, prices, totalSupply: expandDecimals(218, gmToken.decimals) };

    const cases: [poolValueMin: bigint, expected: boolean][] = [
      [-expandDecimals(123, 30), true],
      [0n, true],
      [1n, false],
    ];

    for (const [poolValueMin, expected] of cases) {
      expect(getIsPoolTokenPriceInvalid(createMockMarketInfo(undefined, { poolValueMin }), token)).toBe(expected);
    }
  });
});
