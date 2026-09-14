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
import type { RawAccountIncentiveStatus, RawLeaderboardEntry, RawRewardsHistoryEntry } from "../parsers";
import {
  ACCOUNT_INCENTIVE_STATUS_QUERY,
  ACCOUNT_REWARDS_HISTORY_QUERY,
  INCENTIVES_LEADERBOARD_QUERY,
  LATEST_GT_PRICE_QUERY,
  REWARDS_PROMO_ACTIVITY_QUERY,
} from "../queries";
import { useAccountIncentiveStatus } from "../useAccountIncentiveStatus";
import {
  createEmptyRewardsHistoryEntry,
  fillRewardsHistoryPage,
  useAccountRewardsHistory,
} from "../useAccountRewardsHistory";
import { useIncentivesLeaderboard } from "../useIncentivesLeaderboard";
import { useLatestGtPrice } from "../useLatestGtPrice";
import { useRewardsPromoActivity } from "../useRewardsPromoActivity";

const ENDPOINT = "https://example.com/incentives/graphql";
const CHECKSUMMED_ACCOUNT = "0x52908400098527886E0F7030069857D2E4169EE7";

const mockFetchIncentivesGraphql = vi.mocked(fetchIncentivesGraphql);
const mockGetIncentivesIndexerUrl = vi.mocked(getIncentivesIndexerUrl);
const swrConfig = { provider: () => new Map(), dedupingInterval: 0, errorRetryCount: 0 };

const rawStatus: RawAccountIncentiveStatus = {
  account: CHECKSUMMED_ACCOUNT,
  multiplier: "100",
  volumeTier: "Tier1",
  stakingTier: null,
  projectedVolumeTier: "Tier1",
  projectedStakingTier: null,
  epochTimestamp: 1_784_073_600,
  tradingVolume: "1",
  tierVolume: "1",
  referralVolume: "0",
  currentStakedBalance: "0",
  boostIds: [],
  esGmxRewards: "0",
  gtRewards: "0",
  rewardsUsd: "0",
  manualRewardCapUsd: "0",
  manualRewardConsumedUsd: "0",
  manualRewardRemainingUsd: "0",
};

const rawHistoryEntry: RawRewardsHistoryEntry = {
  epoch: 1_784_073_600,
  tradingVolume: "1",
  tierVolume: "1",
  referralVolume: "0",
  esGmxRewards: "0",
  gtRewards: "0",
  rewardsUsd: "0",
  tradingEsGmxRewards: "0",
  tradingGtRewards: "0",
  tradingRewardsUsd: "0",
  referralEsGmxRewards: "0",
  referralGtRewards: "0",
  referralRewardsUsd: "0",
  manualRewardsUsd: "0",
};

const rawLeaderboardEntry: RawLeaderboardEntry = {
  rank: 1,
  address: CHECKSUMMED_ACCOUNT,
  tradingVolume: "1",
  referralVolume: "0",
  esGmxRewards: "0",
  gtRewards: "0",
  rewardsUsd: "0",
  multiplier: "100",
};

function renderWithSWR(children: React.ReactElement) {
  return render(children, {
    wrapper: ({ children: wrapperChildren }: { children?: React.ReactNode }) => (
      <SWRConfig value={swrConfig}>{wrapperChildren}</SWRConfig>
    ),
  });
}

describe("Incentives V2 hooks", () => {
  beforeEach(() => {
    mockFetchIncentivesGraphql.mockReset();
    mockGetIncentivesIndexerUrl.mockReset();
    mockGetIncentivesIndexerUrl.mockReturnValue(ENDPOINT);
  });

  it("preserves account casing in status variables", async () => {
    mockFetchIncentivesGraphql.mockResolvedValue({ accountIncentiveStatus: rawStatus });

    function TestComponent() {
      useAccountIncentiveStatus(ARBITRUM, { account: CHECKSUMMED_ACCOUNT });
      return null;
    }

    renderWithSWR(<TestComponent />);

    await waitFor(() => expect(mockFetchIncentivesGraphql).toHaveBeenCalledTimes(1));
    expect(mockFetchIncentivesGraphql).toHaveBeenCalledWith(ENDPOINT, ACCOUNT_INCENTIVE_STATUS_QUERY, {
      account: CHECKSUMMED_ACCOUNT,
    });
  });

  it("loads recent activity with the original account casing", async () => {
    mockFetchIncentivesGraphql.mockResolvedValue({
      accountNetPositionFeesLast4Months: { netPositionFeeUsd: "123" },
      tradeActions: [{ timestamp: 456 }],
    });

    function TestComponent() {
      const { data } = useRewardsPromoActivity(ARBITRUM, { account: CHECKSUMMED_ACCOUNT });
      return <div>{data ? `${data.netPositionFeeUsd}:${data.firstTradeTimestamp}` : "loading"}</div>;
    }

    renderWithSWR(<TestComponent />);

    expect(await screen.findByText("123:456")).toBeTruthy();
    expect(mockFetchIncentivesGraphql).toHaveBeenCalledWith(ENDPOINT, REWARDS_PROMO_ACTIVITY_QUERY, {
      account: CHECKSUMMED_ACCOUNT,
    });
  });

  it("loads and parses the latest GT price independently", async () => {
    mockFetchIncentivesGraphql.mockResolvedValue({
      gtPrices: [{ priceUsd: "1804826760162400000000000000000", timestamp: 1_784_073_600 }],
    });

    function TestComponent() {
      const { data } = useLatestGtPrice(ARBITRUM);
      return <div>{data ? `${data.priceUsd}:${data.timestamp}` : "loading"}</div>;
    }

    renderWithSWR(<TestComponent />);

    expect(await screen.findByText("1804826760162400000000000000000:1784073600")).toBeTruthy();
    expect(mockFetchIncentivesGraphql).toHaveBeenCalledWith(ENDPOINT, LATEST_GT_PRICE_QUERY);
  });

  it("exposes an unavailable GT price without failing other incentives requests", async () => {
    mockFetchIncentivesGraphql.mockImplementation(async (_endpoint, query) => {
      if (query === LATEST_GT_PRICE_QUERY) {
        throw new Error("GraphQL error: Cannot query field gtPrices");
      }

      return { accountIncentiveStatus: rawStatus };
    });

    function TestComponent() {
      const { error: priceError } = useLatestGtPrice(ARBITRUM);
      const { data: status } = useAccountIncentiveStatus(ARBITRUM, { account: CHECKSUMMED_ACCOUNT });

      return (
        <div>
          {priceError?.message ?? "no price error"}:{status?.multiplier.toString() ?? "loading status"}
        </div>
      );
    }

    renderWithSWR(<TestComponent />);

    expect(await screen.findByText("GraphQL error: Cannot query field gtPrices:100")).toBeTruthy();
  });

  it("uses direct history pagination with the original account casing", async () => {
    mockFetchIncentivesGraphql.mockResolvedValue({
      accountRewardsHistory: { totalCount: 1, items: [rawHistoryEntry] },
    });

    function TestComponent() {
      useAccountRewardsHistory(ARBITRUM, { account: CHECKSUMMED_ACCOUNT, limit: 20, offset: 40 });
      return null;
    }

    renderWithSWR(<TestComponent />);

    await waitFor(() => expect(mockFetchIncentivesGraphql).toHaveBeenCalledTimes(1));
    expect(mockFetchIncentivesGraphql).toHaveBeenCalledWith(ENDPOINT, ACCOUNT_REWARDS_HISTORY_QUERY, {
      account: CHECKSUMMED_ACCOUNT,
      limit: 20,
      offset: 40,
    });
  });

  it("fills every skipped rewards epoch before paginating", () => {
    const currentEntry = { ...createEmptyRewardsHistoryEntry(300), tradingVolume: 3n };
    const firstEntry = { ...createEmptyRewardsHistoryEntry(100), tradingVolume: 1n };

    const firstPage = fillRewardsHistoryPage({
      entries: [firstEntry, currentEntry],
      programStartTimestamp: 100,
      currentEpoch: 300,
      epochDuration: 100,
      limit: 2,
      offset: 0,
    });
    const secondPage = fillRewardsHistoryPage({
      entries: [firstEntry, currentEntry],
      programStartTimestamp: 100,
      currentEpoch: 300,
      epochDuration: 100,
      limit: 2,
      offset: 2,
    });

    expect(firstPage.entries.map((entry) => [entry.epoch, entry.tradingVolume])).toEqual([
      [300, 3n],
      [200, 0n],
    ]);
    expect(firstPage.totalCount).toBe(3);
    expect(firstPage.hasNextPage).toBe(true);
    expect(secondPage.entries.map((entry) => [entry.epoch, entry.tradingVolume])).toEqual([[100, 1n]]);
    expect(secondPage.totalCount).toBe(3);
    expect(secondPage.hasNextPage).toBe(false);
  });

  it("loads complete history when filling skipped epochs", async () => {
    mockFetchIncentivesGraphql.mockResolvedValue({
      accountRewardsHistory: {
        totalCount: 2,
        items: [
          { ...rawHistoryEntry, epoch: 300 },
          { ...rawHistoryEntry, epoch: 100 },
        ],
      },
    });

    function TestComponent({ offset }: { offset: number }) {
      const history = useAccountRewardsHistory(ARBITRUM, {
        account: CHECKSUMMED_ACCOUNT,
        currentEpoch: 300,
        programStartTimestamp: 100,
        epochDuration: 100,
        limit: 2,
        offset,
      });

      return (
        <div>
          {history.data
            ? `${history.data.map((entry) => entry.epoch).join(",")}:${history.totalCount}:${history.hasNextPage}`
            : "loading"}
        </div>
      );
    }

    const view = renderWithSWR(<TestComponent offset={0} />);

    expect(await screen.findByText("300,200:3:true")).toBeTruthy();
    expect(mockFetchIncentivesGraphql).toHaveBeenCalledWith(ENDPOINT, ACCOUNT_REWARDS_HISTORY_QUERY, {
      account: CHECKSUMMED_ACCOUNT,
      limit: 1000,
      offset: 0,
    });

    view.rerender(<TestComponent offset={2} />);

    expect(await screen.findByText("100:3:false")).toBeTruthy();
    expect(mockFetchIncentivesGraphql).toHaveBeenCalledTimes(1);
  });

  it("loads indexer history beyond the backend page limit", async () => {
    const firstBackendPage = Array.from({ length: 1000 }, (_, index) => ({
      ...rawHistoryEntry,
      epoch: 1001 - index,
    }));
    mockFetchIncentivesGraphql.mockImplementation(async (_endpoint, query, variables) => {
      const offset = (variables as { offset?: number } | undefined)?.offset ?? 0;

      if (query !== ACCOUNT_REWARDS_HISTORY_QUERY) {
        throw new Error("Unexpected query");
      }

      return {
        accountRewardsHistory: {
          totalCount: 1001,
          items: offset === 0 ? firstBackendPage : [{ ...rawHistoryEntry, epoch: 1 }],
        },
      };
    });

    function TestComponent() {
      const history = useAccountRewardsHistory(ARBITRUM, {
        account: CHECKSUMMED_ACCOUNT,
        currentEpoch: 1001,
        programStartTimestamp: 1,
        epochDuration: 1,
        limit: 16,
        offset: 0,
      });

      return <div>{history.data ? `${history.data[0].epoch}:${history.totalCount}` : "loading"}</div>;
    }

    renderWithSWR(<TestComponent />);

    expect(await screen.findByText("1001:1001")).toBeTruthy();
    expect(mockFetchIncentivesGraphql).toHaveBeenCalledTimes(2);
    expect(mockFetchIncentivesGraphql).toHaveBeenLastCalledWith(ENDPOINT, ACCOUNT_REWARDS_HISTORY_QUERY, {
      account: CHECKSUMMED_ACCOUNT,
      limit: 1000,
      offset: 1000,
    });
  });

  it("forwards leaderboard sorting and exact-cased account filters", async () => {
    mockFetchIncentivesGraphql.mockResolvedValue({
      incentivesLeaderboard: { totalCount: 1, items: [rawLeaderboardEntry] },
    });

    function TestComponent() {
      useIncentivesLeaderboard(ARBITRUM, {
        epoch: 1_784_073_600,
        where: { account: CHECKSUMMED_ACCOUNT },
        orderBy: "rewardsUsd_DESC",
        limit: 20,
        offset: 0,
      });
      return null;
    }

    renderWithSWR(<TestComponent />);

    await waitFor(() => expect(mockFetchIncentivesGraphql).toHaveBeenCalledTimes(1));
    expect(mockFetchIncentivesGraphql).toHaveBeenCalledWith(ENDPOINT, INCENTIVES_LEADERBOARD_QUERY, {
      epoch: 1_784_073_600,
      where: { account: CHECKSUMMED_ACCOUNT },
      orderBy: "rewardsUsd_DESC",
      limit: 20,
      offset: 0,
    });
  });

  it("does not request account data when disabled or given an invalid address", async () => {
    function TestComponent() {
      useAccountIncentiveStatus(ARBITRUM, { account: CHECKSUMMED_ACCOUNT, enabled: false });
      useAccountRewardsHistory(ARBITRUM, { account: "invalid", limit: 20, offset: 0 });
      useIncentivesLeaderboard(ARBITRUM, { where: { account: "invalid" }, limit: 20, offset: 0 });
      useLatestGtPrice(ARBITRUM, { enabled: false });
      useRewardsPromoActivity(ARBITRUM, { account: "invalid" });
      return null;
    }

    renderWithSWR(<TestComponent />);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mockFetchIncentivesGraphql).not.toHaveBeenCalled();
  });
});
