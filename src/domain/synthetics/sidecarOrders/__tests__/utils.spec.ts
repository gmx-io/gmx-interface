import { describe, expect, it } from "vitest";

import type { PositionOrderInfo } from "domain/synthetics/orders";
import { expandDecimals, MaxUint256 } from "lib/numbers";

import { MAX_PERCENTAGE, prepareInitialEntries } from "../utils";

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
