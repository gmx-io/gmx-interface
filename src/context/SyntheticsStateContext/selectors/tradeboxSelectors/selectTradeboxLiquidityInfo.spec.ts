import { describe, expect, it } from "vitest";

import { expandDecimals } from "lib/numbers";

import { getMaxSizeWarningState } from "./selectTradeboxLiquidityInfo";

describe("getMaxSizeWarningState", () => {
  const maxSizeUsd = expandDecimals(100, 30);

  it("hides max size below 80%", () => {
    expect(getMaxSizeWarningState(expandDecimals(79, 30), maxSizeUsd)).toEqual({
      shouldShowMaxSize: false,
      isSizeAboveMax: false,
    });
  });

  it("shows neutral max size from 80% through 100%", () => {
    expect(getMaxSizeWarningState(expandDecimals(80, 30), maxSizeUsd)).toEqual({
      shouldShowMaxSize: true,
      isSizeAboveMax: false,
    });
    expect(getMaxSizeWarningState(maxSizeUsd, maxSizeUsd)).toEqual({
      shouldShowMaxSize: true,
      isSizeAboveMax: false,
    });
  });

  it("marks size above the max as negative", () => {
    expect(getMaxSizeWarningState(expandDecimals(101, 30), maxSizeUsd)).toEqual({
      shouldShowMaxSize: true,
      isSizeAboveMax: true,
    });
  });
});
