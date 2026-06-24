import { describe, expect, it } from "vitest";

import { USD_DECIMALS } from "config/factors";
import type { PositionOrderInfo } from "domain/synthetics/orders";
import { expandDecimals, MaxUint256 } from "lib/numbers";

import type { SidecarSlTpOrderEntry } from "../types";
import {
  MAX_PERCENTAGE,
  PERCENTAGE_DECIMALS,
  getDefaultEntryField,
  handleEntryError,
  prepareInitialEntries,
} from "../utils";

describe("prepareInitialEntries", () => {
  const positionSizeUsd = expandDecimals(1000, 30);
  const triggerPrice = expandDecimals(5000, 30);

  function makeOrder(sizeDeltaUsd: bigint) {
    return {
      sizeDeltaUsd,
      triggerPrice,
    } as unknown as PositionOrderInfo;
  }

  it("keeps only full-close orders when requested", () => {
    const entries = prepareInitialEntries({
      positionOrders: [makeOrder(expandDecimals(500, 30)), makeOrder(MaxUint256)],
      sort: "desc",
      positionSizeUsd,
      onlyFullPositionClose: true,
    });

    expect(entries).toHaveLength(1);
    expect(entries?.[0].sizeUsd.value).toBe(positionSizeUsd);
    expect(entries?.[0].percentage?.value).toBe(MAX_PERCENTAGE);
    expect(entries?.[0].mode).toBe("keepPercentage");
  });

  it("marks current-position-sized orders as percentage-based full close", () => {
    const entries = prepareInitialEntries({
      positionOrders: [makeOrder(positionSizeUsd)],
      sort: "desc",
      positionSizeUsd,
      onlyFullPositionClose: true,
    });

    expect(entries).toHaveLength(1);
    expect(entries?.[0].percentage?.value).toBe(MAX_PERCENTAGE);
    expect(entries?.[0].mode).toBe("keepPercentage");
  });
});

describe("handleEntryError liquidation-price warning", () => {
  const markPrice = expandDecimals(74, 30);
  const longLiq = expandDecimals(63, 30);
  const shortLiq = expandDecimals(80, 30);

  function makeSlTpEntry(priceValue: bigint): SidecarSlTpOrderEntry {
    return {
      id: "test",
      price: getDefaultEntryField(USD_DECIMALS, { value: priceValue }),
      sizeUsd: getDefaultEntryField(USD_DECIMALS, { value: expandDecimals(1000, 30) }),
      percentage: getDefaultEntryField(PERCENTAGE_DECIMALS, { value: MAX_PERCENTAGE }),
      mode: "keepPercentage",
      order: null,
      txnType: "create",
      increaseAmounts: undefined,
      decreaseAmounts: undefined,
    };
  }

  it("sets a non-blocking warning for a long SL trigger at or below the liquidation price", () => {
    const result = handleEntryError(makeSlTpEntry(expandDecimals(60, 30)), "sl", {
      liqPrice: longLiq,
      markPrice,
      isLong: true,
      isLimit: false,
      isExistingPosition: true,
    });

    expect(result.price.warning).toBeTruthy();
    expect(result.price.error).toBeNull();
  });

  it("sets a non-blocking warning for a short SL trigger at or above the liquidation price", () => {
    const result = handleEntryError(makeSlTpEntry(expandDecimals(85, 30)), "sl", {
      liqPrice: shortLiq,
      markPrice,
      isLong: false,
      isLimit: false,
      isExistingPosition: true,
    });

    expect(result.price.warning).toBeTruthy();
    expect(result.price.error).toBeNull();
  });

  it("does not warn for a long SL trigger between the liquidation and mark price", () => {
    const result = handleEntryError(makeSlTpEntry(expandDecimals(70, 30)), "sl", {
      liqPrice: longLiq,
      markPrice,
      isLong: true,
      isLimit: false,
      isExistingPosition: true,
    });

    expect(result.price.warning).toBeFalsy();
    expect(result.price.error).toBeNull();
  });

  it("suppresses the warning when a blocking price error already applies (long TP below mark and below liq)", () => {
    const result = handleEntryError(makeSlTpEntry(expandDecimals(60, 30)), "tp", {
      liqPrice: longLiq,
      markPrice,
      isLong: true,
      isLimit: false,
      isExistingPosition: true,
    });

    expect(result.price.error).toBeTruthy();
    expect(result.price.warning).toBeFalsy();
  });
});
