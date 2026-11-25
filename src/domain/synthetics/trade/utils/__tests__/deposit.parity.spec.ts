import { getDepositAmounts } from "domain/synthetics/trade/utils/deposit";
import {
  dataStoreAddress,
  getMarketProps,
  loadMarketToken,
  ParityContext,
  readReader,
} from "domain/testUtils/parity/context";
import { parity, ParityInput, usd } from "domain/testUtils/parity/parity";
import { loadUiFeeFactor, UI_FEE_RECEIVER, UI_FEE_SCENARIO } from "domain/testUtils/parity/scenarios";
import { bigMath } from "sdk/utils/bigmath";
import type { MarketInfo } from "sdk/utils/markets/types";
import { getContractMarketPrices } from "sdk/utils/markets/utils";
import { SwapPricingType } from "sdk/utils/orders/types";
import type { TokenData } from "sdk/utils/tokens/types";
import { convertToTokenAmount, convertToUsd, getMidPrice } from "sdk/utils/tokens/utils";

type DepositCase = {
  label: string;
  longTokenAmount: bigint;
  shortTokenAmount: bigint;
  marketToken: TokenData;
  uiFeeFactor: bigint;
};

type DepositInput = ParityInput<DepositCase>;

type CaseBase = Omit<DepositCase, "label" | "longTokenAmount" | "shortTokenAmount">;

function depositCases(market: MarketInfo, caseBase: CaseBase): DepositCase[] {
  const { longToken, shortToken } = market;
  const longMidPrice = getMidPrice(longToken.prices);
  const shortMidPrice = getMidPrice(shortToken.prices);
  const longPoolUsd = convertToUsd(market.longPoolAmount, longToken.decimals, longMidPrice)!;
  const shortPoolUsd = convertToUsd(market.shortPoolAmount, shortToken.decimals, shortMidPrice)!;
  const isLongHeavy = longPoolUsd > shortPoolUsd;
  const gapUsd = bigMath.abs(longPoolUsd - shortPoolUsd);
  const poolUsd = longPoolUsd + shortPoolUsd;

  const toCase = (label: string, longUsd: bigint, shortUsd: bigint) => ({
    ...caseBase,
    label,
    longTokenAmount: convertToTokenAmount(longUsd, longToken.decimals, longMidPrice)!,
    shortTokenAmount: convertToTokenAmount(shortUsd, shortToken.decimals, shortMidPrice)!,
  });

  // the deposit form splits a single token pool deposit in halves, see selectDepositWithdrawalAmounts
  if (market.isSameCollaterals) {
    const split = (label: string, amountUsd: bigint) => toCase(label, amountUsd / 2n, amountUsd - amountUsd / 2n);

    return [split("$1k", usd(1_000)), split("1% of the pool", poolUsd / 100n)];
  }

  const light = (label: string, amountUsd: bigint) =>
    isLongHeavy ? toCase(label, 0n, amountUsd) : toCase(label, amountUsd, 0n);
  const heavy = (label: string, amountUsd: bigint) =>
    isLongHeavy ? toCase(label, amountUsd, 0n) : toCase(label, 0n, amountUsd);

  return [
    light("improving $1k", usd(1_000)),
    light("improving 10% of the gap", gapUsd / 10n),
    light("improving 50% of the gap", gapUsd / 2n),
    light("improving 90% of the gap", (gapUsd * 9n) / 10n),
    light("crossing 150% of the gap", (gapUsd * 3n) / 2n),
    light("crossing 190% of the gap", (gapUsd * 19n) / 10n),
    heavy("worsening $10k", usd(10_000)),
    heavy("worsening 1% of the pool", poolUsd / 100n),
    toCase("both sides 1% of the pool", longPoolUsd / 100n, shortPoolUsd / 100n),
  ].filter((c) => c.longTokenAmount + c.shortTokenAmount > 0n);
}

async function loadDepositCases(market: MarketInfo, ctx: ParityContext) {
  const [marketToken, uiFeeFactor] = await Promise.all([loadMarketToken(ctx, market, true), loadUiFeeFactor(ctx)]);

  return marketToken ? depositCases(market, { marketToken, uiFeeFactor }) : [];
}

function getAppDepositAmounts({ market, testCase }: DepositInput) {
  return getDepositAmounts({
    marketInfo: market,
    marketToken: testCase.marketToken,
    longToken: market.longToken,
    shortToken: market.shortToken,
    longTokenAmount: testCase.longTokenAmount,
    shortTokenAmount: testCase.shortTokenAmount,
    marketTokenAmount: 0n,
    strategy: "byCollaterals",
    includeLongToken: testCase.longTokenAmount > 0n,
    includeShortToken: testCase.shortTokenAmount > 0n,
    uiFeeFactor: testCase.uiFeeFactor,
    isMarketTokenDeposit: false,
  });
}

const hasPositiveImpact = (input: DepositInput) => getAppDepositAmounts(input).swapPriceImpactDeltaUsd > 0n;

parity("getDepositAmounts <-> Reader.getDepositAmountOut", {
  markets: (market) => !market.isDisabled && market.poolValueMax > usd(10_000),
  cases: loadDepositCases,
  scenarios: [UI_FEE_SCENARIO],
  app: (input) => ({ marketTokenAmount: getAppDepositAmounts(input).marketTokenAmount }),
  contract: async ({ ctx, market, testCase }) => {
    const marketProps = getMarketProps(market);
    const prices = getContractMarketPrices(ctx.tokensData, market)!;
    const marketTokenAmount = await readReader<bigint>(ctx, "getDepositAmountOut", [
      dataStoreAddress,
      marketProps,
      prices,
      testCase.longTokenAmount,
      testCase.shortTokenAmount,
      UI_FEE_RECEIVER,
      SwapPricingType.Deposit,
      true,
    ]);

    return { marketTokenAmount };
  },
  fields: {
    marketTokenAmount: {
      knownIssues: [
        {
          reason: "2.2.1 recomputes a positive deposit impact with the rebate (getPriceImpactUsdForDeposit), we don't",
        },
        {
          reason:
            "we take the swap and ui fees in USD and convert them at the min price, the contract applies the factors to the token amounts",
        },
        { reason: "we charge the swap fee factor on deposits, the contract the deposit fee factor" },
        {
          reason:
            "getPriceImpactForSwap keeps the pool's balanceWasImproved when the virtual inventory impact wins, the contract takes the virtual one: the other fee tier",
        },
      ],
    },
  },
  requiredCases: [
    { name: "a deposit with positive impact", when: hasPositiveImpact },
    {
      name: "the ui fee scenario applies",
      when: ({ testCase }) => testCase.uiFeeFactor > 0n,
      scenario: UI_FEE_SCENARIO,
    },
  ],
});
