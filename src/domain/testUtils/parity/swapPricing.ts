import { getPriceImpactForSwap } from "sdk/utils/fees/priceImpact";
import type { MarketInfo } from "sdk/utils/markets/types";
import { getAvailableUsdLiquidityForCollateral } from "sdk/utils/markets/utils";
import { SwapPricingType } from "sdk/utils/orders/types";
import { getSwapStats } from "sdk/utils/swap/swapStats";
import { convertToTokenAmount, convertToUsd, getMidPrice } from "sdk/utils/tokens/utils";

import type { ParityContext } from "./context";
import { ParityInput, usd } from "./parity";

export type SwapCase = { label: string; isLongIn: boolean; amountIn: bigint };

/** getPriceImpactForSwap skips the virtual inventory when either virtual pool is empty */
export const getMarketWithoutVirtualInventory = (market: MarketInfo): MarketInfo => ({
  ...market,
  virtualPoolAmountForLongToken: 0n,
});

export const getSwapTokens = ({ market, testCase }: ParityInput<SwapCase>) =>
  testCase.isLongIn ? [market.longToken, market.shortToken] : [market.shortToken, market.longToken];

/** What getSwapAmountsByFromValue passes to the swap path: the amount in at the min price */
export function getSwapUsdIn(input: ParityInput<SwapCase>) {
  const [tokenIn] = getSwapTokens(input);

  return convertToUsd(input.testCase.amountIn, tokenIn.decimals, tokenIn.prices.minPrice)!;
}

/** The contract measures the swap at the mid price */
export function getSwapMidUsdIn(input: ParityInput<SwapCase>) {
  const [tokenIn] = getSwapTokens(input);
  const midPrice = getMidPrice(tokenIn.prices);

  return convertToUsd(input.testCase.amountIn, tokenIn.decimals, midPrice)!;
}

export function getOurSwapPriceImpact(input: ParityInput<SwapCase>, usdIn: bigint) {
  const [tokenIn, tokenOut] = getSwapTokens(input);

  return getPriceImpactForSwap(input.market, tokenIn, tokenOut, usdIn, -usdIn);
}

export const isSwapMarket = (market: MarketInfo) =>
  !market.isDisabled && !market.isSameCollaterals && market.poolValueMax > usd(10_000);

// Liquidity, capacity and max pnl are checked when the swap executes, Reader.getSwapAmountOut quotes past them
export function swapCases(market: MarketInfo, ctx: ParityContext): SwapCase[] {
  const cases = [true, false].flatMap((isLongIn) => {
    const tokenIn = isLongIn ? market.longToken : market.shortToken;
    const liquidityUsd = getAvailableUsdLiquidityForCollateral(market, !isLongIn);

    return [
      { label: "$1k", usdIn: usd(1_000) },
      { label: "$100k", usdIn: usd(100_000) },
      { label: "10% of liquidity", usdIn: liquidityUsd / 10n },
      { label: "90% of liquidity", usdIn: (liquidityUsd * 9n) / 10n },
    ]
      .filter((c) => c.usdIn > 0n && c.usdIn < liquidityUsd)
      .map((c) => ({
        label: `${isLongIn ? "long -> short" : "short -> long"} ${c.label}`,
        isLongIn,
        amountIn: convertToTokenAmount(c.usdIn, tokenIn.decimals, tokenIn.prices.minPrice)!,
      }));
  });

  return cases.filter((testCase) => {
    const input = { ctx, market, testCase };
    const [tokenIn, tokenOut] = getSwapTokens(input);
    const usdIn = getSwapUsdIn(input);
    const stats = getSwapStats({
      marketInfo: market,
      tokenInAddress: tokenIn.address,
      tokenOutAddress: tokenOut.address,
      usdIn,
      shouldApplyPriceImpact: true,
      swapPricingType: SwapPricingType.Swap,
    });

    return !stats.isOutLiquidity && !stats.isOutCapacity && !stats.isOutMaxFactor;
  });
}
