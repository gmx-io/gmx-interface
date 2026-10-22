import { describe, expect, it } from "vitest";

import { CustomError, extendError } from "lib/errors";
import { getIsSwapPriceImpactTooLargeError } from "lib/errors/customErrors";

function getSimulationError(name: string) {
  return extendError(new CustomError({ name, message: "{}", args: {} }), { errorContext: "simulation" });
}

describe("getIsSwapPriceImpactTooLargeError", () => {
  it("matches a swap whose price impact exceeds the amount in", () => {
    expect(getIsSwapPriceImpactTooLargeError(getSimulationError("SwapPriceImpactExceedsAmountIn"))).toBe(true);
  });

  it("ignores the price impact of the position itself, which no swap route can change", () => {
    expect(getIsSwapPriceImpactTooLargeError(getSimulationError("PriceImpactLargerThanOrderSize"))).toBe(false);
  });
});
