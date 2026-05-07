import { describe, expect, it } from "vitest";

import { formatMultiplier } from "../constants";

describe("formatMultiplier", () => {
  it("formats positive multipliers with 2 decimals", () => {
    expect(formatMultiplier(325)).toBe("3.25x");
    expect(formatMultiplier(200)).toBe("2.00x");
    expect(formatMultiplier(25)).toBe("0.25x");
    expect(formatMultiplier(100)).toBe("1.00x");
    expect(formatMultiplier(550)).toBe("5.50x");
  });

  it("renders 0.00x for zero and undefined", () => {
    expect(formatMultiplier(0)).toBe("0.00x");
    expect(formatMultiplier(undefined)).toBe("0.00x");
  });
});
