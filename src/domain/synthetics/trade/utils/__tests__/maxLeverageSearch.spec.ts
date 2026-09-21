import { describe, expect, it } from "vitest";

import { ARBITRUM } from "config/chains";
import { BASIS_POINTS_DIVISOR } from "config/factors";
import { MOCK_POSITIONS_CONSTANTS } from "domain/testUtils/mockChainData";
import { createMockMarketInfo } from "domain/testUtils/mockMarketInfo";
import { createMockPositionInfo } from "domain/testUtils/mockPositionInfo";
import { ETH_TOKEN, USDC_TOKEN } from "domain/testUtils/mockTokens";
import { expandDecimals, PRECISION } from "lib/numbers";
import type { MarketInfo } from "sdk/utils/markets/types";
import type { PositionInfo } from "sdk/utils/positions/types";

import { evaluateLeverageStep, findMaxLeverageIncrease, type MaxLeverageIncreaseParams } from "../maxLeverageSearch";

const ACCOUNT = "0x1111111111111111111111111111111111111111";

// 20x → 200 steps of 0.1x
const MAX_ALLOWED_LEVERAGE = 20 * BASIS_POINTS_DIVISOR;
const HIGHEST_STEP = 200;
// numericBinarySearch never evaluates its lower bound, so the search can only settle on a step ≥ 2
const LOWEST_PROBED_STEP = 2;

function buildParams(marketInfo: MarketInfo, position: PositionInfo | undefined): MaxLeverageIncreaseParams {
  return {
    marketInfo,
    indexToken: marketInfo.indexToken,
    initialCollateralToken: USDC_TOKEN,
    collateralToken: USDC_TOKEN,
    isLong: true,
    initialCollateralAmount: expandDecimals(1_000, USDC_TOKEN.decimals),
    indexTokenAmount: undefined,
    position,
    externalSwapQuote: undefined,
    userReferralInfo: undefined,
    findSwapPath: (() => undefined) as never,
    uiFeeFactor: 0n,
    marketsInfoData: { [marketInfo.marketTokenAddress]: marketInfo },
    chainId: ARBITRUM,
    externalSwapQuoteParams: undefined,
    isSetAcceptablePriceImpactEnabled: false,
    maxAllowedLeverage: MAX_ALLOWED_LEVERAGE,
    minCollateralUsd: MOCK_POSITIONS_CONSTANTS.minCollateralUsd,
  };
}

function bruteForceLargestValidStep(params: MaxLeverageIncreaseParams): number | undefined {
  let largest: number | undefined;

  for (let step = LOWEST_PROBED_STEP; step <= HIGHEST_STEP; step++) {
    if (evaluateLeverageStep(params, step).isValid) {
      largest = step;
    }
  }

  return largest;
}

const fixtures = [
  {
    name: "fresh position on a 10x market",
    params: buildParams(
      createMockMarketInfo(ETH_TOKEN, {
        minCollateralFactor: PRECISION / 10n,
        minCollateralFactorForLiquidation: PRECISION / 20n,
      }),
      undefined
    ),
  },
  {
    name: "fresh position on a 100x market, every step of the 20x range passes",
    params: buildParams(createMockMarketInfo(ETH_TOKEN), undefined),
  },
  {
    name: "existing losing position on a 20x market",
    params: (() => {
      const marketInfo = createMockMarketInfo(ETH_TOKEN, {
        minCollateralFactor: PRECISION / 20n,
        minCollateralFactorForLiquidation: PRECISION / 40n,
      });

      return buildParams(
        marketInfo,
        // 10 000 bought at 2 500 while ETH is at 2 000: −2 000 of unrealized loss on 2 500 of collateral
        createMockPositionInfo({
          account: ACCOUNT,
          marketInfo,
          sizeInUsd: expandDecimals(10_000, 30),
          sizeInTokens: expandDecimals(4, 18),
          collateralUsd: expandDecimals(2_500, 30),
        })
      );
    })(),
  },
  {
    name: "OI-scaled min collateral gate binding before the 100x structural cap",
    params: buildParams(
      createMockMarketInfo(ETH_TOKEN, {
        // 1e-7 per usd of side OI: 990 000 + the order → ~10%, ten times the 1% market factor
        minCollateralFactorForOpenInterestLong: expandDecimals(1, 21),
        longInterestUsd: expandDecimals(990_000, 30),
        longInterestInTokens: expandDecimals(495, 18),
      }),
      undefined
    ),
  },
  {
    name: "position already below the min collateral factor",
    params: (() => {
      const marketInfo = createMockMarketInfo();

      return buildParams(
        marketInfo,
        createMockPositionInfo({
          account: ACCOUNT,
          marketInfo,
          sizeInUsd: expandDecimals(1_000_000, 30),
          sizeInTokens: expandDecimals(500, 18),
          collateralUsd: expandDecimals(100, 30),
        })
      );
    })(),
  },
];

describe("findMaxLeverageIncrease — agrees with a brute-force sweep of the same evaluation", () => {
  it.each(fixtures)("$name", ({ params }) => {
    const expectedStep = bruteForceLargestValidStep(params);
    const result = findMaxLeverageIncrease(params);

    if (expectedStep === undefined) {
      expect(result).toBeUndefined();
      return;
    }

    expect(result?.leverage).toBe(expectedStep);
    expect(result?.increaseAmounts).toEqual(evaluateLeverageStep(params, expectedStep).increaseAmounts);
  });

  it("covers a boundary inside the range, a top-of-range answer and an empty one", () => {
    const steps = fixtures.map(({ params }) => bruteForceLargestValidStep(params));

    expect(steps.some((step) => step !== undefined && step > LOWEST_PROBED_STEP && step < HIGHEST_STEP)).toBe(true);
    expect(steps.some((step) => step === HIGHEST_STEP)).toBe(true);
    expect(steps.some((step) => step === undefined)).toBe(true);
  });
});
