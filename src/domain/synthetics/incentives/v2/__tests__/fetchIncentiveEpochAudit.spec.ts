import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../client", () => ({ fetchIncentivesGraphql: vi.fn() }));

import { fetchIncentivesGraphql } from "../client";
import { fetchIncentiveEpochAudit } from "../fetchIncentiveEpochAudit";
import type { RawIncentiveAccountEpochAuditEntry } from "../parsers";
import { INCENTIVE_ACCOUNT_EPOCH_AUDIT_QUERY, INCENTIVE_ACCOUNT_EPOCH_AUDIT_WITH_STAKING_QUERY } from "../queries";

const EPOCH = 1_788_307_200;
const ENDPOINT = "https://example.com/graphql";
const mockFetch = vi.mocked(fetchIncentivesGraphql);

function makeEntry(index: number): RawIncentiveAccountEpochAuditEntry {
  const account = `0x${index.toString(16).padStart(40, "0")}`;
  return {
    id: `${account}:${EPOCH}`,
    account,
    epochTimestamp: EPOCH,
    avgStakedGmx: "1000000000000000001",
    fees: "90071992547409930000000000000001",
    tradingVolume: "1000",
    tierVolume: "500",
    referralVolume: "0",
    esGmxRewards: "1000000000000000001",
    referralEsGmxRewards: "1",
    gtRewards: "10000001",
    referralGtRewards: "1",
    rewardsUsd: "1",
    manualRewardsUsd: "0",
    avgMultiplier: 175,
    maxMultiplier: 200,
    volumeTier: "Tier1",
    stakingTier: null,
    boostIds: [],
    effectiveRewardsRatio: 0,
  };
}

describe("fetchIncentiveEpochAudit", () => {
  beforeEach(() => mockFetch.mockReset());

  it("loads every page and sums the entire epoch with bigint precision", async () => {
    const items = Array.from({ length: 1001 }, (_, index) => makeEntry(index));
    mockFetch
      .mockResolvedValueOnce({ incentiveAccountEpochAudit: { totalCount: 1001, items: items.slice(0, 1000) } })
      .mockResolvedValueOnce({ incentiveAccountEpochAudit: { totalCount: 1001, items: items.slice(1000) } });

    const result = await fetchIncentiveEpochAudit(ENDPOINT, EPOCH);

    expect(result.entries).toHaveLength(1001);
    expect(result.totalFees).toBe(90071992547409930000000000000001n * 1001n);
    expect(result.entries[1000].esGmxRewards).toBe(1000000000000000001n);
    expect(result.entries[1000].avgStakedGmx).toBe(1000000000000000001n);
    expect(mockFetch.mock.calls[0][1]).toBe(INCENTIVE_ACCOUNT_EPOCH_AUDIT_WITH_STAKING_QUERY);
    expect(INCENTIVE_ACCOUNT_EPOCH_AUDIT_WITH_STAKING_QUERY).toContain("avgStakedGmx");
    expect(mockFetch.mock.calls.map((call) => call[2])).toEqual([
      { where: { epochTimestamp: EPOCH }, orderBy: "epochTimestamp_ASC", limit: 1000, offset: 0 },
      { where: { epochTimestamp: EPOCH }, orderBy: "epochTimestamp_ASC", limit: 1000, offset: 1000 },
    ]);
  });

  it("keeps older development schemas usable and leaves unavailable staking blank", async () => {
    const items = [makeEntry(1), makeEntry(2)];
    items.forEach((item) => delete item.avgStakedGmx);
    mockFetch
      .mockRejectedValueOnce(new Error("Error fetching GraphQL query: Error: HTTP error: 400"))
      .mockResolvedValueOnce({ incentiveAccountEpochAudit: { totalCount: 2, items: items.slice(0, 1) } })
      .mockResolvedValueOnce({ incentiveAccountEpochAudit: { totalCount: 2, items: items.slice(1) } });

    const result = await fetchIncentiveEpochAudit(ENDPOINT, EPOCH);

    expect(result.entries.map((entry) => entry.avgStakedGmx)).toEqual([null, null]);
    expect(mockFetch.mock.calls.map((call) => call[1])).toEqual([
      INCENTIVE_ACCOUNT_EPOCH_AUDIT_WITH_STAKING_QUERY,
      INCENTIVE_ACCOUNT_EPOCH_AUDIT_QUERY,
      INCENTIVE_ACCOUNT_EPOCH_AUDIT_QUERY,
    ]);
    expect(INCENTIVE_ACCOUNT_EPOCH_AUDIT_QUERY).not.toContain("avgStakedGmx");
  });

  it("propagates failures unrelated to schema compatibility", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));
    await expect(fetchIncentiveEpochAudit(ENDPOINT, EPOCH)).rejects.toThrow("Network error");
    expect(mockFetch).toHaveBeenCalledTimes(1);

    mockFetch
      .mockRejectedValueOnce(new Error("HTTP error: 400"))
      .mockRejectedValueOnce(new Error("Invalid query variables"));
    await expect(fetchIncentiveEpochAudit(ENDPOINT, EPOCH)).rejects.toThrow("Invalid query variables");
  });

  it("preserves checksum casing and returns an empty epoch without a follow-up request", async () => {
    const account = "0x52908400098527886E0F7030069857D2E4169EE7";
    mockFetch.mockResolvedValueOnce({
      incentiveAccountEpochAudit: { totalCount: 1, items: [{ ...makeEntry(1), account }] },
    });
    expect((await fetchIncentiveEpochAudit(ENDPOINT, EPOCH)).entries[0].account).toBe(account);

    mockFetch.mockResolvedValueOnce({ incentiveAccountEpochAudit: { totalCount: 0, items: [] } });
    expect(await fetchIncentiveEpochAudit(ENDPOINT, EPOCH)).toEqual({ entries: [], totalFees: 0n });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it.each([
    { totalCount: 2, items: [] },
    { totalCount: 3, items: [makeEntry(2)] },
    { totalCount: 2, items: [makeEntry(1)] },
    { totalCount: 2, items: [{ ...makeEntry(2), epochTimestamp: EPOCH + 1 }] },
  ])("rejects incomplete, changing, duplicate, or mismatched pages: %j", async (secondPage) => {
    mockFetch
      .mockResolvedValueOnce({ incentiveAccountEpochAudit: { totalCount: 2, items: [makeEntry(1)] } })
      .mockResolvedValueOnce({ incentiveAccountEpochAudit: secondPage });

    await expect(fetchIncentiveEpochAudit(ENDPOINT, EPOCH)).rejects.toThrow(/epoch/i);
  });

  it("does not return a partial distribution when a later page fails", async () => {
    mockFetch
      .mockResolvedValueOnce({ incentiveAccountEpochAudit: { totalCount: 2, items: [makeEntry(1)] } })
      .mockRejectedValueOnce(new Error("Network error"));

    await expect(fetchIncentiveEpochAudit(ENDPOINT, EPOCH)).rejects.toThrow("Network error");
  });
});
