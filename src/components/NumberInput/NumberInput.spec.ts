import { describe, expect, it } from "vitest";

import { sanitizeNumberInputValue } from "./NumberInput";

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

  it("rejects non-numeric input", () => {
    expect(sanitizeNumberInputValue("abc")).toBe(undefined);
    expect(sanitizeNumberInputValue("1a")).toBe(undefined);
    expect(sanitizeNumberInputValue("1.2.3")).toBe(undefined);
    expect(sanitizeNumberInputValue("-1")).toBe(undefined);
    expect(sanitizeNumberInputValue(" 1")).toBe(undefined);
  });
});
