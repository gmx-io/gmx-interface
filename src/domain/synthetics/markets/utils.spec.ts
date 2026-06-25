import { describe, expect, it } from "vitest";

import { createMockMarketInfo } from "domain/testUtils/mockMarketInfo";
import { expandDecimals } from "lib/numbers";

import { getAvailableUsdLiquidityForPosition, getMaxReservedUsd } from "./utils";

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
