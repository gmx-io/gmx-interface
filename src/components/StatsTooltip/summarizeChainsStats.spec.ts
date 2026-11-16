import { describe, expect, it } from "vitest";

import { getStaleEntries, summarizeChainsStats } from "./summarizeChainsStats";

describe("summarizeChainsStats", () => {
  it("sums every known network and orders them highest first", () => {
    expect(summarizeChainsStats({ Arbitrum: 5n, Avalanche: 9n, Solana: 1n })).toEqual({
      knownEntries: [
        ["Avalanche", 9n],
        ["Arbitrum", 5n],
        ["Solana", 1n],
      ],
      missingTitles: [],
      total: 15n,
    });
  });

  it("names a network that has not answered and leaves it out of the total", () => {
    const summary = summarizeChainsStats({ Arbitrum: undefined, Avalanche: 9n, Solana: 1n });

    expect(summary.total).toBe(10n);
    expect(summary.missingTitles).toEqual(["Arbitrum"]);
  });

  it("keeps a real zero as a known value", () => {
    const summary = summarizeChainsStats({ MegaETH: 0n, Solana: 1n });

    expect(summary.missingTitles).toEqual([]);
    expect(summary.knownEntries).toContainEqual(["MegaETH", 0n]);
  });

  it("reports no total until at least one network has answered", () => {
    expect(summarizeChainsStats({ Arbitrum: undefined, Solana: undefined }).total).toBeUndefined();
  });
});

describe("getStaleEntries", () => {
  it("lists every network a stale source covers with the time its value dates from", () => {
    expect(
      getStaleEntries([{ isStale: true, asOf: 42 }, "Arbitrum", "Avalanche"], [{ isStale: false, asOf: 7 }, "Solana"])
    ).toEqual([
      { title: "Arbitrum", asOf: 42 },
      { title: "Avalanche", asOf: 42 },
    ]);
  });

  it("lists nothing for a fresh or unknown source", () => {
    expect(getStaleEntries([{ isStale: false, asOf: 42 }, "Solana"], [undefined, "Arbitrum"])).toEqual([]);
  });
});
