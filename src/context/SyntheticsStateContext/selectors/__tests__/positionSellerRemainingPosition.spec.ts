import { describe, expect, it } from "vitest";

import { mockPositionInfo } from "domain/synthetics/testUtils/mocks";
import { OrderOption } from "domain/synthetics/trade/usePositionSellerState";
import { createMockMarketInfo } from "domain/testUtils/mockMarketInfo";
import { createMockSyntheticsState, MOCK_ACCOUNT } from "domain/testUtils/mockSyntheticsState";
import { ETH_TOKEN, USDC_ADDRESS } from "domain/testUtils/mockTokens";
import { expandDecimals } from "lib/numbers";
import { PositionMarginFailureReason } from "sdk/utils/trade/increaseMarginCheck";

import type { SyntheticsState } from "../../SyntheticsStateContextProvider";
import {
  selectPositionSellerDecreaseAmounts,
  selectPositionSellerKeepLeverage,
  selectPositionSellerLeverageDisabledByCollateral,
  selectPositionSellerNextLeverageWithoutPnl,
  selectPositionSellerNextPositionValuesForDecrease,
  selectPositionSellerRemainingPositionMarginState,
} from "../positionSellerSelectors";

// no fees, no price impact: the remaining margin is collateral + pnl; 1 % regular factor, 0.5 % for liquidation
const marketInfo = createMockMarketInfo(ETH_TOKEN, {
  positionFeeFactorForBalanceWasImproved: 0n,
  positionFeeFactorForBalanceWasNotImproved: 0n,
  positionImpactFactorPositive: 0n,
  positionImpactFactorNegative: 0n,
});

const usd = (value: number) => expandDecimals(value, 30);
const SIZE_USD = usd(10_000);
const LOSS_USD = usd(2_000);

/** a 10 000 USD long losing 2 000; ETH is mocked at 2 000 */
function makePosition(collateralUsd: bigint) {
  return mockPositionInfo(
    {
      marketInfo,
      collateralTokenAddress: USDC_ADDRESS,
      account: MOCK_ACCOUNT,
      isLong: true,
      sizeInUsd: SIZE_USD,
      collateralUsd,
    },
    {
      sizeInTokens: ((SIZE_USD - LOSS_USD) * expandDecimals(1, 18)) / usd(2_000),
      pnl: -LOSS_USD,
      markPrice: usd(2_000),
      remainingCollateralUsd: collateralUsd,
    }
  );
}

function createState(p: {
  collateralUsd: bigint;
  closeUsd: string;
  keepLeverage: boolean;
  orderOption?: OrderOption;
  isPnlInLeverage?: boolean;
}): SyntheticsState {
  const position = makePosition(p.collateralUsd);
  const state = createMockSyntheticsState({
    marketInfo,
    account: MOCK_ACCOUNT,
    positionsInfoData: { [position.key]: position },
    isPnlInLeverage: p.isPnlInLeverage,
  });

  return {
    ...state,
    globals: { ...state.globals, closingPositionKey: position.key },
    positionSeller: {
      orderOption: p.orderOption ?? OrderOption.Market,
      closeUsdInputValue: p.closeUsd,
      keepLeverage: p.keepLeverage,
      receiveTokenAddress: USDC_ADDRESS,
      isReceiveTokenChanged: false,
      defaultReceiveToken: undefined,
      isReceiveSeparated: false,
      numberOfParts: 0,
      triggerPriceInputValue: "",
      selectedTriggerAcceptablePriceImpactBps: undefined,
    },
  } as unknown as SyntheticsState;
}

describe("position seller — remaining position after a market partial close", () => {
  // 2 060 of collateral and a 2 000 loss leave 60 of margin: under the 1 % regular minimum of the full
  // position (100), above its 0.5 % liquidation minimum (50)
  const OVER_LEVERAGED = usd(2_060);

  it("blocks a partial close whose remainder stays above max leverage", () => {
    const state = createState({ collateralUsd: OVER_LEVERAGED, closeUsd: "2500", keepLeverage: false });
    const marginState = selectPositionSellerRemainingPositionMarginState(state);

    expect(selectPositionSellerDecreaseAmounts(state)?.isFullClose).toBe(false);
    expect(marginState?.reason).toBe(PositionMarginFailureReason.MinCollateralForLeverage);
    expect(marginState?.remainingCollateralUsd).toBe(usd(60));
    expect(marginState?.minCollateralUsdForLeverage).toBe(usd(75));
  });

  it("passes once the remainder is small enough, equality included", () => {
    const atThreshold = createState({ collateralUsd: OVER_LEVERAGED, closeUsd: "4000", keepLeverage: false });
    const above = createState({ collateralUsd: OVER_LEVERAGED, closeUsd: "5000", keepLeverage: false });

    expect(selectPositionSellerRemainingPositionMarginState(atThreshold)?.minCollateralUsdForLeverage).toBe(usd(60));
    expect(selectPositionSellerRemainingPositionMarginState(atThreshold)?.isLiquidatable).toBe(false);
    expect(selectPositionSellerRemainingPositionMarginState(above)?.isLiquidatable).toBe(false);
  });

  it("does not validate a full close", () => {
    const state = createState({ collateralUsd: OVER_LEVERAGED, closeUsd: "10000", keepLeverage: false });

    expect(selectPositionSellerDecreaseAmounts(state)?.isFullClose).toBe(true);
    expect(selectPositionSellerRemainingPositionMarginState(state)).toBeUndefined();
  });

  it("switches keep leverage off when its collateral withdrawal is what the contract would reject", () => {
    const state = createState({ collateralUsd: OVER_LEVERAGED, closeUsd: "5000", keepLeverage: true });

    expect(selectPositionSellerLeverageDisabledByCollateral(state)).toBe(true);
    expect(selectPositionSellerKeepLeverage(state)).toBe(false);
    expect(selectPositionSellerDecreaseAmounts(state)?.collateralDeltaAmount).toBe(0n);
    expect(selectPositionSellerRemainingPositionMarginState(state)?.isLiquidatable).toBe(false);
  });

  it("still blocks when the remainder fails without the collateral withdrawal too", () => {
    const state = createState({ collateralUsd: OVER_LEVERAGED, closeUsd: "2500", keepLeverage: true });

    expect(selectPositionSellerKeepLeverage(state)).toBe(false);
    expect(selectPositionSellerRemainingPositionMarginState(state)?.isLiquidatable).toBe(true);
  });

  it("keeps the leverage of a position with enough margin", () => {
    const state = createState({ collateralUsd: usd(3_000), closeUsd: "5000", keepLeverage: true });

    expect(selectPositionSellerLeverageDisabledByCollateral(state)).toBe(false);
    expect(selectPositionSellerKeepLeverage(state)).toBe(true);
    expect(selectPositionSellerDecreaseAmounts(state)!.collateralDeltaAmount).toBeGreaterThan(0n);
    expect(selectPositionSellerRemainingPositionMarginState(state)?.isLiquidatable).toBe(false);
  });

  it("leaves the TWAP tab untouched", () => {
    const state = createState({
      collateralUsd: OVER_LEVERAGED,
      closeUsd: "2500",
      keepLeverage: true,
      orderOption: OrderOption.Twap,
    });

    expect(selectPositionSellerRemainingPositionMarginState(state)).toBeUndefined();
    expect(selectPositionSellerLeverageDisabledByCollateral(state)).toBe(false);
  });

  it("validates the same leverage whether pnl is included in the displayed leverage or not", () => {
    const params = { collateralUsd: usd(3_000), closeUsd: "5000", keepLeverage: false };
    const withPnl = createState({ ...params, isPnlInLeverage: true });
    const withoutPnl = createState({ ...params, isPnlInLeverage: false });

    expect(selectPositionSellerNextPositionValuesForDecrease(withPnl)?.nextLeverage).not.toBe(
      selectPositionSellerNextPositionValuesForDecrease(withoutPnl)?.nextLeverage
    );
    expect(selectPositionSellerNextLeverageWithoutPnl(withPnl)).toBe(
      selectPositionSellerNextLeverageWithoutPnl(withoutPnl)
    );
    expect(selectPositionSellerNextLeverageWithoutPnl(withPnl)).toBe(
      selectPositionSellerNextPositionValuesForDecrease(withoutPnl)?.nextLeverage
    );
  });
});
