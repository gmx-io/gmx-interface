import { describe, expect, it } from "vitest";

import { sumPositionChangeVolume } from "./whaleVolume";

describe("sumPositionChangeVolume", () => {
  it("sums absolute sizeDeltaUsd across increases and decreases", () => {
    const rows = [{ sizeDeltaUsd: "1000" }, { sizeDeltaUsd: "-400" }, { sizeDeltaUsd: "250" }];
    expect(sumPositionChangeVolume(rows)).toBe(1650n);
  });

  it("returns 0n for no rows", () => {
    expect(sumPositionChangeVolume([])).toBe(0n);
  });
});
