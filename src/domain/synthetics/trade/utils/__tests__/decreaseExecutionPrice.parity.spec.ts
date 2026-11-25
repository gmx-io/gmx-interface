import { getUncappedTotalImpactUsd, ParityContext, readExecutionPrice } from "domain/testUtils/parity/context";
import { parity, ParityInput } from "domain/testUtils/parity/parity";
import { loadPositions, ParityPosition } from "domain/testUtils/parity/positions";
import { marketConfigs } from "domain/testUtils/parity/scenarios";
import { maxPositionImpactFactorKey } from "sdk/configs/dataStore";
import type { MarketInfo } from "sdk/utils/markets/types";
import { PRECISION } from "sdk/utils/numbers";
import { getExecutionPriceForDecrease } from "sdk/utils/positions/utils";
import { getMarkPrice } from "sdk/utils/prices";
import { getDecreasePositionSizeDeltaInTokens } from "sdk/utils/trade/decrease";

type DecreaseCase = ParityPosition & { sizeDeltaUsd: bigint };

type DecreaseInput = ParityInput<DecreaseCase>;

const SMALL_NEGATIVE_IMPACT_CAP_SCENARIO = {
  name: "max negative position impact 0.01%",
  overrides: {
    uint: marketConfigs.map(({ marketTokenAddress }): [string, bigint] => [
      maxPositionImpactFactorKey(marketTokenAddress, false),
      PRECISION / 10_000n,
    ]),
  },
};

async function decreaseCases(market: MarketInfo, ctx: ParityContext): Promise<DecreaseCase[]> {
  const positions = await loadPositions(market, ctx);

  return positions.flatMap((p) =>
    [25n, 50n, 100n].map((percent) => ({
      ...p,
      label: `${p.label} close ${percent}%`,
      sizeDeltaUsd: (p.position.sizeInUsd * percent) / 100n,
    }))
  );
}

const isPartialClose = ({ testCase: { position, sizeDeltaUsd } }: DecreaseInput) => sizeDeltaUsd < position.sizeInUsd;

const isPartialCloseWithNegativePendingImpact = (input: DecreaseInput) =>
  isPartialClose(input) && input.testCase.position.pendingImpactAmount < 0n;

const getIndexPrice = (market: MarketInfo, isLong: boolean) =>
  getMarkPrice({ prices: market.indexToken.prices, isIncrease: false, isLong });

function getAppDecrease({ market, testCase: { position, sizeDeltaUsd } }: DecreaseInput) {
  const indexPrice = getIndexPrice(market, position.isLong);
  const sizeDeltaInTokens = getDecreasePositionSizeDeltaInTokens({ ...position, sizeDeltaUsd });

  return getExecutionPriceForDecrease({
    marketInfo: market,
    isLimit: false,
    isLong: position.isLong,
    indexPrice,
    sizeDeltaUsd,
    sizeDeltaInTokens,
    positionSizeInUsd: position.sizeInUsd,
    positionSizeInTokens: position.sizeInTokens,
    pendingImpactAmount: position.pendingImpactAmount,
  });
}

const bpsOfSizeDelta = { bpsOf: ({ testCase }: DecreaseInput) => testCase.sizeDeltaUsd };

// (x * y) % z is negative for a negative x, so the round up never applies
const mulDivRoundingIssue = {
  reason:
    "bigMath.mulDiv ignores roundUpMagnitude for negative values, the proportional pending impact is one index token unit short",
};

parity("getExecutionPriceForDecrease <-> Reader.getExecutionPrice, decrease", {
  markets: (market) => !market.isSpotOnly,
  cases: decreaseCases,
  scenarios: [SMALL_NEGATIVE_IMPACT_CAP_SCENARIO],
  ours: (input) => {
    const { acceptablePriceInfo, netPriceImpactValues } = getAppDecrease(input);

    return {
      priceImpactUsd: acceptablePriceInfo.priceImpactDeltaUsd,
      totalImpactUsd: netPriceImpactValues.totalImpactDeltaUsd,
      priceImpactDiffUsd: netPriceImpactValues.priceImpactDiffUsd,
      executionPrice: acceptablePriceInfo.acceptablePrice,
      balanceWasImproved: acceptablePriceInfo.balanceWasImproved,
    };
  },
  contract: async ({ ctx, market, testCase: { position, sizeDeltaUsd } }) => {
    const result = await readExecutionPrice(ctx, market, {
      positionSizeInUsd: position.sizeInUsd,
      positionSizeInTokens: position.sizeInTokens,
      sizeDeltaUsd: -sizeDeltaUsd,
      pendingImpactAmount: position.pendingImpactAmount,
      isLong: position.isLong,
    });

    return {
      priceImpactUsd: result.priceImpactUsd,
      totalImpactUsd: getUncappedTotalImpactUsd(result),
      priceImpactDiffUsd: result.priceImpactDiffUsd,
      executionPrice: result.executionPrice,
      balanceWasImproved: result.balanceWasImproved,
    };
  },
  fields: {
    priceImpactUsd: bpsOfSizeDelta,
    priceImpactDiffUsd: {
      ...bpsOfSizeDelta,
      knownIssues: [{ ...mulDivRoundingIssue, scenario: SMALL_NEGATIVE_IMPACT_CAP_SCENARIO }],
    },
    executionPrice: {
      knownIssues: [
        {
          reason:
            "we shift the index price by impact / size of itself, the contract by impact / size of the position's entry price",
        },
      ],
    },
    totalImpactUsd: { ...bpsOfSizeDelta, knownIssues: [mulDivRoundingIssue] },
    balanceWasImproved: {},
  },
  requiredCases: [
    { name: "a partial close with negative pending impact", when: isPartialCloseWithNegativePendingImpact },
    {
      name: "a partial close with positive pending impact",
      when: (input) => isPartialClose(input) && input.testCase.position.pendingImpactAmount > 0n,
    },
    {
      name: "a close where the negative impact cap binds",
      when: (_, app) => app.priceImpactDiffUsd > 0n,
      scenario: SMALL_NEGATIVE_IMPACT_CAP_SCENARIO,
    },
    { name: "a balance improving close", when: (_, app) => app.balanceWasImproved },
  ],
});
