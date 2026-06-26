import { describe, expect, it } from "vitest";

import { WHALE_WINDOWS, windowToFromTimestamp } from "./period";

describe("windowToFromTimestamp", () => {
  const now = 1_700_000_000;

  it("returns undefined for total (no time bound)", () => {
    expect(windowToFromTimestamp("total", now)).toBeUndefined();
  });

  it("returns now - 7 days for 7d", () => {
    expect(windowToFromTimestamp("7d", now)).toBe(now - 7 * 86400);
  });

  it("returns now - 30 days for 30d", () => {
    expect(windowToFromTimestamp("30d", now)).toBe(now - 30 * 86400);
  });

  it("exposes the three windows in order", () => {
    expect(WHALE_WINDOWS).toEqual(["total", "30d", "7d"]);
  });
});
