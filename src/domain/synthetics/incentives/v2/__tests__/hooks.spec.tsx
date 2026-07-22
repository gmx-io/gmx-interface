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
  REWARDS_PROMO_ACTIVITY_QUERY,
} from "../queries";
import { useAccountIncentiveStatus } from "../useAccountIncentiveStatus";
import { useAccountRewardsHistory } from "../useAccountRewardsHistory";
import { useIncentivesLeaderboard } from "../useIncentivesLeaderboard";
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
  return render(<SWRConfig value={swrConfig}>{children}</SWRConfig>);
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
      useRewardsPromoActivity(ARBITRUM, { account: "invalid" });
      return null;
    }

    renderWithSWR(<TestComponent />);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mockFetchIncentivesGraphql).not.toHaveBeenCalled();
  });

  it("exposes strict transport failures as hook errors", async () => {
    mockFetchIncentivesGraphql.mockRejectedValue(new Error("GraphQL error: Invalid account"));

    function TestComponent() {
      const { error } = useAccountIncentiveStatus(ARBITRUM, { account: CHECKSUMMED_ACCOUNT });
      return <div>{error?.message ?? "no error"}</div>;
    }

    renderWithSWR(<TestComponent />);

    expect(await screen.findByText("GraphQL error: Invalid account")).toBeTruthy();
  });
});
