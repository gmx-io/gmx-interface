// @vitest-shared-worker
import { describe, expect, it } from "vitest";

import { limitNumberInputValue, sanitizeNumberInputValue } from "./NumberInput";

describe("sanitizeNumberInputValue", () => {
  it("accepts valid numbers", () => {
    expect(sanitizeNumberInputValue("")).toBe("");
    expect(sanitizeNumberInputValue("0")).toBe("0");
    expect(sanitizeNumberInputValue("5")).toBe("5");
    expect(sanitizeNumberInputValue("1234")).toBe("1234");
    expect(sanitizeNumberInputValue("10")).toBe("10");
    expect(sanitizeNumberInputValue("100")).toBe("100");
  });

  it("keeps decimals working", () => {
    expect(sanitizeNumberInputValue("0.")).toBe("0.");
    expect(sanitizeNumberInputValue("0.005")).toBe("0.005");
    expect(sanitizeNumberInputValue("1.5")).toBe("1.5");
    expect(sanitizeNumberInputValue("1.000")).toBe("1.000");
  });

  it("converts a comma to a dot", () => {
    expect(sanitizeNumberInputValue("1,5")).toBe("1.5");
    expect(sanitizeNumberInputValue("0,005")).toBe("0.005");
  });

  it("prepends a zero to a leading dot", () => {
    expect(sanitizeNumberInputValue(".")).toBe("0.");
    expect(sanitizeNumberInputValue(",")).toBe("0.");
    expect(sanitizeNumberInputValue(".5")).toBe("0.5");
  });

  it("rejects leading zeros", () => {
    expect(sanitizeNumberInputValue("00")).toBe(undefined);
    expect(sanitizeNumberInputValue("05")).toBe(undefined);
    expect(sanitizeNumberInputValue("0005")).toBe(undefined);
    expect(sanitizeNumberInputValue("01.5")).toBe(undefined);
    expect(sanitizeNumberInputValue("00.5")).toBe(undefined);
  });

  it("replaces leading zeros in whole-number fields PRO-4445", () => {
    expect(sanitizeNumberInputValue("02", true)).toBe("2");
    expect(sanitizeNumberInputValue("00", true)).toBe("0");
    expect(sanitizeNumberInputValue("0005", true)).toBe("5");
    expect(sanitizeNumberInputValue("0", true)).toBe("0");
    expect(sanitizeNumberInputValue("20", true)).toBe("20");
  });

  it("rejects non-numeric input", () => {
    expect(sanitizeNumberInputValue("abc")).toBe(undefined);
    expect(sanitizeNumberInputValue("1a")).toBe(undefined);
    expect(sanitizeNumberInputValue("1.2.3")).toBe(undefined);
    expect(sanitizeNumberInputValue("-1")).toBe(undefined);
    expect(sanitizeNumberInputValue(" 1")).toBe(undefined);
  });
});

describe("limitNumberInputValue", () => {
  it("keeps up to 15 digits before the point", () => {
    expect(limitNumberInputValue("999999999999999", "99999999999999")).toBe("999999999999999");
    expect(limitNumberInputValue("9999999999999999", "999999999999999")).toBe(undefined);
  });

  it("refuses a pasted amount that is too long instead of cutting it", () => {
    expect(limitNumberInputValue("1234567890123456789", "")).toBe(undefined);
    expect(limitNumberInputValue("1234567890123456789.5", "12")).toBe(undefined);
  });

  it("keeps a longer value set by Max editable while its whole part doesn't grow", () => {
    expect(limitNumberInputValue("1234567890123456789.1", "1234567890123456789")).toBe("1234567890123456789.1");
    expect(limitNumberInputValue("123456789012345678", "1234567890123456789")).toBe("123456789012345678");
    expect(limitNumberInputValue("12345678901234567890", "1234567890123456789")).toBe(undefined);
  });

  it("keeps up to 18 decimals, or the field's maxDecimals when lower", () => {
    expect(limitNumberInputValue("0." + "1".repeat(20), "")).toBe("0." + "1".repeat(18));
    expect(limitNumberInputValue("1.1234567", "1.123456", 6)).toBe("1.123456");
    expect(limitNumberInputValue("1." + "1".repeat(20), "1", 30)).toBe("1." + "1".repeat(18));
    expect(limitNumberInputValue("12.5", "12", 0)).toBe("12");
  });

  it("leaves short values and partial typing alone", () => {
    expect(limitNumberInputValue("", "5")).toBe("");
    expect(limitNumberInputValue("0.", "0")).toBe("0.");
    expect(limitNumberInputValue("1.5", "1.")).toBe("1.5");
  });
});
