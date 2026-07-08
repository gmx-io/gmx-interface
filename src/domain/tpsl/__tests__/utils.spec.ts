import { describe, expect, it } from "vitest";

import type { OrderInfo } from "domain/synthetics/orders";
import { OrderType } from "domain/synthetics/orders";
import { expandDecimals, MaxUint256 } from "lib/numbers";

import {
  FULL_POSITION_CLOSE_SIZE_DELTA_USD,
  capLossAtCollateral,
  getCappedTpSlLossUsd,
  getPositionCloseSizeDeltaUsdForDisplay,
  getPositionCloseSizeDeltaUsdForPayload,
  getTpSlLiqPriceWarning,
  isFullClosePositionOrder,
  isFullPositionCloseSizeDeltaUsd,
  isTriggerBeyondLiquidation,
} from "../utils";

describe("TPSL full-position close utilities", () => {
  const positionSizeUsd = expandDecimals(1000, 30);

  it("recognizes MaxUint256 as semantic full close", () => {
    expect(FULL_POSITION_CLOSE_SIZE_DELTA_USD).toBe(MaxUint256);
    expect(isFullPositionCloseSizeDeltaUsd(MaxUint256, positionSizeUsd)).toBe(true);
  });

  it("uses position size for display while preserving MaxUint256 for payloads", () => {
    expect(getPositionCloseSizeDeltaUsdForDisplay(MaxUint256, positionSizeUsd)).toBe(positionSizeUsd);
    expect(getPositionCloseSizeDeltaUsdForPayload(positionSizeUsd, true)).toBe(MaxUint256);
  });

  it("does not treat smaller explicitly sized orders as full close", () => {
    expect(isFullPositionCloseSizeDeltaUsd(expandDecimals(400, 30), positionSizeUsd)).toBe(false);
    expect(getPositionCloseSizeDeltaUsdForPayload(expandDecimals(400, 30), false)).toBe(expandDecimals(400, 30));
  });

  it("never returns the sentinel from the display helper", () => {
    expect(getPositionCloseSizeDeltaUsdForDisplay(MaxUint256, undefined)).toBe(0n);
    expect(getPositionCloseSizeDeltaUsdForDisplay(MaxUint256, 0n)).toBe(0n);
  });
});

describe("isFullClosePositionOrder", () => {
  const positionSizeUsd = expandDecimals(1000, 30);

  function makeOrder(overrides: { orderType: OrderType; sizeDeltaUsd: bigint; isTwap?: boolean }) {
    return {
      orderType: overrides.orderType,
      sizeDeltaUsd: overrides.sizeDeltaUsd,
      isTwap: overrides.isTwap ?? false,
    } as unknown as OrderInfo;
  }

  it("treats TP/SL trigger decrease orders sized to the position as full close", () => {
    expect(
      isFullClosePositionOrder(
        makeOrder({ orderType: OrderType.LimitDecrease, sizeDeltaUsd: positionSizeUsd }),
        positionSizeUsd
      )
    ).toBe(true);
    expect(
      isFullClosePositionOrder(
        makeOrder({ orderType: OrderType.StopLossDecrease, sizeDeltaUsd: MaxUint256 }),
        positionSizeUsd
      )
    ).toBe(true);
  });

  it("never treats TWAP decrease orders as full close even when aggregated size matches the position", () => {
    expect(
      isFullClosePositionOrder(
        makeOrder({ orderType: OrderType.LimitDecrease, sizeDeltaUsd: positionSizeUsd, isTwap: true }),
        positionSizeUsd
      )
    ).toBe(false);
  });

  it("ignores non-trigger-decrease order types", () => {
    expect(
      isFullClosePositionOrder(
        makeOrder({ orderType: OrderType.MarketDecrease, sizeDeltaUsd: positionSizeUsd }),
        positionSizeUsd
      )
    ).toBe(false);
    expect(
      isFullClosePositionOrder(
        makeOrder({ orderType: OrderType.LimitIncrease, sizeDeltaUsd: positionSizeUsd }),
        positionSizeUsd
      )
    ).toBe(false);
  });
});

describe("getTpSlLiqPriceWarning", () => {
  const longLiq = expandDecimals(63, 30);
  const shortLiq = expandDecimals(80, 30);

  it("warns for a long when the trigger price is below the liquidation price", () => {
    const warning = getTpSlLiqPriceWarning({
      triggerPrice: expandDecimals(60, 30),
      liquidationPrice: longLiq,
      isLong: true,
    });
    expect(warning).toBeTruthy();
    expect(typeof warning).toBe("string");
  });

  it("warns for a long when the trigger price equals the liquidation price (inclusive boundary)", () => {
    expect(getTpSlLiqPriceWarning({ triggerPrice: longLiq, liquidationPrice: longLiq, isLong: true })).toBeTruthy();
  });

  it("does not warn for a long when the trigger price is above the liquidation price", () => {
    expect(
      getTpSlLiqPriceWarning({ triggerPrice: expandDecimals(70, 30), liquidationPrice: longLiq, isLong: true })
    ).toBeUndefined();
  });

  it("warns for a short when the trigger price is above the liquidation price", () => {
    const warning = getTpSlLiqPriceWarning({
      triggerPrice: expandDecimals(85, 30),
      liquidationPrice: shortLiq,
      isLong: false,
    });
    expect(warning).toBeTruthy();
    expect(typeof warning).toBe("string");
  });

  it("warns for a short when the trigger price equals the liquidation price (inclusive boundary)", () => {
    expect(getTpSlLiqPriceWarning({ triggerPrice: shortLiq, liquidationPrice: shortLiq, isLong: false })).toBeTruthy();
  });

  it("does not warn for a short when the trigger price is below the liquidation price", () => {
    expect(
      getTpSlLiqPriceWarning({ triggerPrice: expandDecimals(70, 30), liquidationPrice: shortLiq, isLong: false })
    ).toBeUndefined();
  });

  it("does not warn when the liquidation price is missing, zero, or the max sentinel", () => {
    const triggerPrice = expandDecimals(60, 30);
    expect(getTpSlLiqPriceWarning({ triggerPrice, liquidationPrice: undefined, isLong: true })).toBeUndefined();
    expect(getTpSlLiqPriceWarning({ triggerPrice, liquidationPrice: 0n, isLong: true })).toBeUndefined();
    expect(getTpSlLiqPriceWarning({ triggerPrice, liquidationPrice: MaxUint256, isLong: true })).toBeUndefined();
  });

  it("does not warn when the trigger price is missing or non-positive", () => {
    expect(
      getTpSlLiqPriceWarning({ triggerPrice: undefined, liquidationPrice: longLiq, isLong: true })
    ).toBeUndefined();
    expect(getTpSlLiqPriceWarning({ triggerPrice: 0n, liquidationPrice: longLiq, isLong: true })).toBeUndefined();
  });
});

describe("capLossAtCollateral", () => {
  const collateralUsd = expandDecimals(100, 30);

  it("floors a loss that exceeds the collateral at -collateral (you can't lose more than your margin)", () => {
    expect(capLossAtCollateral(-expandDecimals(115, 30), collateralUsd)).toBe(-expandDecimals(100, 30));
  });

  it("leaves a smaller loss unchanged", () => {
    expect(capLossAtCollateral(-expandDecimals(50, 30), collateralUsd)).toBe(-expandDecimals(50, 30));
  });

  it("leaves a profit unchanged", () => {
    expect(capLossAtCollateral(expandDecimals(30, 30), collateralUsd)).toBe(expandDecimals(30, 30));
  });

  it("returns the value unchanged when the collateral is missing or zero", () => {
    expect(capLossAtCollateral(-expandDecimals(115, 30), undefined)).toBe(-expandDecimals(115, 30));
    expect(capLossAtCollateral(-expandDecimals(115, 30), 0n)).toBe(-expandDecimals(115, 30));
  });
});

describe("isTriggerBeyondLiquidation", () => {
  const longLiq = expandDecimals(63, 30);
  const shortLiq = expandDecimals(80, 30);

  it("is true for a long trigger at or below the liquidation price", () => {
    expect(
      isTriggerBeyondLiquidation({ triggerPrice: expandDecimals(60, 30), liquidationPrice: longLiq, isLong: true })
    ).toBe(true);
    expect(isTriggerBeyondLiquidation({ triggerPrice: longLiq, liquidationPrice: longLiq, isLong: true })).toBe(true);
  });

  it("is false for a long trigger above the liquidation price", () => {
    expect(
      isTriggerBeyondLiquidation({ triggerPrice: expandDecimals(70, 30), liquidationPrice: longLiq, isLong: true })
    ).toBe(false);
  });

  it("is true for a short trigger at or above the liquidation price", () => {
    expect(
      isTriggerBeyondLiquidation({ triggerPrice: expandDecimals(85, 30), liquidationPrice: shortLiq, isLong: false })
    ).toBe(true);
  });

  it("is false for a short trigger below the liquidation price", () => {
    expect(
      isTriggerBeyondLiquidation({ triggerPrice: expandDecimals(70, 30), liquidationPrice: shortLiq, isLong: false })
    ).toBe(false);
  });

  it("is false when the trigger or liquidation price is missing, zero, or the max sentinel", () => {
    const triggerPrice = expandDecimals(60, 30);
    expect(isTriggerBeyondLiquidation({ triggerPrice: undefined, liquidationPrice: longLiq, isLong: true })).toBe(
      false
    );
    expect(isTriggerBeyondLiquidation({ triggerPrice, liquidationPrice: undefined, isLong: true })).toBe(false);
    expect(isTriggerBeyondLiquidation({ triggerPrice, liquidationPrice: 0n, isLong: true })).toBe(false);
    expect(isTriggerBeyondLiquidation({ triggerPrice, liquidationPrice: MaxUint256, isLong: true })).toBe(false);
  });
});

describe("getCappedTpSlLossUsd", () => {
  const collateralUsd = expandDecimals(100, 30);
  const longLiq = expandDecimals(63, 30);

  it("shows the full collateral loss (-100%) for a trigger beyond the liquidation price", () => {
    expect(
      getCappedTpSlLossUsd({
        pnlUsd: -expandDecimals(52, 30),
        collateralUsd,
        triggerPrice: expandDecimals(60, 30),
        liquidationPrice: longLiq,
        isLong: true,
      })
    ).toBe(-collateralUsd);
  });

  it("shows the actual price PnL for a trigger within range", () => {
    expect(
      getCappedTpSlLossUsd({
        pnlUsd: -expandDecimals(40, 30),
        collateralUsd,
        triggerPrice: expandDecimals(70, 30),
        liquidationPrice: longLiq,
        isLong: true,
      })
    ).toBe(-expandDecimals(40, 30));
  });

  it("still floors a within-range loss at -collateral", () => {
    expect(
      getCappedTpSlLossUsd({
        pnlUsd: -expandDecimals(150, 30),
        collateralUsd,
        triggerPrice: expandDecimals(70, 30),
        liquidationPrice: longLiq,
        isLong: true,
      })
    ).toBe(-collateralUsd);
  });
});
