import { readExecutionPrice } from "domain/testUtils/parity/context";
import { parity, usd } from "domain/testUtils/parity/parity";
import type { MarketInfo } from "sdk/utils/markets/types";
import { getExecutionPriceForIncrease } from "sdk/utils/positions";
import { getMarkPrice } from "sdk/utils/prices";

type IncreaseCase = { label: string; sizeDeltaUsd: bigint; isLong: boolean };

const getIndexPrice = (market: MarketInfo, isLong: boolean) =>
  getMarkPrice({ prices: market.indexToken.prices, isIncrease: true, isLong });

function getOurIncrease(market: MarketInfo, { sizeDeltaUsd, isLong }: IncreaseCase) {
  const indexPrice = getIndexPrice(market, isLong);

  return getExecutionPriceForIncrease({ marketInfo: market, isLimit: false, isLong, indexPrice, sizeDeltaUsd });
}

const getOurImpactUsd = (market: MarketInfo, testCase: IncreaseCase) =>
  getOurIncrease(market, testCase).acceptablePriceInfo.priceImpactDeltaUsd;

// Shorts far over max open interest, as long as the impact stays well under the size so the contract does not revert
function getLargeShortCases(market: MarketInfo): IncreaseCase[] {
  return [2n, 10n, 100n]
    .map((times) => ({
      label: `short ${times}x max open interest`,
      sizeDeltaUsd: market.maxOpenInterestShort * times,
      isLong: false,
    }))
    .filter((testCase) => {
      const impactUsd = getOurImpactUsd(market, testCase);

      return testCase.sizeDeltaUsd > 0n && -impactUsd * 2n < testCase.sizeDeltaUsd;
    });
}

function increaseCases(market: MarketInfo): IncreaseCase[] {
  const cases = [true, false].flatMap((isLong) => {
    const maxOpenInterest = isLong ? market.maxOpenInterestLong : market.maxOpenInterestShort;

    return [usd(1_000), usd(100_000), usd(1_000_000), usd(10_000_000)]
      .filter((sizeDeltaUsd) => sizeDeltaUsd <= maxOpenInterest)
      .map((sizeDeltaUsd) => ({
        label: `${isLong ? "long" : "short"} $${sizeDeltaUsd / usd(1)}`,
        sizeDeltaUsd,
        isLong,
      }));
  });

  return [...cases, ...getLargeShortCases(market)];
}

parity("getExecutionPriceForIncrease <-> Reader.getExecutionPrice, increase", {
  markets: (market) => !market.isDisabled && !market.isSpotOnly && market.poolValueMax > usd(100_000),
  cases: increaseCases,
  ours: ({ market, testCase }) => {
    const { priceImpactDeltaUsd, acceptablePrice } = getOurIncrease(market, testCase).acceptablePriceInfo;

    return { priceImpactUsd: priceImpactDeltaUsd, executionPrice: acceptablePrice };
  },
  reader: async ({ ctx, market, testCase: { sizeDeltaUsd, isLong } }) => {
    const { priceImpactUsd, executionPrice } = await readExecutionPrice(ctx, market, {
      positionSizeInUsd: 0n,
      positionSizeInTokens: 0n,
      sizeDeltaUsd,
      pendingImpactAmount: 0n,
      isLong,
    });

    return { priceImpactUsd, executionPrice };
  },
  fields: {
    priceImpactUsd: { bpsOf: ({ testCase }) => testCase.sizeDeltaUsd, toleranceBps: 0.001 },
    executionPrice: {
      toleranceBps: 0.001,
      knownIssues: [
        {
          reason:
            "we shift the index price linearly by impact / size, the contract divides the size by the tokens after impact and converts a negative impact at the min price",
        },
      ],
    },
  },
  requiredCases: [
    { name: "a balance improving increase", when: (_, ours) => ours.priceImpactUsd > 0n },
    {
      name: "a short over max open interest",
      when: ({ market, testCase }) => !testCase.isLong && testCase.sizeDeltaUsd > market.maxOpenInterestShort,
    },
  ],
});
