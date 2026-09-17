import { describe, expect, it } from "vitest";

import { USD_DECIMALS } from "config/factors";
import { expandDecimals } from "lib/numbers";
import { ARBITRUM, AVALANCHE } from "sdk/configs/chains";

import { getShouldShowPaxosTransit } from "../paxosTransit";

const usd = (value: number) => expandDecimals(value, USD_DECIMALS);

const LARGE = {
  chainId: ARBITRUM,
  amountUsd: usd(300_000),
  isWhitelisted: false,
  transitFeesUsd: usd(10),
  swapFeesUsd: usd(50),
} as const;

describe("getShouldShowPaxosTransit", () => {
  it("shows Transit for a large conversion where it is cheaper", () => {
    expect(getShouldShowPaxosTransit(LARGE)).toBe(true);
  });

  it("hides Transit below the size threshold", () => {
    expect(getShouldShowPaxosTransit({ ...LARGE, amountUsd: usd(2) })).toBe(false);
  });

  it("hides Transit when the swap is cheaper", () => {
    expect(getShouldShowPaxosTransit({ ...LARGE, swapFeesUsd: usd(5) })).toBe(false);
  });

  it("hides Transit without a Transit quote", () => {
    expect(getShouldShowPaxosTransit({ ...LARGE, transitFeesUsd: undefined })).toBe(false);
  });

  it("shows Transit when our pools can't fill the swap, at any size", () => {
    expect(getShouldShowPaxosTransit({ ...LARGE, swapFeesUsd: undefined })).toBe(true);
    expect(getShouldShowPaxosTransit({ ...LARGE, amountUsd: usd(1), swapFeesUsd: undefined })).toBe(true);
  });

  it("always shows Transit to whitelisted addresses", () => {
    expect(
      getShouldShowPaxosTransit({ ...LARGE, amountUsd: usd(1), transitFeesUsd: undefined, isWhitelisted: true })
    ).toBe(true);
  });

  it("hides Transit on chains without it", () => {
    expect(getShouldShowPaxosTransit({ ...LARGE, chainId: AVALANCHE, isWhitelisted: true })).toBe(false);
  });
});
