import { describe, expect, it } from "vitest";

import { buildPieSlices } from "./pieSlices";

describe("buildPieSlices", () => {
  it("keeps items >= threshold and merges the rest (and the unlisted remainder) into Others", () => {
    // A = 60% (kept); B = 3% (< 5%); plus 37% of `total` belongs to unlisted holders
    expect(
      buildPieSlices(
        [
          { name: "A", value: 60n },
          { name: "B", value: 3n },
        ],
        100n,
        500n
      )
    ).toEqual([
      { name: "A", value: 60 },
      { name: "Others", value: 40 },
    ]);
  });

  it("adds no Others slice when kept items cover the whole total", () => {
    expect(
      buildPieSlices(
        [
          { name: "A", value: 60n },
          { name: "B", value: 40n },
        ],
        100n,
        500n
      )
    ).toEqual([
      { name: "A", value: 60 },
      { name: "B", value: 40 },
    ]);
  });

  it("returns an empty array when total is zero", () => {
    expect(buildPieSlices([{ name: "A", value: 5n }], 0n)).toEqual([]);
  });
});
