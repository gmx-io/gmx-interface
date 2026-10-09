import { maxUint256 } from "viem";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { mockPositionInfo } from "domain/synthetics/testUtils/mocks";
import { ValidationButtonTooltipName } from "domain/synthetics/trade/utils/validation";
import { createMockMarketInfo, MOCK_MARKET_ADDRESS } from "domain/testUtils/mockMarketInfo";
import { createMockSyntheticsState, MOCK_ACCOUNT } from "domain/testUtils/mockSyntheticsState";
import { ETH_ADDRESS, ETH_TOKEN, USDC_ADDRESS, USDC_TOKEN } from "domain/testUtils/mockTokens";
import { expandDecimals, formatUsd, PRECISION } from "lib/numbers";
import { OrderType, PositionOrderInfo, TwapOrderInfo } from "sdk/utils/orders/types";
import { PositionMarginFailureReason } from "sdk/utils/trade/increaseMarginCheck";
import {
  getTwapIncreaseAggregateAmounts,
  getTwapIncreasePartAmounts,
  getTwapIncreaseSequentialMarginState,
} from "sdk/utils/trade/twapIncreaseMarginCheck";
import { TradeMode, TradeType } from "sdk/utils/trade/types";

import {
  makeSelectOrderErrorByOrderKey,
  makeSelectTwapIncreaseOrderSequentialMarginState,
  selectOrderErrorsCount,
} from "../orderSelectors";
import { selectTradeboxIncreasePositionAmounts, selectTradeboxTwapIncreaseSequenceParams } from "../tradeboxSelectors";
import {
  selectTradeboxIncreaseMaxLeverageAlert,
  selectTradeboxTradeTypeError,
  selectTradeboxTwapIncreaseSequentialMarginState,
} from "../tradeboxSelectors/selectTradeboxTradeErrors";

// no fees, no price impact: each part is checked as collateral against 1% of the size it leaves;
// 2e-8 of borrowing per second accrues on the position between the parts
const marketInfo = createMockMarketInfo(ETH_TOKEN, {
  positionFeeFactorForBalanceWasImproved: 0n,
  positionFeeFactorForBalanceWasNotImproved: 0n,
  positionImpactFactorPositive: 0n,
  positionImpactFactorNegative: 0n,
  borrowingFactorPerSecondForLongs: expandDecimals(2, 22),
});

// the orders below are stamped from this moment: the preview's 10 h / 4 parts put them 12 000 s apart
const NOW_SECONDS = 1_800_000_000;

function makePosition({ sizeUsd = 10_000, collateralUsd }: { sizeUsd?: number; collateralUsd: number }) {
  return mockPositionInfo(
    {
      marketInfo,
      collateralTokenAddress: USDC_ADDRESS,
      account: MOCK_ACCOUNT,
      isLong: true,
      sizeInUsd: expandDecimals(sizeUsd, 30),
      collateralUsd: expandDecimals(collateralUsd, 30),
    },
    { isLong: true, liquidationPrice: expandDecimals(1, 30) }
  );
}

describe("TWAP increase sequential validation", () => {
  // ETH is mocked at 2 000; four parts pay 25 USDC each into a 10 000 / 200 position
  describe("in the trade box", () => {
    function createState({
      sizeEth,
      hours = 10,
      payInEth = false,
      numberOfParts = 4,
      isPositionsLoading = false,
    }: {
      sizeEth: string;
      hours?: number;
      payInEth?: boolean;
      numberOfParts?: number;
      isPositionsLoading?: boolean;
    }) {
      const position = makePosition({ collateralUsd: 200 });

      return createMockSyntheticsState({
        marketInfo,
        isLeverageSliderEnabled: false,
        tradeMode: TradeMode.Twap,
        fromTokenAddress: payInEth ? ETH_ADDRESS : USDC_ADDRESS,
        collateralAddress: USDC_ADDRESS,
        // 100 USD of margin either way: 100 USDC, or 0.05 ETH at the mocked 2 000
        fromTokenInputValue: payInEth ? "0.05" : "100",
        toTokenInputValue: sizeEth,
        twapNumberOfParts: numberOfParts,
        twapDuration: { hours, minutes: 0 },
        account: MOCK_ACCOUNT,
        isPositionsLoading,
        positionsInfoData: isPositionsLoading ? undefined : { [position.key]: position },
      });
    }

    it.each([
      {
        name: "every part passes",
        sizeEth: "2",
        failingPartIndex: undefined,
        buttonErrorMessage: undefined,
        alert: undefined,
      },
      {
        name: "a later part fails",
        sizeEth: "20",
        failingPartIndex: 1,
        buttonErrorMessage: undefined,
        alert: "warning",
      },
      {
        name: "the first part fails",
        sizeEth: "40",
        failingPartIndex: 0,
        buttonErrorMessage: "Max leverage exceeded",
        alert: "error",
      },
      {
        name: "a later part fails and a zero duration makes it eligible now",
        sizeEth: "20",
        hours: 0,
        failingPartIndex: 1,
        buttonErrorMessage: "Max leverage exceeded",
        alert: "error",
      },
    ])("$name", ({ sizeEth, hours, failingPartIndex, buttonErrorMessage, alert }) => {
      const state = createState({ sizeEth, hours });
      const tradeError = selectTradeboxTradeTypeError(state);

      expect(selectTradeboxTwapIncreaseSequentialMarginState(state)?.failingPartIndex).toBe(failingPartIndex);
      expect(tradeError.buttonErrorMessage).toBe(buttonErrorMessage);
      expect(tradeError.buttonTooltipName).toBe(
        buttonErrorMessage ? ValidationButtonTooltipName.resultingPositionMaxLeverage : undefined
      );
      expect(selectTradeboxIncreaseMaxLeverageAlert(state)).toBe(alert);
    });

    it("keeps the aggregate max-leverage guard while the positions are still loading PRO-4134", () => {
      // 50 ETH on 100 USDC is 1000x: without the position the parts cannot be projected, the aggregate still can
      const blocked = createState({ sizeEth: "50", isPositionsLoading: true });
      const allowed = createState({ sizeEth: "2", isPositionsLoading: true });

      expect(selectTradeboxTwapIncreaseSequentialMarginState(blocked)).toBeUndefined();
      expect(selectTradeboxTradeTypeError(blocked).buttonErrorMessage).toBe("Max leverage: 100.0x");
      expect(selectTradeboxTradeTypeError(allowed).buttonErrorMessage).toBeUndefined();
    });

    it.each([
      { numberOfParts: 0, buttonErrorMessage: "Min TWAP parts: 2" },
      { numberOfParts: 1, buttonErrorMessage: "Min TWAP parts: 2" },
      { numberOfParts: 31, buttonErrorMessage: "Max TWAP parts: 30" },
      { numberOfParts: 3000, buttonErrorMessage: "Max TWAP parts: 30" },
    ])("skips the projection for $numberOfParts parts PRO-4134", ({ numberOfParts, buttonErrorMessage }) => {
      const state = createState({ sizeEth: "2", numberOfParts });

      expect(selectTradeboxTwapIncreaseSequenceParams(state)).toBeUndefined();
      expect(selectTradeboxTradeTypeError(state).buttonErrorMessage).toBe(buttonErrorMessage);
    });

    it("blocks a fresh short whose first part exceeds the market's max allowed leverage PRO-4134", () => {
      // 0.5% min collateral factor: the contract would accept the 150x parts, the ui caps them at 100x
      const capOnlyMarket = createMockMarketInfo(ETH_TOKEN, {
        positionFeeFactorForBalanceWasImproved: 0n,
        positionFeeFactorForBalanceWasNotImproved: 0n,
        positionImpactFactorPositive: 0n,
        positionImpactFactorNegative: 0n,
        minCollateralFactor: PRECISION / 200n,
      });
      // four parts of 3 750 USD on 25 USDC each
      const state = createMockSyntheticsState({
        marketInfo: capOnlyMarket,
        isLeverageSliderEnabled: false,
        tradeType: TradeType.Short,
        tradeMode: TradeMode.Twap,
        fromTokenInputValue: "100",
        toTokenInputValue: "7.5",
        twapNumberOfParts: 4,
        account: MOCK_ACCOUNT,
      });
      const sequence = selectTradeboxTwapIncreaseSequentialMarginState(state)!;
      const tradeError = selectTradeboxTradeTypeError(state);

      expect(sequence.failingPartIndex).toBe(0);
      expect(sequence.marginState.reason).toBe(PositionMarginFailureReason.MaxAllowedLeverage);
      expect(sequence.contractMarginState.isLiquidatable).toBe(false);
      expect(tradeError.buttonErrorMessage).toBe("Max leverage exceeded");
      expect(tradeError.buttonTooltipName).toBe(ValidationButtonTooltipName.resultingPositionMaxLeverage);
      expect(selectTradeboxIncreaseMaxLeverageAlert(state)).toBe("error");
    });

    it.each([
      // 5 x 1.05 USDC at 48.6x: 1.0245 USD per part after the opening fee, 0.9989 USD after the closing fee
      {
        name: "blocks",
        sizeEth: "0.127675",
        buttonErrorMessage: `Margin per part: ${formatUsd(expandDecimals(102, 28))} (min ${formatUsd(expandDecimals(103, 28))})`,
      },
      { name: "allows the same margin at 5x", sizeEth: "0.013125", buttonErrorMessage: undefined },
    ])(
      "$name a fresh TWAP whose part must hold 1 USD after closing costs PRO-4134",
      ({ sizeEth, buttonErrorMessage }) => {
        const state = createMockSyntheticsState({
          marketInfo: createMockMarketInfo(ETH_TOKEN, {
            positionFeeFactorForBalanceWasImproved: PRECISION / 2000n,
            positionFeeFactorForBalanceWasNotImproved: PRECISION / 2000n,
            positionImpactFactorPositive: 0n,
            positionImpactFactorNegative: 0n,
            minCollateralFactor: PRECISION / 200n,
          }),
          isLeverageSliderEnabled: false,
          tradeMode: TradeMode.Twap,
          fromTokenInputValue: "5.25",
          toTokenInputValue: sizeEth,
          twapNumberOfParts: 5,
          account: MOCK_ACCOUNT,
        });
        const sequence = selectTradeboxTwapIncreaseSequentialMarginState(state)!;
        const tradeError = selectTradeboxTradeTypeError(state);

        expect(sequence.failingPartIndex).toBe(buttonErrorMessage ? 0 : undefined);
        expect(sequence.marginState.reason).toBe(
          buttonErrorMessage ? PositionMarginFailureReason.MinCollateral : undefined
        );
        expect(tradeError.buttonErrorMessage).toBe(buttonErrorMessage);
        expect(tradeError.buttonTooltipName).toBeUndefined();
      }
    );

    it("warns about a later part only once the borrowing accrued before it is counted PRO-4134", () => {
      // 19 800 in four parts: after the last one 300 of collateral holds 29 800 — 2 USD above the 1% minimum,
      // which 10 hours of borrowing on the growing position eat up
      const overTenHours = createState({ sizeEth: "9.9" });
      const atOnce = createState({ sizeEth: "9.9", hours: 0 });

      expect(selectTradeboxTwapIncreaseSequentialMarginState(overTenHours)?.failingPartIndex).toBe(3);
      expect(selectTradeboxTradeTypeError(overTenHours).buttonErrorMessage).toBeUndefined();
      expect(selectTradeboxIncreaseMaxLeverageAlert(overTenHours)).toBe("warning");

      expect(selectTradeboxTwapIncreaseSequentialMarginState(atOnce)?.failingPartIndex).toBeUndefined();
      expect(selectTradeboxIncreaseMaxLeverageAlert(atOnce)).toBeUndefined();
    });

    it.each([
      {
        name: "blocks",
        sizeEth: "0.002",
        buttonErrorMessage: `Min size per part: ${formatUsd(expandDecimals(1, 30))}`,
      },
      { name: "allows", sizeEth: "0.00275", buttonErrorMessage: undefined },
    ])(
      "$name a fresh TWAP whose part is $sizeEth ETH against the 1 USD min position size PRO-4134",
      ({ sizeEth, buttonErrorMessage }) => {
        // 6 USDC over five parts: 4 USD of size leaves 0.80 per part, 5.50 leaves 1.10
        const state = createMockSyntheticsState({
          marketInfo,
          isLeverageSliderEnabled: false,
          tradeMode: TradeMode.Twap,
          fromTokenInputValue: "6",
          toTokenInputValue: sizeEth,
          twapNumberOfParts: 5,
          account: MOCK_ACCOUNT,
        });

        expect(selectTradeboxTradeTypeError(state).buttonErrorMessage).toBe(buttonErrorMessage);
      }
    );

    it("values a margin paid in ETH at what reaches the USDC collateral after the swap", () => {
      const direct = selectTradeboxTwapIncreaseSequentialMarginState(createState({ sizeEth: "20" }))!;
      const swappedState = createState({ sizeEth: "20", payInEth: true });
      const swapped = selectTradeboxTwapIncreaseSequentialMarginState(swappedState)!;
      const swapLossUsd = direct.marginState.remainingCollateralUsd - swapped.marginState.remainingCollateralUsd;

      expect(selectTradeboxIncreasePositionAmounts(swappedState)?.swapStrategy.type).toBe("internalSwap");
      expect(swapped.failingPartIndex).toBe(direct.failingPartIndex);
      // the failing part holds two parts' deposits, each short of 25 USD by the pool's swap fee and impact
      expect(swapLossUsd).toBeGreaterThan(0n);
      expect(swapLossUsd).toBeLessThan(expandDecimals(1, 30));
    });

    it("swaps each part's deposit on its own, so the first part is not charged the later parts' impact PRO-4134", () => {
      // 1 ETH paid in four parts into USDC: every part swaps 0.25 ETH against the imbalance the earlier parts leave,
      // so the first part keeps 480 USD of collateral and the last one 367; a split of the one-shot swap would give
      // each part 423 and fail the first part of a 90 ETH TWAP, which only its third part should fail
      const capOnlyMarket = createMockMarketInfo(ETH_TOKEN, {
        positionFeeFactorForBalanceWasImproved: 0n,
        positionFeeFactorForBalanceWasNotImproved: 0n,
        positionImpactFactorPositive: 0n,
        positionImpactFactorNegative: 0n,
        minCollateralFactor: PRECISION / 200n,
      });
      const state = createMockSyntheticsState({
        marketInfo: capOnlyMarket,
        isLeverageSliderEnabled: false,
        tradeMode: TradeMode.Twap,
        fromTokenAddress: ETH_ADDRESS,
        collateralAddress: USDC_ADDRESS,
        fromTokenInputValue: "1",
        toTokenInputValue: "90",
        twapNumberOfParts: 4,
        account: MOCK_ACCOUNT,
      });
      const { partGrossCollateralUsds, ...sequenceParams } = selectTradeboxTwapIncreaseSequenceParams(state)!;
      const averageGrossUsd = partGrossCollateralUsds.reduce((sum, part) => sum + part, 0n) / 4n;
      const averageSplit = getTwapIncreaseSequentialMarginState({
        ...sequenceParams,
        ...getTwapIncreasePartAmounts(
          getTwapIncreaseAggregateAmounts(selectTradeboxIncreasePositionAmounts(state)!),
          4
        ),
        partGrossCollateralUsds: Array.from({ length: 4 }, () => averageGrossUsd),
        marketInfo: capOnlyMarket,
        collateralToken: USDC_TOKEN,
        isLong: true,
        existingPosition: undefined,
        uiFeeFactor: 0n,
        minCollateralUsd: expandDecimals(1, 30),
        userReferralInfo: undefined,
      })!;

      expect(partGrossCollateralUsds[0]).toBeGreaterThan(partGrossCollateralUsds[3]);
      expect(averageSplit.failingPartIndex).toBe(0);
      expect(selectTradeboxTwapIncreaseSequentialMarginState(state)?.failingPartIndex).toBe(2);
      expect(selectTradeboxTradeTypeError(state).buttonErrorMessage).toBeUndefined();
      expect(selectTradeboxIncreaseMaxLeverageAlert(state)).toBe("warning");
    });
  });

  describe("in the orders tab", () => {
    type TwapOrderParams = { partSizeUsd: number; payInEth?: boolean; executedParts?: number };

    beforeAll(() => {
      vi.useFakeTimers({ now: NOW_SECONDS * 1000, toFake: ["Date"] });
    });

    afterAll(() => {
      vi.useRealTimers();
    });

    function makeTwapOrder({ partSizeUsd, payInEth = false, executedParts = 0 }: TwapOrderParams) {
      const initialCollateralToken = payInEth ? ETH_TOKEN : USDC_TOKEN;
      // 25 USD per part: 25 USDC, or 0.0125 ETH swapped into USDC along the saved route
      const partCollateral = payInEth ? expandDecimals(125, 14) : expandDecimals(25, USDC_TOKEN.decimals);
      const parts = Array.from({ length: 4 - executedParts }, (_, i) => ({
        key: `part-${executedParts + i}`,
        account: MOCK_ACCOUNT,
        marketAddress: MOCK_MARKET_ADDRESS,
        marketInfo,
        indexToken: ETH_TOKEN,
        initialCollateralToken,
        initialCollateralTokenAddress: initialCollateralToken.address,
        targetCollateralToken: USDC_TOKEN,
        initialCollateralDeltaAmount: partCollateral,
        sizeDeltaUsd: expandDecimals(partSizeUsd, 30),
        triggerPrice: maxUint256,
        acceptablePrice: maxUint256,
        minOutputAmount: 0n,
        swapPath: payInEth ? [MOCK_MARKET_ADDRESS] : [],
        isLong: true,
        isTwap: false,
        isSwap: false,
        orderType: OrderType.LimitIncrease,
        validFromTime: BigInt(NOW_SECONDS + (executedParts + i) * 12_000),
        updatedAtTime: 0n,
        uiFeeFactor: undefined,
        executionFee: 0n,
        autoCancel: false,
      })) as unknown as PositionOrderInfo[];

      return {
        ...parts[0],
        key: "twap-order",
        isTwap: true,
        orders: parts,
        twapId: "twap",
        numberOfParts: 4,
        sizeDeltaUsd: expandDecimals(partSizeUsd, 30) * 4n,
        initialCollateralDeltaAmount: partCollateral * 4n,
      } as unknown as TwapOrderInfo<PositionOrderInfo>;
    }

    function createState({
      sizeUsd,
      collateralUsd,
      ...orderParams
    }: TwapOrderParams & { sizeUsd?: number; collateralUsd: number }) {
      const order = makeTwapOrder(orderParams);
      const position = makePosition({ sizeUsd, collateralUsd });

      return createMockSyntheticsState({
        marketInfo,
        account: MOCK_ACCOUNT,
        positionsInfoData: { [position.key]: position },
        ordersInfoData: { [order.key]: order },
      });
    }

    it.each([
      {
        name: "flags the order once a remaining part would exceed the max leverage",
        partSizeUsd: 10_000,
        collateralUsd: 200,
        errors: 1,
      },
      { name: "stays clear while every remaining part passes", partSizeUsd: 1_000, collateralUsd: 200, errors: 0 },
      {
        name: "clears once the position holds enough margin for the whole sequence",
        partSizeUsd: 10_000,
        collateralUsd: 1_000,
        errors: 0,
      },
      {
        name: "flags an order paid in ETH through its saved swap route",
        partSizeUsd: 10_000,
        collateralUsd: 200,
        payInEth: true,
        errors: 1,
      },
      {
        name: "stays clear for an order paid in ETH while every part passes",
        partSizeUsd: 1_000,
        collateralUsd: 200,
        payInEth: true,
        errors: 0,
      },
    ])("$name", ({ partSizeUsd, collateralUsd, payInEth, errors }) => {
      const state = createState({ partSizeUsd, collateralUsd, payInEth });
      const orderErrors = makeSelectOrderErrorByOrderKey("twap-order")(state);

      expect(orderErrors.errors.filter((error) => error.key === "maxLeverage")).toHaveLength(errors);
      expect(orderErrors.level).toBe(errors ? "error" : undefined);
      expect(selectOrderErrorsCount(state).errors).toBe(errors);
    });

    it("re-projects the remaining parts from the position an executed part left behind", () => {
      const selectSequence = makeSelectTwapIncreaseOrderSequentialMarginState("twap-order");
      const before = selectSequence(createState({ partSizeUsd: 10_000, collateralUsd: 200 }))!;
      // the first part added its 10 000 of size and 25 USDC of margin, three parts remain;
      // the next one is 12 000 s away, so the position still pays the same borrowing before it
      const afterState = createState({ partSizeUsd: 10_000, sizeUsd: 20_000, collateralUsd: 225, executedParts: 1 });
      const after = selectSequence(afterState)!;

      expect(before).toMatchObject({ numberOfParts: 4, failingPartIndex: 1 });
      expect(after).toMatchObject({ numberOfParts: 3, failingPartIndex: 0, isFailingPartEligibleNow: false });
      expect(after.marginState).toEqual(before.marginState);
      expect(makeSelectOrderErrorByOrderKey("twap-order")(afterState).level).toBe("error");
    });

    it("counts the borrowing the position accrues before each remaining part PRO-4134", () => {
      const selectSequence = makeSelectTwapIncreaseOrderSequentialMarginState("twap-order");
      const now = selectSequence(createState({ partSizeUsd: 1_000, collateralUsd: 200 }))!;
      vi.setSystemTime((NOW_SECONDS - 12_000) * 1000);
      const anIntervalEarlier = selectSequence(createState({ partSizeUsd: 1_000, collateralUsd: 200 }))!;
      vi.setSystemTime(NOW_SECONDS * 1000);

      // seen 12 000 s earlier, the 10 000 position pays 2.40 more of borrowing before the first part
      expect(now.failingPartIndex).toBeUndefined();
      expect(now.marginState.remainingCollateralUsd - anIntervalEarlier.marginState.remainingCollateralUsd).toBe(
        expandDecimals(240, 28)
      );
    });

    it.each([
      { name: "paid in USDC", payInEth: false },
      { name: "paid in ETH through the swap route", payInEth: true },
    ])("agrees with the trade box preview of the same TWAP on the same snapshot, $name", ({ payInEth }) => {
      const position = makePosition({ collateralUsd: 200 });
      const order = makeTwapOrder({ partSizeUsd: 10_000, payInEth });
      // the preview splits 20 ETH (40 000 USD) and 100 USD of margin into the same four parts the order holds
      const state = createMockSyntheticsState({
        marketInfo,
        isLeverageSliderEnabled: false,
        tradeMode: TradeMode.Twap,
        fromTokenAddress: payInEth ? ETH_ADDRESS : USDC_ADDRESS,
        collateralAddress: USDC_ADDRESS,
        fromTokenInputValue: payInEth ? "0.05" : "100",
        toTokenInputValue: "20",
        twapNumberOfParts: 4,
        account: MOCK_ACCOUNT,
        positionsInfoData: { [position.key]: position },
        ordersInfoData: { [order.key]: order },
      });

      const preview = selectTradeboxTwapIncreaseSequentialMarginState(state)!;
      const existing = makeSelectTwapIncreaseOrderSequentialMarginState(order.key)(state)!;

      expect(preview.failingPartIndex).toBe(1);
      expect(existing.failingPartIndex).toBe(preview.failingPartIndex);
      expect(existing.marginState).toEqual(preview.marginState);
    });
  });
});
