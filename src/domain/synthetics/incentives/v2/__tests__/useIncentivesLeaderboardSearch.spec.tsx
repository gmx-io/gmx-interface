import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { SWRConfig } from "swr";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "config/chains";

vi.mock("../client", () => ({
  fetchIncentivesGraphql: vi.fn(),
  getIncentivesIndexerUrl: vi.fn(),
}));

import { fetchIncentivesGraphql, getIncentivesIndexerUrl } from "../client";
import type { RawLeaderboardEntry } from "../parsers";
import { INCENTIVES_LEADERBOARD_QUERY } from "../queries";
import type { IncentivesLeaderboardOrderBy } from "../useIncentivesLeaderboard";
import { LEADERBOARD_SEARCH_SCAN_LIMIT, useIncentivesLeaderboardSearch } from "../useIncentivesLeaderboardSearch";

const ENDPOINT = "https://example.com/incentives/graphql";
const SCAN_PAGE_SIZE = 1000;
const swrConfig = { provider: () => new Map(), dedupingInterval: 0, errorRetryCount: 0 };

const mockFetchIncentivesGraphql = vi.mocked(fetchIncentivesGraphql);
const mockGetIncentivesIndexerUrl = vi.mocked(getIncentivesIndexerUrl);

function makeRawEntry(index: number, address: string, tradingVolume = String(1_000 - index)): RawLeaderboardEntry {
  return {
    rank: index + 1,
    address,
    tradingVolume,
    referralVolume: "0",
    esGmxRewards: "0",
    gtRewards: "0",
    rewardsUsd: String(10_000 - index),
    multiplier: null,
  };
}

function makeAddress(index: number) {
  return `0x${index.toString(16).padStart(40, "0")}`;
}

function makeMatchingAddress(index: number) {
  return `0xAbCdEf${index.toString(16).padStart(34, "0")}`;
}

function mockLeaderboard(entries: RawLeaderboardEntry[], totalCount = entries.length) {
  mockFetchIncentivesGraphql.mockImplementation(async (_endpoint, _query, variables) => {
    const offset = (variables as { offset: number }).offset;
    const limit = (variables as { limit: number }).limit;

    return {
      incentivesLeaderboard: { totalCount, items: entries.slice(offset, offset + limit) },
    } as never;
  });
}

function renderSearch(
  params: { term: string; orderBy?: IncentivesLeaderboardOrderBy; limit?: number; offset?: number; enabled?: boolean },
  onRender?: (result: ReturnType<typeof useIncentivesLeaderboardSearch>) => void
) {
  function TestComponent() {
    const result = useIncentivesLeaderboardSearch(ARBITRUM, {
      term: params.term,
      orderBy: params.orderBy ?? "rewardsUsd_DESC",
      limit: params.limit ?? 20,
      offset: params.offset ?? 0,
      enabled: params.enabled,
    });

    onRender?.(result);

    return (
      <div>
        {result.data === undefined
          ? "loading"
          : `${result.totalCount}:${result.isTruncated}:${result.data.map((entry) => entry.address).join(",")}`}
      </div>
    );
  }

  return render(
    <SWRConfig value={swrConfig}>
      <TestComponent />
    </SWRConfig>
  );
}

describe("useIncentivesLeaderboardSearch", () => {
  beforeEach(() => {
    mockFetchIncentivesGraphql.mockReset();
    mockGetIncentivesIndexerUrl.mockReset();
    mockGetIncentivesIndexerUrl.mockReturnValue(ENDPOINT);
  });

  it("matches a partial address case-insensitively across scanned pages", async () => {
    const entries = [
      makeRawEntry(0, "0xAB1200000000000000000000000000000000FFFF"),
      makeRawEntry(1, "0x0000000000000000000000000000000000000001"),
      makeRawEntry(2, "0x00000000000000000000000000000000000ab120"),
    ];
    mockLeaderboard(entries);

    renderSearch({ term: "Ab12" });

    expect(
      await screen.findByText(
        "2:false:0xAB1200000000000000000000000000000000FFFF,0x00000000000000000000000000000000000ab120"
      )
    ).toBeTruthy();
    expect(mockFetchIncentivesGraphql).toHaveBeenCalledTimes(1);
    expect(mockFetchIncentivesGraphql).toHaveBeenCalledWith(ENDPOINT, INCENTIVES_LEADERBOARD_QUERY, {
      limit: SCAN_PAGE_SIZE,
      offset: 0,
      orderBy: "rewardsUsd_DESC",
    });
  });

  it("scans every page of a long leaderboard and paginates the matches", async () => {
    const entries = Array.from({ length: 2_500 }, (_, index) =>
      makeRawEntry(index, index === 5 || index === 1_500 ? makeMatchingAddress(index) : makeAddress(index))
    );
    mockLeaderboard(entries);

    renderSearch({ term: "abcdef", limit: 1, offset: 1 });

    expect(await screen.findByText(`2:false:${makeMatchingAddress(1_500)}`)).toBeTruthy();
    await waitFor(() => expect(mockFetchIncentivesGraphql).toHaveBeenCalledTimes(3));
    expect(mockFetchIncentivesGraphql).toHaveBeenCalledWith(ENDPOINT, INCENTIVES_LEADERBOARD_QUERY, {
      limit: SCAN_PAGE_SIZE,
      offset: 2 * SCAN_PAGE_SIZE,
      orderBy: "rewardsUsd_DESC",
    });
  });

  it("sorts matches by the requested field and direction", async () => {
    const entries = [
      makeRawEntry(0, "0xAA00000000000000000000000000000000000001", "300"),
      makeRawEntry(1, "0xAA00000000000000000000000000000000000002", "100"),
      makeRawEntry(2, "0xAA00000000000000000000000000000000000003", "200"),
    ];
    mockLeaderboard(entries);

    renderSearch({ term: "0xaa", orderBy: "tradingVolume_ASC" });

    expect(
      await screen.findByText(
        "3:false:0xAA00000000000000000000000000000000000002,0xAA00000000000000000000000000000000000003,0xAA00000000000000000000000000000000000001"
      )
    ).toBeTruthy();
  });

  it("reports truncation once the leaderboard outgrows the scan limit", async () => {
    const entries = Array.from({ length: LEADERBOARD_SEARCH_SCAN_LIMIT }, (_, index) =>
      makeRawEntry(index, index === 3 ? makeMatchingAddress(index) : makeAddress(index))
    );
    mockLeaderboard(entries, LEADERBOARD_SEARCH_SCAN_LIMIT + 1);

    renderSearch({ term: "abcdef" });

    expect(await screen.findByText(`1:true:${makeMatchingAddress(3)}`)).toBeTruthy();
    expect(mockFetchIncentivesGraphql).toHaveBeenCalledTimes(LEADERBOARD_SEARCH_SCAN_LIMIT / SCAN_PAGE_SIZE);
  });

  it("does not scan the leaderboard when disabled or without an endpoint", async () => {
    mockLeaderboard([makeRawEntry(0, makeAddress(1))]);

    const { unmount } = renderSearch({ term: "0x0", enabled: false });
    await waitFor(() => expect(mockFetchIncentivesGraphql).not.toHaveBeenCalled());
    unmount();

    mockGetIncentivesIndexerUrl.mockReturnValue(undefined);
    renderSearch({ term: "0x0" });
    await waitFor(() => expect(mockFetchIncentivesGraphql).not.toHaveBeenCalled());
  });
});
