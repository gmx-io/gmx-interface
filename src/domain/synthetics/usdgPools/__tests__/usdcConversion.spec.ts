import { describe, expect, it } from "vitest";

import { expandDecimals } from "lib/numbers";
import type { TokenData } from "sdk/utils/tokens/types";
import type { FindSwapPath, SwapPathStats } from "sdk/utils/trade/types";

import { getIsCloseToLiquidation, getIsSwapTooLargeToFill, getMaxInstantSwapAmount } from "../usdcConversion";

const usd = (value: number) => expandDecimals(value, 30);
const usdc = (value: number) => expandDecimals(value, 6);

const USDC = {
  symbol: "USDC",
  decimals: 6,
  prices: { minPrice: usd(1), maxPrice: usd(1) },
} as TokenData;

const PATH_STATS = {
  swapPath: ["0x408E8e83d4b8Ac4BDefFDF896B49268A5FE5Ef44"],
  swapSteps: [{}],
} as SwapPathStats;

// like the live route finder: no path for sub-cent amounts, and the pool is dropped once it's over capacity
function makeFindSwapPath(limitUsd: bigint): FindSwapPath {
  return (usdIn) => (usdIn < usd(1) / 100n || usdIn > limitUsd ? undefined : PATH_STATS);
}

describe("usdcConversion", () => {
  it.each([
    {
      name: "suggests whole tokens a margin under the pool limit",
      limitUsd: usd(1_458_794) + usd(1) / 2n,
      amount: usdc(2_000_000),
      min: usdc(1_451_000),
      max: usdc(1_451_500),
    },
    {
      name: "keeps the requested amount when the pool can take it",
      limitUsd: usd(2_000_000),
      amount: usdc(1_600_000),
      min: usdc(1_600_000),
      max: usdc(1_600_000),
    },
    { name: "returns zero when the pool can take nothing", limitUsd: 0n, amount: usdc(1_600_000), min: 0n, max: 0n },
  ])("max instant amount $name", ({ limitUsd, amount, min, max }) => {
    const result = getMaxInstantSwapAmount({
      tokenIn: USDC,
      maxAmountIn: amount,
      findSwapPath: makeFindSwapPath(limitUsd),
    });

    expect(result).toBeGreaterThanOrEqual(min);
    expect(result).toBeLessThanOrEqual(max);
    expect(result % usdc(1)).toBe(0n);
  });

  it.each([
    { amount: 1n, swapPathStats: undefined, expected: false },
    { amount: usdc(2_000_000), swapPathStats: undefined, expected: true },
    { amount: usdc(5), swapPathStats: PATH_STATS, expected: false },
  ])("too large to fill for $amount", ({ amount, swapPathStats, expected }) => {
    expect(getIsSwapTooLargeToFill({ tokenIn: USDC, amountIn: amount, swapPathStats })).toBe(expected);
  });

  it.each([
    { markPrice: usd(100), liquidationPrice: usd(95), expected: true },
    { markPrice: usd(100), liquidationPrice: usd(949) / 10n, expected: false },
    { markPrice: usd(100), liquidationPrice: usd(105), expected: true },
    { markPrice: usd(100), liquidationPrice: undefined, expected: false },
  ])(
    "is close to liquidation at mark $markPrice and liq $liquidationPrice",
    ({ markPrice, liquidationPrice, expected }) => {
      expect(getIsCloseToLiquidation({ markPrice, liquidationPrice })).toBe(expected);
    }
  );
});
