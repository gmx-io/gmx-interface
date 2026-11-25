import { getWithdrawalAmounts } from "domain/synthetics/trade/utils/withdrawal";
import {
  dataStoreAddress,
  getMarketProps,
  loadMarketToken,
  ParityContext,
  readReader,
} from "domain/testUtils/parity/context";
import { parity, ParityInput, usd } from "domain/testUtils/parity/parity";
import { loadUiFeeFactor, UI_FEE_RECEIVER, UI_FEE_SCENARIO } from "domain/testUtils/parity/scenarios";
import type { MarketInfo } from "sdk/utils/markets/types";
import { getContractMarketPrices } from "sdk/utils/markets/utils";
import { SwapPricingType } from "sdk/utils/orders/types";
import type { TokenData } from "sdk/utils/tokens/types";

type WithdrawalCase = {
  label: string;
  marketToken: TokenData;
  marketTokenAmount: bigint;
  uiFeeFactor: bigint;
};

type WithdrawalInput = ParityInput<WithdrawalCase>;

async function withdrawalCases(market: MarketInfo, ctx: ParityContext): Promise<WithdrawalCase[]> {
  const [marketToken, uiFeeFactor] = await Promise.all([loadMarketToken(ctx, market, false), loadUiFeeFactor(ctx)]);

  if (!marketToken) {
    return [];
  }

  return [
    { label: "$1k", withdrawUsd: usd(1_000) },
    { label: "$100k", withdrawUsd: usd(100_000) },
    { label: "1% of the pool", withdrawUsd: market.poolValueMax / 100n },
    { label: "25% of the pool", withdrawUsd: market.poolValueMax / 4n },
  ]
    .filter((c) => c.withdrawUsd <= market.poolValueMax / 2n)
    .map(({ label, withdrawUsd }) => ({
      label,
      marketToken,
      marketTokenAmount: (withdrawUsd * marketToken.totalSupply!) / market.poolValueMax,
      uiFeeFactor,
    }));
}

function getOurWithdrawalAmounts({ market, testCase }: WithdrawalInput) {
  const { longTokenAmount, shortTokenAmount } = getWithdrawalAmounts({
    marketInfo: market,
    marketToken: testCase.marketToken,
    marketTokenAmount: testCase.marketTokenAmount,
    longTokenAmount: 0n,
    shortTokenAmount: 0n,
    strategy: "byMarketToken",
    uiFeeFactor: testCase.uiFeeFactor,
    isSameCollaterals: market.isSameCollaterals,
  });

  return { longTokenAmount, shortTokenAmount };
}

const knownIssues = [
  { reason: "marketTokenAmountToUsd prices GM at poolValueMax, the contract at the minimized pool value" },
  {
    reason:
      "we take the fees on the USD output and round once, the contract floors the output and each fee to token units",
  },
];

parity("getWithdrawalAmounts <-> Reader.getWithdrawalAmountOut", {
  markets: (market) => !market.isDisabled && market.poolValueMax > usd(10_000),
  cases: withdrawalCases,
  scenarios: [UI_FEE_SCENARIO],
  ours: getOurWithdrawalAmounts,
  contract: async ({ ctx, market, testCase }) => {
    const marketProps = getMarketProps(market);
    const prices = getContractMarketPrices(ctx.tokensData, market)!;
    const [longTokenAmount, shortTokenAmount] = await readReader<readonly [bigint, bigint]>(
      ctx,
      "getWithdrawalAmountOut",
      [dataStoreAddress, marketProps, prices, testCase.marketTokenAmount, UI_FEE_RECEIVER, SwapPricingType.Withdrawal]
    );

    return { longTokenAmount, shortTokenAmount };
  },
  fields: {
    longTokenAmount: {
      toleranceBps: 0.001,
      knownIssues: [
        ...knownIssues,
        {
          reason:
            "getWithdrawalAmounts takes the long token ui fee from marketTokenUsd instead of longTokenUsd, so the long side also pays the short side's ui fee",
          scenario: UI_FEE_SCENARIO,
        },
      ],
    },
    shortTokenAmount: { toleranceBps: 0.001, knownIssues },
  },
  requiredCases: [
    {
      name: "the ui fee scenario applies",
      when: ({ testCase }) => testCase.uiFeeFactor > 0n,
      scenario: UI_FEE_SCENARIO,
    },
  ],
});
