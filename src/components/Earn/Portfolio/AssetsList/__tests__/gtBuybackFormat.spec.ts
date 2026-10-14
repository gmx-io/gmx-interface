import { describe, expect, it } from "vitest";

import { formatGt, formatGtNumber, formatUsdc } from "../gtBuybackFormat";

const GT = 10n ** 7n;

describe("gtBuybackFormat", () => {
  it("drops trailing zeros from GT amounts", () => {
    expect(formatGt(12n * GT)).toMatch(/^12\s*GT$/);
    expect(formatGt(125n * 10n ** 6n)).toMatch(/^12\.5\s*GT$/);
    expect(formatGt(0n)).toMatch(/^0\s*GT$/);
  });

  it("formats bare GT numbers without trailing zeros", () => {
    expect(formatGtNumber(25n * GT)).toBe("25");
    expect(formatGtNumber(1_234_567n * GT)).toBe("1,234,567");
    expect(formatGtNumber(125n * 10n ** 6n)).toBe("12.5");
  });

  it("formats USDC with two decimals", () => {
    expect(formatUsdc(148_250_000n)).toBe("148.25 USDC");
    expect(formatUsdc(0n)).toBe("0.00 USDC");
  });
});
