import { describe, expect, it } from "vitest";

import { expandDecimals, MaxUint256 } from "lib/numbers";

import {
  FULL_POSITION_CLOSE_SIZE_DELTA_USD,
  getPositionCloseSizeDeltaUsdForDisplay,
  getPositionCloseSizeDeltaUsdForPayload,
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
});
