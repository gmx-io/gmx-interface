import { describe, expect, it } from "vitest";

import { aggregateHoldersBySize } from "./marketConcentration";

describe("aggregateHoldersBySize", () => {
  it("sums sizeInUsd per account and sorts descending, preserving address casing", () => {
    const out = aggregateHoldersBySize([
      { account: "0xAbc", sizeInUsd: "100" },
      { account: "0xDef", sizeInUsd: "500" },
      { account: "0xAbc", sizeInUsd: "250" }, // same account (long + short) → 350
    ]);
    expect(out).toEqual([
      { account: "0xDef", size: 500n },
      { account: "0xAbc", size: 350n },
    ]);
  });

  it("returns an empty array for no rows", () => {
    expect(aggregateHoldersBySize([])).toEqual([]);
  });
});
