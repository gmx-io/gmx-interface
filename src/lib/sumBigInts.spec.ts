import { describe, expect, it } from "vitest";

import { sumBigInts, sumKnownBigInts } from "./sumBigInts";

describe("sumBigInts", () => {
  it("counts a missing part as zero", () => {
    expect(sumBigInts(2n, undefined, 3n)).toBe(5n);
  });
});

describe("sumKnownBigInts", () => {
  it("sums the parts when every one is known", () => {
    expect(sumKnownBigInts(2n, 3, 4n)).toBe(9n);
  });

  it("keeps a real zero", () => {
    expect(sumKnownBigInts(0n, 0n)).toBe(0n);
  });

  it("returns undefined when one part is missing", () => {
    expect(sumKnownBigInts(2n, undefined)).toBeUndefined();
  });

  it("returns undefined when every part is missing", () => {
    expect(sumKnownBigInts(undefined, undefined)).toBeUndefined();
  });
});
