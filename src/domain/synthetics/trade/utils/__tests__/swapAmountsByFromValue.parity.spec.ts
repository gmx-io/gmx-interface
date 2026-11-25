import { chainId, dataStoreAddress, getMarketProps, ParityContext, readReader } from "domain/testUtils/parity/context";
import { parity, ParityInput } from "domain/testUtils/parity/parity";
import { loadUiFeeFactor, marketConfigs, UI_FEE_RECEIVER, UI_FEE_SCENARIO } from "domain/testUtils/parity/scenarios";
import {
  getSwapPriceImpact,
  getSwapTokens,
  getSwapUsdIn,
  isSwapMarket,
  SwapCase,
  swapCases,
} from "domain/testUtils/parity/swapPricing";
import { swapImpactPoolAmountKey } from "sdk/configs/dataStore";
import { getWrappedToken } from "sdk/configs/tokens";
import { applySwapImpactWithCap } from "sdk/utils/fees/priceImpact";
import type { MarketInfo } from "sdk/utils/markets/types";
import { getContractMarketPrices } from "sdk/utils/markets/utils";
import { SwapPricingType } from "sdk/utils/orders/types";
import { getSwapPathStats } from "sdk/utils/swap/swapStats";
import { getSwapAmountsByFromValue } from "sdk/utils/swap/swapValues";

type SwapAmountsCase = SwapCase & { uiFeeFactor: bigint };

type SwapAmountsInput = ParityInput<SwapAmountsCase>;

const EMPTY_LONG_TOKEN_SWAP_IMPACT_POOLS_SCENARIO = {
  name: "empty long token swap impact pools",
  overrides: {
    uint: marketConfigs.map(({ marketTokenAddress, longTokenAddress }): [string, bigint] => [
      swapImpactPoolAmountKey(marketTokenAddress, longTokenAddress),
      0n,
    ]),
  },
};

async function swapAmountsCases(market: MarketInfo, ctx: ParityContext): Promise<SwapAmountsCase[]> {
  const uiFeeFactor = await loadUiFeeFactor(ctx);

  return swapCases(market, ctx).map((testCase) => ({ ...testCase, uiFeeFactor }));
}

// A one market swap path, as findSwapPath gives it for this market
function getOurSwapAmounts(input: SwapAmountsInput) {
  const { ctx, market, testCase } = input;
  const [tokenIn, tokenOut] = getSwapTokens(input);
  const wrappedNativeTokenAddress = getWrappedToken(chainId).address;
  const findSwapPath = (usdIn: bigint) =>
    getSwapPathStats({
      marketsInfoData: ctx.marketsInfoData,
      swapPath: [market.marketTokenAddress],
      initialCollateralAddress: tokenIn.address,
      wrappedNativeTokenAddress,
      usdIn,
      shouldUnwrapNativeToken: false,
      shouldApplyPriceImpact: true,
      swapPricingType: SwapPricingType.Swap,
    });

  return getSwapAmountsByFromValue({
    tokenIn,
    tokenOut,
    amountIn: testCase.amountIn,
    isLimit: false,
    uiFeeFactor: testCase.uiFeeFactor,
    marketsInfoData: ctx.marketsInfoData,
    chainId,
    externalSwapQuoteParams: undefined,
    findSwapPath,
    allowSameTokenSwap: false,
  });
}

function isPositiveImpactCapped(input: SwapAmountsInput) {
  const [, tokenOut] = getSwapTokens(input);
  const usdIn = getSwapUsdIn(input);
  const { priceImpactDeltaUsd } = getSwapPriceImpact(input, usdIn);

  return (
    priceImpactDeltaUsd > 0n && applySwapImpactWithCap(input.market, tokenOut, priceImpactDeltaUsd).cappedDiffUsd > 0n
  );
}

parity("getSwapAmountsByFromValue <-> Reader.getSwapAmountOut, one market", {
  markets: isSwapMarket,
  cases: swapAmountsCases,
  scenarios: [UI_FEE_SCENARIO, EMPTY_LONG_TOKEN_SWAP_IMPACT_POOLS_SCENARIO],
  ours: (input) => ({ amountOut: getOurSwapAmounts(input).amountOut }),
  contract: async (input) => {
    const { ctx, market, testCase } = input;
    const [tokenIn] = getSwapTokens(input);
    const marketProps = getMarketProps(market);
    const prices = getContractMarketPrices(ctx.tokensData, market)!;
    const [amountOut] = await readReader<readonly [bigint, bigint, unknown]>(ctx, "getSwapAmountOut", [
      dataStoreAddress,
      marketProps,
      prices,
      tokenIn.address,
      testCase.amountIn,
      UI_FEE_RECEIVER,
    ]);

    return { amountOut };
  },
  fields: {
    amountOut: {
      toleranceBps: 0.001,
      knownIssues: [
        {
          reason:
            "getSwapStats measures the impact on usdIn at the min price, the contract on amountIn at the mid price",
        },
        {
          reason:
            "getSwapStats works in USD and rounds once, the contract rounds the fee and the impact to token-in units and the output to token-out units",
        },
        {
          reason:
            "getPriceImpactForSwap keeps the pool's balanceWasImproved when the virtual inventory impact wins, the contract takes the virtual one: the other fee tier",
        },
      ],
    },
  },
  requiredCases: [
    { name: "the ui fee scenario applies", when: ({ testCase }) => testCase.uiFeeFactor > 0n },
    { name: "a swap with positive impact capped by the impact pool", when: isPositiveImpactCapped },
  ],
});
