import { describe, expect, it } from "vitest";

import { computeShareBps, computeTop3ConcentrationBps, rankByVolumeDesc } from "./shares";

describe("computeShareBps", () => {
  it("returns basis points (10000 = 100%)", () => {
    expect(computeShareBps(847n, 1000n)).toBe(8470n);
  });
  it("returns 0n when total is zero", () => {
    expect(computeShareBps(5n, 0n)).toBe(0n);
  });
});

describe("rankByVolumeDesc", () => {
  it("sorts by volume descending without mutating input", () => {
    const input = [{ volume: 1n }, { volume: 9n }, { volume: 4n }];
    const out = rankByVolumeDesc(input);
    expect(out.map((r) => r.volume)).toEqual([9n, 4n, 1n]);
    expect(input.map((r) => r.volume)).toEqual([1n, 9n, 4n]);
  });
});

describe("computeTop3ConcentrationBps", () => {
  it("sums the three largest volumes over the total", () => {
    const rows = [{ volume: 50n }, { volume: 30n }, { volume: 10n }, { volume: 10n }];
    // top3 = 90 of 100 = 9000 bps
    expect(computeTop3ConcentrationBps(rows, 100n)).toBe(9000n);
  });
});
