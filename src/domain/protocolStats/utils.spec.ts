import { describe, expect, it } from "vitest";

import { parseProtocolStatsUsd } from "./utils";

describe("parseProtocolStatsUsd", () => {
  it("parses a 30-decimal USD string into a bigint", () => {
    expect(parseProtocolStatsUsd("1500000000000000000000000000000")).toBe(1_500_000_000_000_000_000_000_000_000_000n);
  });

  it("treats an unknown or pending value as absent", () => {
    expect(parseProtocolStatsUsd(null)).toBeUndefined();
    expect(parseProtocolStatsUsd(undefined)).toBeUndefined();
  });
});
