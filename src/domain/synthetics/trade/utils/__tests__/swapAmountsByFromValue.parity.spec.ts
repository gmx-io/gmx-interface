import { chainId, dataStoreAddress, getMarketProps, ParityContext, readReader } from "domain/testUtils/parity/context";
import { parity, ParityInput } from "domain/testUtils/parity/parity";
import {
  loadUiFeeFactor,
  marketConfigs,
  MID_PRICES_SCENARIO,
  UI_FEE_RECEIVER,
  UI_FEE_SCENARIO,
} from "domain/testUtils/parity/scenarios";
import {
  getAppSwapPriceImpact,
  getSwapTokens,
  getSwapUsdIn,
  isSwapMarket,
  SwapCase,
  swapCases,
} from "domain/testUtils/parity/swapPricing";
import { swapImpactPoolAmountKey } from "sdk/configs/dataStore";
import { getWrappedToken } from "sdk/configs/tokens";
import { bigMath } from "sdk/utils/bigmath";
import { applySwapImpactWithCap } from "sdk/utils/fees/priceImpact";
import type { MarketInfo } from "sdk/utils/markets/types";
import { getContractMarketPrices } from "sdk/utils/markets/utils";
import { expandDecimals } from "sdk/utils/numbers";
import { SwapPricingType } from "sdk/utils/orders/types";
import { getIsMaxPnlFactorExceededAfterSwap, getSwapPathStats } from "sdk/utils/swap/swapStats";
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
function getAppSwapAmounts(input: SwapAmountsInput) {
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
  const { priceImpactDeltaUsd } = getAppSwapPriceImpact(input, usdIn);

  return (
    priceImpactDeltaUsd > 0n && applySwapImpactWithCap(input.market, tokenOut, priceImpactDeltaUsd).cappedDiffUsd > 0n
  );
}

const hasSpread = (input: SwapAmountsInput) =>
  getSwapTokens(input).some(({ prices }) => prices.minPrice !== prices.maxPrice);

// the fee and the impact are each off by less than one token in unit, the output by less than one token out unit
function isRoundingDifference(input: SwapAmountsInput, app: bigint, contract: bigint) {
  const [tokenIn, tokenOut] = getSwapTokens(input);
  const tokenInUnitInTokenOut = bigMath.divRoundUp(
    tokenIn.prices.maxPrice * expandDecimals(1, tokenOut.decimals),
    tokenOut.prices.minPrice * expandDecimals(1, tokenIn.decimals)
  );

  return bigMath.abs(app - contract) <= 2n * tokenInUnitInTokenOut + 1n;
}

const isRefusedPastMaxPnl = (input: SwapAmountsInput, amountOut: bigint) =>
  amountOut === 0n &&
  getIsMaxPnlFactorExceededAfterSwap({
    marketInfo: input.market,
    isLong: input.testCase.isLongIn,
    usdIn: getSwapUsdIn(input),
  });

parity("getSwapAmountsByFromValue <-> Reader.getSwapAmountOut, one market", {
  markets: isSwapMarket,
  cases: swapAmountsCases,
  scenarios: [UI_FEE_SCENARIO, EMPTY_LONG_TOKEN_SWAP_IMPACT_POOLS_SCENARIO, MID_PRICES_SCENARIO],
  app: (input) => ({ amountOut: getAppSwapAmounts(input).amountOut }),
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
      knownIssues: [
        {
          reason:
            "getSwapStats measures the impact on usdIn at the min price, the contract on amountIn at the mid price",
          appliesTo: hasSpread,
        },
        {
          reason:
            "getSwapStats works in USD and rounds once, the contract rounds the fee and the impact to token-in units and the output to token-out units",
          appliesTo: (input, app, contract) => isRoundingDifference(input, app.amountOut, contract.amountOut),
        },
        {
          reason:
            "the app refuses a swap past the max pnl factor, Reader.getSwapAmountOut quotes it without the check the swap itself makes",
          appliesTo: (input, app) => isRefusedPastMaxPnl(input, app.amountOut),
        },
      ],
    },
  },
  requiredCases: [
    {
      name: "the ui fee scenario applies",
      when: ({ testCase }) => testCase.uiFeeFactor > 0n,
      scenario: UI_FEE_SCENARIO,
    },
    {
      name: "a swap with positive impact capped by the impact pool",
      when: isPositiveImpactCapped,
      scenario: EMPTY_LONG_TOKEN_SWAP_IMPACT_POOLS_SCENARIO,
    },
  ],
});
