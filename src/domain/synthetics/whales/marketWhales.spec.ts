import { describe, expect, it } from "vitest";

import { dedupeTopCandidates } from "./marketWhales";

describe("dedupeTopCandidates", () => {
  it("keeps the largest peakSize per account and caps to limit", () => {
    const rows = [
      { account: "0xA", maxSize: "100" },
      { account: "0xA", maxSize: "300" }, // long + short for same account
      { account: "0xB", maxSize: "200" },
      { account: "0xC", maxSize: "50" },
    ];
    expect(dedupeTopCandidates(rows, 2)).toEqual([
      { account: "0xA", peakSize: 300n },
      { account: "0xB", peakSize: 200n },
    ]);
  });
});
