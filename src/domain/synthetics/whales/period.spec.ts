import { describe, expect, it } from "vitest";

import { WHALE_WINDOWS, windowToFromTimestamp } from "./period";

describe("windowToFromTimestamp", () => {
  const now = 1_700_000_000;

  it("returns undefined for total (no time bound)", () => {
    expect(windowToFromTimestamp("total", now)).toBeUndefined();
  });

  it("returns a midnight-aligned start ~7 days back for 7d", () => {
    const from = windowToFromTimestamp("7d", now)!;
    expect(from % 86400).toBe(0); // periodAccountStats requires day-aligned `from`
    expect(from).toBe(now - 7 * 86400 - ((now - 7 * 86400) % 86400));
  });

  it("returns a midnight-aligned start ~30 days back for 30d", () => {
    const from = windowToFromTimestamp("30d", now)!;
    expect(from % 86400).toBe(0);
    expect(from).toBe(now - 30 * 86400 - ((now - 30 * 86400) % 86400));
  });

  it("returns a midnight-aligned start ~90 days back for 90d", () => {
    const from = windowToFromTimestamp("90d", now)!;
    expect(from % 86400).toBe(0);
    expect(from).toBe(now - 90 * 86400 - ((now - 90 * 86400) % 86400));
  });

  it("exposes the windows in order", () => {
    expect(WHALE_WINDOWS).toEqual(["total", "90d", "30d", "7d"]);
  });
});
