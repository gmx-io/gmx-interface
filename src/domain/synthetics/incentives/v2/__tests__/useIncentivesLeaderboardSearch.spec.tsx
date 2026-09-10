import { act, render, waitFor } from "@testing-library/react";
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
import { useIncentivesLeaderboardSearch } from "../useIncentivesLeaderboardSearch";

const ENDPOINT = "https://example.com/incentives/graphql";
const swrConfig = { provider: () => new Map(), dedupingInterval: 0, errorRetryCount: 0 };
const mockFetchIncentivesGraphql = vi.mocked(fetchIncentivesGraphql);
const mockGetIncentivesIndexerUrl = vi.mocked(getIncentivesIndexerUrl);

type SearchParams = Parameters<typeof useIncentivesLeaderboardSearch>[1];

function makeRawEntry(rank: number, address: string): RawLeaderboardEntry {
  return {
    rank,
    address,
    tradingVolume: "1000",
    referralVolume: "0",
    esGmxRewards: "0",
    gtRewards: "0",
    rewardsUsd: "100",
    multiplier: null,
  };
}

function renderSearch(params: Partial<SearchParams> & Pick<SearchParams, "term">) {
  let current: ReturnType<typeof useIncentivesLeaderboardSearch>;
  function TestComponent({ params }: { params: SearchParams }) {
    current = useIncentivesLeaderboardSearch(ARBITRUM, params);
    return null;
  }
  const getView = (params: SearchParams) => (
    <SWRConfig value={swrConfig}>
      <TestComponent params={params} />
    </SWRConfig>
  );
  const view = render(getView({ orderBy: "rewardsUsd_DESC", limit: 20, offset: 0, ...params }));
  return {
    result: {
      get current() {
        return current;
      },
    },
    rerender: (params: SearchParams) => view.rerender(getView(params)),
  };
}

describe("useIncentivesLeaderboardSearch", () => {
  beforeEach(() => {
    mockFetchIncentivesGraphql.mockReset();
    mockGetIncentivesIndexerUrl.mockReset();
    mockGetIncentivesIndexerUrl.mockReturnValue(ENDPOINT);
  });

  it("requests one filtered page and preserves global rank and address casing", async () => {
    const entry = makeRawEntry(10_501, "0xAB1200000000000000000000000000000000FFFF");
    mockFetchIncentivesGraphql.mockResolvedValue({
      incentivesLeaderboard: { totalCount: 12_500, items: [entry] },
    });

    const { result } = renderSearch({ term: " Ab12 " });

    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(result.current.data?.[0]).toMatchObject({ rank: 10_501, address: entry.address });
    expect(result.current.totalCount).toBe(12_500);
    expect(result.current.hasNextPage).toBe(true);
    expect(mockFetchIncentivesGraphql).toHaveBeenCalledExactlyOnceWith(ENDPOINT, INCENTIVES_LEADERBOARD_QUERY, {
      where: { account_contains: "Ab12" },
      limit: 20,
      offset: 0,
      orderBy: "rewardsUsd_DESC",
    });
  });

  it("delegates sorting and pagination to the indexer within the selected epoch", async () => {
    const entries = [
      makeRawEntry(50, "0xAA00000000000000000000000000000000000001"),
      makeRawEntry(2, "0xAA00000000000000000000000000000000000002"),
    ];
    mockFetchIncentivesGraphql.mockResolvedValue({
      incentivesLeaderboard: { totalCount: 22, items: entries },
    });

    const { result } = renderSearch({ term: "0xAA", epoch: 1_784_073_600, orderBy: "tradingVolume_ASC", offset: 20 });

    await waitFor(() => expect(result.current.data).toHaveLength(2));
    expect(result.current.data?.map((entry) => entry.rank)).toEqual([50, 2]);
    expect(result.current.totalCount).toBe(22);
    expect(result.current.hasNextPage).toBe(false);
    expect(mockFetchIncentivesGraphql).toHaveBeenCalledExactlyOnceWith(ENDPOINT, INCENTIVES_LEADERBOARD_QUERY, {
      epoch: 1_784_073_600,
      where: { account_contains: "0xAA" },
      limit: 20,
      offset: 20,
      orderBy: "tradingVolume_ASC",
    });
  });

  it("isolates cached results by search term while the next request is pending", async () => {
    const firstEntry = makeRawEntry(1, "0xAB12000000000000000000000000000000000000");
    const secondEntry = makeRawEntry(90, "0xCD34000000000000000000000000000000000000");
    const secondResponse = { incentivesLeaderboard: { totalCount: 1, items: [secondEntry] } };
    let resolveSecond: ((value: typeof secondResponse) => void) | undefined;
    mockFetchIncentivesGraphql
      .mockResolvedValueOnce({ incentivesLeaderboard: { totalCount: 1, items: [firstEntry] } })
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveSecond = resolve;
        })
      );
    const { result, rerender } = renderSearch({ term: "Ab12" });
    await waitFor(() => expect(result.current.data?.[0]?.address).toBe(firstEntry.address));

    rerender({ term: "Cd34", orderBy: "rewardsUsd_DESC", limit: 20, offset: 0 });
    await waitFor(() => expect(mockFetchIncentivesGraphql).toHaveBeenCalledTimes(2));
    expect(result.current.data).toBeUndefined();
    await act(async () => {
      resolveSecond?.(secondResponse);
    });

    await waitFor(() => expect(result.current.data?.[0]?.address).toBe(secondEntry.address));
    expect(mockFetchIncentivesGraphql.mock.calls[1][2]).toMatchObject({ where: { account_contains: "Cd34" } });
  });

  it.each([{ term: "0x0", enabled: false }, { term: "   " }])(
    "does not fetch an inactive search (%o)",
    async (params) => {
      renderSearch(params);
      await waitFor(() => expect(mockFetchIncentivesGraphql).not.toHaveBeenCalled());
    }
  );

  it("does not fetch without an endpoint", async () => {
    mockGetIncentivesIndexerUrl.mockReturnValue(undefined);
    renderSearch({ term: "0x0" });
    await waitFor(() => expect(mockFetchIncentivesGraphql).not.toHaveBeenCalled());
  });
});
