import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchIncentivesGraphql } from "../client";
import { getIncentivesEpochStats } from "../getIncentivesEpochStats";

vi.mock("../client", () => ({ fetchIncentivesGraphql: vi.fn() }));
const fetcher = vi.mocked(fetchIncentivesGraphql);
const endpoint = "https://example.com/graphql";
const epoch = 1788307200;

beforeEach(() => fetcher.mockReset());

describe("completed epoch totals", () => {
  it("includes every page, preserves USD precision, and counts each recipient once", async () => {
    const amount = 123456789012345678901234567890n;
    const firstPage = Array.from({ length: 1000 }, (_, index) => ({
      id: String(index).padStart(4, "0"),
      account: `0x${index.toString(16).padStart(40, "0")}`,
      rewardsUsd: String(amount),
    }));
    fetcher.mockResolvedValueOnce({ incentiveRewards: firstPage });
    fetcher.mockResolvedValueOnce({
      incentiveRewards: [{ id: "1000", account: firstPage[0].account, rewardsUsd: "7" }],
    });
    expect(await getIncentivesEpochStats(endpoint, epoch)).toEqual({
      rewardsUsd: amount * 1000n + 7n,
      traderCount: 1000,
    });
    expect(fetcher.mock.calls.map((call) => call[2])).toEqual([
      { epoch, after: "", limit: 1000 },
      { epoch, after: "0999", limit: 1000 },
    ]);
  });
});
