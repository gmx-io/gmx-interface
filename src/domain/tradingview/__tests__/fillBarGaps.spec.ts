import { TIMEZONE_OFFSET_SEC } from "domain/prices";
import { fillBarGaps } from "../requests";
import type { Bar, FromOldToNewArray } from "../types";

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
    const firstPointSec = 1711000000 + TIMEZONE_OFFSET_SEC;
    const secondPointSec = 1711000020 + TIMEZONE_OFFSET_SEC;
    Date.now = jest.fn(() => (secondPointSec - TIMEZONE_OFFSET_SEC) * 1000);

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
      { time: 1711014400, open: 0, close: 1, high: 2, low: -1 },
      { time: 1711014410, open: 1, close: 1, high: 1.0003, low: 0.9996 },
      { time: 1711014420, open: 1, close: 0, high: 2, low: -1 },
    ]);
  });
});
