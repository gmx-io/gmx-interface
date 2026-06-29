import { describe, expect, it } from "vitest";

import type { OrderInfo } from "domain/synthetics/orders";
import { OrderType } from "domain/synthetics/orders";
import { expandDecimals, MaxUint256 } from "lib/numbers";

import {
  FULL_POSITION_CLOSE_SIZE_DELTA_USD,
  getPositionCloseSizeDeltaUsdForDisplay,
  getPositionCloseSizeDeltaUsdForPayload,
  isFullClosePositionOrder,
  isFullPositionCloseSizeDeltaUsd,
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
