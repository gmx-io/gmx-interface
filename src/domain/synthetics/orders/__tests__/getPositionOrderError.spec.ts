// @vitest-shared-worker
import { describe, expect, it } from "vitest";

import { BASIS_POINTS_DIVISOR } from "config/factors";
import { expandDecimals, MaxUint256 } from "lib/numbers";

import { PositionInfoLoaded } from "../../positions";
import { NextPositionValues } from "../../trade";
import { getPositionOrderError } from "../getPositionOrderError";
import { OrderType, PositionOrderInfo } from "../types";

const MARK_PRICE = expandDecimals(50_000, 30);
const TRIGGER_PRICE = expandDecimals(45_000, 30);
const ACCEPTABLE_PRICE = expandDecimals(45_500, 30);
const MAX_ALLOWED_LEVERAGE = 100 * BASIS_POINTS_DIVISOR;

function makeIncreaseOrder(overrides: Partial<PositionOrderInfo> = {}): PositionOrderInfo {
  return {
    key: "order-key",
    orderType: OrderType.LimitIncrease,
    isLong: true,
    isTwap: false,
    sizeDeltaUsd: expandDecimals(10_000, 30),
    initialCollateralDeltaAmount: expandDecimals(1_000, 6),
    triggerPrice: TRIGGER_PRICE,
    acceptablePrice: ACCEPTABLE_PRICE,
    ...overrides,
  } as unknown as PositionOrderInfo;
}

function makeDepositOrder(overrides: Partial<PositionOrderInfo> = {}): PositionOrderInfo {
  return makeIncreaseOrder({ sizeDeltaUsd: 0n, ...overrides });
}

function makePosition(liquidationPrice: bigint): PositionInfoLoaded {
  return {
    sizeInUsd: expandDecimals(10_000, 30),
    liquidationPrice,
  } as unknown as PositionInfoLoaded;
}

const exceedingLeverage = { nextLeverage: BigInt(150 * BASIS_POINTS_DIVISOR) } as NextPositionValues;

const baseParams = {
  markPrice: MARK_PRICE,
  acceptablePrice: ACCEPTABLE_PRICE,
  existingPosition: undefined,
  nextPositionValuesForIncrease: undefined,
  maxAllowedLeverage: MAX_ALLOWED_LEVERAGE,
};

describe("getPositionOrderError — margin deposit orders", () => {
  it("keeps the protective direction check for longs", () => {
    const error = getPositionOrderError({
      ...baseParams,
      positionOrder: makeDepositOrder(),
      sizeDeltaUsd: 0n,
      triggerPrice: MARK_PRICE + 1n,
    });

    expect(error).toBe("Set limit price below mark price");
  });

  it("keeps the protective direction check for shorts", () => {
    const error = getPositionOrderError({
      ...baseParams,
      positionOrder: makeDepositOrder({ isLong: false }),
      sizeDeltaUsd: 0n,
      triggerPrice: MARK_PRICE - 1n,
    });

    expect(error).toBe("Set limit price above mark price");
  });

  it("skips the max leverage check", () => {
    const error = getPositionOrderError({
      ...baseParams,
      positionOrder: makeDepositOrder(),
      sizeDeltaUsd: 0n,
      triggerPrice: expandDecimals(44_000, 30),
      nextPositionValuesForIncrease: exceedingLeverage,
    });

    expect(error).toBeUndefined();
  });

  it("blocks when the deposit is insufficient at the edited trigger price", () => {
    const error = getPositionOrderError({
      ...baseParams,
      positionOrder: makeDepositOrder(),
      sizeDeltaUsd: 0n,
      triggerPrice: expandDecimals(44_000, 30),
      existingPosition: makePosition(expandDecimals(40_000, 30)),
      marginDepositNextLiqPrice: expandDecimals(44_500, 30),
    });

    expect(error).toBe("Insufficient deposit at trigger price");
  });

  it("blocks a short deposit when the projected liquidation price is at or below the trigger", () => {
    const error = getPositionOrderError({
      ...baseParams,
      positionOrder: makeDepositOrder({ isLong: false }),
      sizeDeltaUsd: 0n,
      triggerPrice: expandDecimals(56_000, 30),
      existingPosition: makePosition(expandDecimals(60_000, 30)),
      marginDepositNextLiqPrice: expandDecimals(55_500, 30),
    });

    expect(error).toBe("Insufficient deposit at trigger price");
  });

  it("does not block when the trigger is only beyond the current liquidation price", () => {
    const error = getPositionOrderError({
      ...baseParams,
      positionOrder: makeDepositOrder(),
      sizeDeltaUsd: 0n,
      triggerPrice: expandDecimals(44_000, 30),
      existingPosition: makePosition(expandDecimals(46_000, 30)),
      marginDepositNextLiqPrice: expandDecimals(40_000, 30),
    });

    expect(error).toBeUndefined();
  });

  it("asks for a new price when nothing changed", () => {
    const error = getPositionOrderError({
      ...baseParams,
      positionOrder: makeDepositOrder(),
      sizeDeltaUsd: 0n,
      triggerPrice: TRIGGER_PRICE,
    });

    expect(error).toBe("Enter a new price");
  });
});

describe("getPositionOrderError — regular limit increase orders", () => {
  it("asks for a new amount or price when nothing changed", () => {
    const error = getPositionOrderError({
      ...baseParams,
      positionOrder: makeIncreaseOrder(),
      sizeDeltaUsd: expandDecimals(10_000, 30),
      triggerPrice: TRIGGER_PRICE,
    });

    expect(error).toBe("Enter a new amount or price");
  });

  it("still enforces the max leverage check", () => {
    const error = getPositionOrderError({
      ...baseParams,
      positionOrder: makeIncreaseOrder(),
      sizeDeltaUsd: expandDecimals(20_000, 30),
      triggerPrice: expandDecimals(44_000, 30),
      nextPositionValuesForIncrease: exceedingLeverage,
    });

    expect(error).toBe("Max leverage: 100.0x");
  });

  it("still enforces the direction check", () => {
    const error = getPositionOrderError({
      ...baseParams,
      positionOrder: makeIncreaseOrder(),
      sizeDeltaUsd: expandDecimals(20_000, 30),
      triggerPrice: MARK_PRICE + 1n,
    });

    expect(error).toBe("Set limit price below mark price");
  });

  it("treats a sizeless order without collateral as a regular increase", () => {
    const error = getPositionOrderError({
      ...baseParams,
      positionOrder: makeIncreaseOrder({ sizeDeltaUsd: 0n, initialCollateralDeltaAmount: 0n }),
      sizeDeltaUsd: 0n,
      triggerPrice: expandDecimals(44_000, 30),
      nextPositionValuesForIncrease: exceedingLeverage,
    });

    expect(error).toBe("Max leverage: 100.0x");
  });
});

describe("getPositionOrderError — take-profit orders", () => {
  // a zero-size update of an order that withdraws collateral turns it into a withdrawal at the trigger price
  // a full close without a position (a TP/SL of an unfilled limit) opens with Close 0 and keeps its stored size
  it.each<[string, bigint, number, number, boolean, string | undefined]>([
    ["blocks a close size cleared to zero", expandDecimals(5_000, 30), 0, 56_000, true, "Enter an amount"],
    ["blocks a full close cleared to zero", MaxUint256, 0, 56_000, true, "Enter an amount"],
    ["allows a price edit of a full close without a position", MaxUint256, 0, 56_000, false, undefined],
    ["keeps a zero-size collateral withdrawal editable", 0n, 0, 56_000, true, undefined],
    ["allows a new close size", expandDecimals(5_000, 30), 2_000, 56_000, true, undefined],
    [
      "blocks a price at the mark price",
      expandDecimals(5_000, 30),
      2_000,
      50_000,
      true,
      "Set trigger price above mark price",
    ],
  ])("%s", (_, orderSizeDeltaUsd, sizeUsd, priceUsd, hasPosition, expected) => {
    const takeProfitOrder = {
      ...makeIncreaseOrder(),
      orderType: OrderType.LimitDecrease,
      sizeDeltaUsd: orderSizeDeltaUsd,
      triggerPrice: expandDecimals(55_000, 30),
    };

    const error = getPositionOrderError({
      ...baseParams,
      positionOrder: takeProfitOrder,
      sizeDeltaUsd: expandDecimals(sizeUsd, 30),
      triggerPrice: expandDecimals(priceUsd, 30),
      existingPosition: hasPosition ? makePosition(expandDecimals(40_000, 30)) : undefined,
    });

    expect(error).toBe(expected);
  });
});
