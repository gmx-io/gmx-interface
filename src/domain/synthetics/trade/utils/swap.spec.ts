import { describe, expect, it } from "vitest";

import { getSwapPathComparator } from "./swap";
import { SwapRoute } from "../types";

describe("getSwapPathComparator", () => {
  it("should return a function that sorts by liquidity", () => {
    const comparator = getSwapPathComparator(["liquidity"]);
    const a = { liquidity: 1, path: [] } as unknown as SwapRoute;
    const b = { liquidity: 2, path: [] } as unknown as SwapRoute;
    expect(comparator(a, b)).toBe(1);
  });

  it("should return a function that sorts by path length", () => {
    const comparator = getSwapPathComparator(["length"]);
    const a = { liquidity: 1, path: [1] } as unknown as SwapRoute;
    const b = { liquidity: 1, path: [1, 2] } as unknown as SwapRoute;
    expect(comparator(a, b)).toBe(-1);
  });

  it("should return a function that sorts by liquidity and then path length", () => {
    const comparator = getSwapPathComparator(["liquidity", "length"]);
    const a = { liquidity: 1, path: [1] } as unknown as SwapRoute;
    const b = { liquidity: 1, path: [1, 2] } as unknown as SwapRoute;
    expect(comparator(a, b)).toBe(-1);
  });
});
