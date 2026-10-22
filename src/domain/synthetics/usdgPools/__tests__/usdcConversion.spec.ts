import { describe, expect, it } from "vitest";

import { expandDecimals } from "lib/numbers";
import type { TokenData } from "sdk/utils/tokens/types";
import type { FindSwapPath, SwapPathStats } from "sdk/utils/trade/types";

import { getIsCloseToLiquidation, getMaxInstantSwapAmount } from "../usdcConversion";

const usd = (value: number) => expandDecimals(value, 30);
const usdc = (value: number) => expandDecimals(value, 6);

const USDC = {
  symbol: "USDC",
  decimals: 6,
  prices: { minPrice: usd(1), maxPrice: usd(1) },
} as TokenData;

function makeFindSwapPath(limitUsd: bigint): FindSwapPath {
  return (usdIn) =>
    ({
      swapPath: ["0x408E8e83d4b8Ac4BDefFDF896B49268A5FE5Ef44"],
      swapSteps: [{ isOutCapacity: usdIn > limitUsd }],
    }) as SwapPathStats;
}

describe("usdcConversion", () => {
  it.each([
    {
      name: "rounds down to the whole tokens under the pool limit",
      limitUsd: usd(1_220_000) + usd(1) / 2n,
      amount: usdc(1_600_000),
      expected: usdc(1_220_000),
    },
    {
      name: "keeps the requested amount when the pool can take it",
      limitUsd: usd(2_000_000),
      amount: usdc(1_600_000),
      expected: usdc(1_600_000),
    },
    { name: "returns zero when the pool can take nothing", limitUsd: 0n, amount: usdc(1_600_000), expected: 0n },
  ])("max instant amount $name", ({ limitUsd, amount, expected }) => {
    expect(
      getMaxInstantSwapAmount({ tokenIn: USDC, maxAmountIn: amount, findSwapPath: makeFindSwapPath(limitUsd) })
    ).toBe(expected);
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
