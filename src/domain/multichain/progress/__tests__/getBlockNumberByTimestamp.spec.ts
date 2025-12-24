import { describe, expect, it } from "vitest";

import { ARBITRUM_SEPOLIA } from "sdk/configs/chains";

import { getBlockNumberBeforeTimestamp } from "../getBlockNumberByTimestamp";

describe("getBlockNumberByTimestamp", () => {
  it("should return the block number for a given timestamp", { timeout: 30_000 }, async () => {
    const timestamp = 1730624700n;

    const result = await getBlockNumberBeforeTimestamp(ARBITRUM_SEPOLIA, timestamp);

    expect(result).toBeGreaterThan(0n);
    expect(result).toBeLessThanOrEqual(211319488n);
    expect(typeof result).toBe("bigint");
  });
});
