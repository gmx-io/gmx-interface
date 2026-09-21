import { describe, expect, it } from "vitest";

import { mockPositionInfo } from "domain/synthetics/testUtils/mocks";
import { ValidationButtonTooltipName } from "domain/synthetics/trade/utils/validation";
import { createMockMarketInfo } from "domain/testUtils/mockMarketInfo";
import {
  createMockSyntheticsState,
  MOCK_ACCOUNT,
  MockSyntheticsStateOverrides,
} from "domain/testUtils/mockSyntheticsState";
import { ETH_TOKEN, USDC_ADDRESS } from "domain/testUtils/mockTokens";
import { expandDecimals } from "lib/numbers";
import { PositionMarginFailureReason } from "sdk/utils/trade/increaseMarginCheck";
import { TradeMode } from "sdk/utils/trade/types";

import {
  selectTradeboxIncreaseLiquidationRiskWarning,
  selectTradeboxIncreaseMaxLeverageAlert,
  selectTradeboxIncreaseResultingPositionMarginState,
  selectTradeboxTradeTypeError,
} from "../tradeboxSelectors/selectTradeboxTradeErrors";

const OTHER_ACCOUNT = "0x2222222222222222222222222222222222222222";

// no fees, no price impact: the resulting margin is collateral + pnl; min collateral factor stays 1 %
const marketInfo = createMockMarketInfo(ETH_TOKEN, {
  positionFeeFactorForBalanceWasImproved: 0n,
  positionFeeFactorForBalanceWasNotImproved: 0n,
  positionImpactFactorPositive: 0n,
  positionImpactFactorNegative: 0n,
});

const POSITION_SIZE_USD = expandDecimals(10_000, 30);
const POSITION_COLLATERAL_USD = expandDecimals(2_000, 30);
const PAY_USDC = "1000";
const SIZE_ETH = "1.5";

// resulting collateral 2 000 + 1 000 = 3 000 USD; resulting size 10 000 + 1.5 ETH × P (P = 2 000 / 1 800 / 2 200)
// = 13 000 / 12 700 / 13 300 USD → 1 % min collateral for leverage = 130 / 127 / 133 USD;
// a 2 900 loss leaves 100 USD (≥ 1 USD min collateral, below 1 % of the size), a 3 000 loss leaves 0
const LOSS_BY_REASON = {
  pass: 0n,
  [PositionMarginFailureReason.MinCollateralForLeverage]: expandDecimals(2_900, 30),
  [PositionMarginFailureReason.MinCollateral]: expandDecimals(3_000, 30),
} as const;

type Reason = keyof typeof LOSS_BY_REASON;

function makeLosingPosition({
  lossUsd,
  evalPrice,
  account = MOCK_ACCOUNT,
}: {
  lossUsd: bigint;
  evalPrice: bigint;
  account?: string;
}) {
  return mockPositionInfo(
    {
      marketInfo,
      collateralTokenAddress: USDC_ADDRESS,
      account,
      isLong: true,
      sizeInUsd: POSITION_SIZE_USD,
      collateralUsd: POSITION_COLLATERAL_USD,
    },
    {
      // pnl at evalPrice = sizeInTokens × evalPrice − sizeInUsd = −lossUsd
      sizeInTokens: ((POSITION_SIZE_USD - lossUsd) * expandDecimals(1, 18)) / evalPrice,
      liquidationPrice: expandDecimals(1, 30),
    }
  );
}

const MARKET_ORDER = { name: "Market", tradeMode: TradeMode.Market, triggerPriceInputValue: "", evalPrice: 2000n };

// ETH is mocked at 2 000: a long limit at the mark price and a long stop at the mark price are executable now
const ORDER_WINDOWS = [
  { ...MARKET_ORDER, executableNow: true },
  {
    name: "Limit executable now",
    tradeMode: TradeMode.Limit,
    triggerPriceInputValue: "2000",
    evalPrice: 2000n,
    executableNow: true,
  },
  {
    name: "Limit resting",
    tradeMode: TradeMode.Limit,
    triggerPriceInputValue: "1800",
    evalPrice: 1800n,
    executableNow: false,
  },
  {
    name: "Stop resting",
    tradeMode: TradeMode.StopMarket,
    triggerPriceInputValue: "2200",
    evalPrice: 2200n,
    executableNow: false,
  },
];

function createState(
  {
    tradeMode,
    triggerPriceInputValue,
    evalPrice,
  }: { tradeMode: TradeMode; triggerPriceInputValue: string; evalPrice: bigint },
  reason: Reason,
  overrides: MockSyntheticsStateOverrides = {}
) {
  const position = makeLosingPosition({ lossUsd: LOSS_BY_REASON[reason], evalPrice: expandDecimals(evalPrice, 30) });

  return createMockSyntheticsState({
    marketInfo,
    isLeverageSliderEnabled: false,
    tradeMode,
    triggerPriceInputValue,
    fromTokenInputValue: PAY_USDC,
    toTokenInputValue: SIZE_ETH,
    account: MOCK_ACCOUNT,
    positionsInfoData: { [position.key]: position },
    ...overrides,
  });
}

describe("resulting-position margin check windows", () => {
  it("evaluates without a discount while the pro tier is unknown", () => {
    const unknownTier = createState(MARKET_ORDER, PositionMarginFailureReason.MinCollateralForLeverage, {
      proDiscountFactor: undefined,
    });
    const noDiscount = createState(MARKET_ORDER, PositionMarginFailureReason.MinCollateralForLeverage, {
      proDiscountFactor: 0n,
    });

    const marginState = selectTradeboxIncreaseResultingPositionMarginState(unknownTier);

    expect(marginState).toBeDefined();
    expect(marginState).toEqual(selectTradeboxIncreaseResultingPositionMarginState(noDiscount));
  });

  describe.each([
    {
      name: "positions are still loading",
      overrides: { positionsInfoData: undefined, isPositionsLoading: true } as MockSyntheticsStateOverrides,
    },
    {
      name: "the cache still holds another account's positions",
      overrides: {
        account: OTHER_ACCOUNT,
        isPositionsLoading: true,
      } as MockSyntheticsStateOverrides,
    },
  ])("while $name", ({ overrides }) => {
    it("neither blocks nor alerts", () => {
      const state = createState(MARKET_ORDER, PositionMarginFailureReason.MinCollateralForLeverage, overrides);

      expect(selectTradeboxIncreaseResultingPositionMarginState(state)).toBeUndefined();
      expect(selectTradeboxIncreaseMaxLeverageAlert(state)).toBeUndefined();
      expect(selectTradeboxTradeTypeError(state).buttonErrorMessage).toBeUndefined();
    });
  });

  describe.each(ORDER_WINDOWS)("$name", (orderWindow) => {
    const blocking = orderWindow.executableNow;

    it.each([
      {
        reason: "pass" as Reason,
        buttonErrorMessage: undefined,
        buttonTooltipName: undefined,
        alert: undefined,
        liquidationRisk: false,
      },
      {
        reason: PositionMarginFailureReason.MinCollateralForLeverage as Reason,
        buttonErrorMessage: blocking ? "Max leverage exceeded" : undefined,
        buttonTooltipName: blocking ? ValidationButtonTooltipName.resultingPositionMaxLeverage : undefined,
        alert: blocking ? "error" : "warning",
        liquidationRisk: false,
      },
      {
        reason: PositionMarginFailureReason.MinCollateral as Reason,
        buttonErrorMessage: blocking ? "Invalid liquidation price" : undefined,
        buttonTooltipName: blocking ? ValidationButtonTooltipName.liqPriceGtMarkPrice : undefined,
        alert: undefined,
        liquidationRisk: !blocking,
      },
    ])("$reason", ({ reason, buttonErrorMessage, buttonTooltipName, alert, liquidationRisk }) => {
      const state = createState(orderWindow, reason);

      const marginState = selectTradeboxIncreaseResultingPositionMarginState(state);
      const tradeError = selectTradeboxTradeTypeError(state);

      expect(marginState?.reason).toBe(reason === "pass" ? undefined : reason);
      expect(tradeError.buttonErrorMessage).toBe(buttonErrorMessage);
      expect(tradeError.buttonTooltipName).toBe(buttonTooltipName);
      expect(selectTradeboxIncreaseMaxLeverageAlert(state)).toBe(alert);
      expect(selectTradeboxIncreaseLiquidationRiskWarning(state)).toBe(liquidationRisk);
    });
  });
});
