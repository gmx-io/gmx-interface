import { describe, expect, it } from "vitest";

import { aggregateTraderVolumes } from "./whaleVolume";

describe("aggregateTraderVolumes", () => {
  it("sums absolute sizeDeltaUsd per account and the grand total", () => {
    const { volumes, total } = aggregateTraderVolumes([
      { account: "0xA", sizeDeltaUsd: "1000" },
      { account: "0xB", sizeDeltaUsd: "-400" },
      { account: "0xA", sizeDeltaUsd: "-250" }, // same account, opposite side
    ]);
    expect(volumes.get("0xA")).toBe(1250n);
    expect(volumes.get("0xB")).toBe(400n);
    expect(total).toBe(1650n);
  });

  it("returns an empty map and zero total for no rows", () => {
    const { volumes, total } = aggregateTraderVolumes([]);
    expect(volumes.size).toBe(0);
    expect(total).toBe(0n);
  });
});
