import { fillBarGaps } from "../requests";
import type { Bar, FromOldToNewArray } from "../types";
import { vi, describe, expect, it, beforeAll, afterEach } from "vitest";

describe("fillBarGaps", () => {
  let originalDateNow: () => number;
  beforeAll(() => {
    originalDateNow = Date.now;
  });

  afterEach(() => {
    Date.now = originalDateNow;
  });

  it("works with empty prices", () => {
    const input = [];

    const result = fillBarGaps(input, 60);

    expect(result).toEqual([]);
  });

  it("works with single price", () => {
    const input = [
      {
        time: 1000,
        open: 1,
        close: 1,
        high: 1,
        low: 1,
      },
    ];

    const result = fillBarGaps(input, 60);

    expect(result).toEqual([
      {
        time: 1000,
        open: 1,
        close: 1,
        high: 1,
        low: 1,
      },
    ]);
  });

  it("works with two prices", () => {
    const firstPointSec = 1711000000;
    const secondPointSec = 1711000020;
    Date.now = vi.fn(() => secondPointSec * 1000);

    const input: FromOldToNewArray<Bar> = [
      {
        time: firstPointSec,
        open: 0,
        close: 1,
        high: 2,
        low: -1,
      },
      {
        time: secondPointSec,
        open: 1,
        close: 0,
        high: 2,
        low: -1,
      },
    ];

    const result = fillBarGaps(input, 10);

    expect(result).toEqual([
      { time: firstPointSec, open: 0, close: 1, high: 2, low: -1 },
      { time: firstPointSec + 10, open: 1, close: 1, high: 1.0003, low: 0.9996 },
      { time: secondPointSec, open: 1, close: 0, high: 2, low: -1 },
    ]);
  });
});
