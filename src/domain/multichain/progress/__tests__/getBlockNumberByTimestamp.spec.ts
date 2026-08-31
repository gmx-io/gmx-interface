import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { IS_RECORDING } from "domain/testUtils/rpc/recordedResponder";
import { ARBITRUM_SEPOLIA } from "sdk/configs/chains";

import { getBlockNumberBeforeTimestamp } from "../getBlockNumberByTimestamp";
import { finishRecordedRpc, installRecordedRpc } from "./recordedRpc";

beforeAll(() => {
  installRecordedRpc();
});

afterAll(() => {
  finishRecordedRpc();
});

describe("getBlockNumberByTimestamp", () => {
  it("should return the block number for a given timestamp", { timeout: IS_RECORDING ? 30_000 : 10_000 }, async () => {
    const timestamp = 1730624700n;

    const result = await getBlockNumberBeforeTimestamp(ARBITRUM_SEPOLIA, timestamp);

    expect(result).toBeGreaterThan(0n);
    expect(result).toBeLessThanOrEqual(211319488n);
    expect(typeof result).toBe("bigint");
  });
});
