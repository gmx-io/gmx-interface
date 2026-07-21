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
import type { RawIncentiveAccountEpochAuditEntry } from "../parsers";
import { INCENTIVE_ACCOUNT_EPOCH_AUDIT_QUERY } from "../queries";
import { useIncentiveAccountEpochAudit } from "../useIncentiveAccountEpochAudit";

const ENDPOINT = "https://example.com/incentives/graphql";
const CHECKSUMMED_ACCOUNT = "0x52908400098527886E0F7030069857D2E4169EE7";
const swrConfig = { provider: () => new Map(), dedupingInterval: 0, errorRetryCount: 0 };

const rawEntry: RawIncentiveAccountEpochAuditEntry = {
  id: `${CHECKSUMMED_ACCOUNT}-1784073600`,
  account: CHECKSUMMED_ACCOUNT,
  epochTimestamp: 1_784_073_600,
  fees: "10",
  tradingVolume: "20",
  tierVolume: "15",
  referralVolume: "5",
  esGmxRewards: "3",
  gtRewards: "4",
  rewardsUsd: "7",
  manualRewardsUsd: "2",
  avgMultiplier: 150,
  maxMultiplier: 250,
  volumeTier: "Tier2",
  stakingTier: "Tier1",
  boostIds: ["LifetimeTrading"],
  effectiveRewardsRatio: 0.7,
};

const mockFetchIncentivesGraphql = vi.mocked(fetchIncentivesGraphql);
const mockGetIncentivesIndexerUrl = vi.mocked(getIncentivesIndexerUrl);

function renderWithSWR(children: React.ReactElement) {
  return render(<SWRConfig value={swrConfig}>{children}</SWRConfig>);
}

describe("useIncentiveAccountEpochAudit", () => {
  beforeEach(() => {
    mockFetchIncentivesGraphql.mockReset();
    mockGetIncentivesIndexerUrl.mockReset();
    mockGetIncentivesIndexerUrl.mockReturnValue(ENDPOINT);
  });

  it("forwards exact-cased filters, supported ordering, and pagination", async () => {
    mockFetchIncentivesGraphql.mockResolvedValue({
      incentiveAccountEpochAudit: { totalCount: 21, items: [rawEntry] },
    });

    function TestComponent() {
      const { data, hasNextPage } = useIncentiveAccountEpochAudit(ARBITRUM, {
        where: { account: CHECKSUMMED_ACCOUNT, epochTimestamp: 1_784_073_600 },
        orderBy: "effectiveRewardsRatio_DESC",
        limit: 20,
        offset: 0,
      });
      return <div>{data ? `${data[0].account}:${hasNextPage}` : "loading"}</div>;
    }

    renderWithSWR(<TestComponent />);

    expect(await screen.findByText(`${CHECKSUMMED_ACCOUNT}:true`)).toBeTruthy();
    expect(mockFetchIncentivesGraphql).toHaveBeenCalledWith(ENDPOINT, INCENTIVE_ACCOUNT_EPOCH_AUDIT_QUERY, {
      where: { account: CHECKSUMMED_ACCOUNT, epochTimestamp: 1_784_073_600 },
      orderBy: "effectiveRewardsRatio_DESC",
      limit: 20,
      offset: 0,
    });
  });

  it("returns loaded-page V2 totals without obsolete points fields", async () => {
    mockFetchIncentivesGraphql.mockResolvedValue({
      incentiveAccountEpochAudit: {
        totalCount: 2,
        items: [rawEntry, { ...rawEntry, id: "second", effectiveRewardsRatio: 0.3 }],
      },
    });

    function TestComponent() {
      const { summary } = useIncentiveAccountEpochAudit(ARBITRUM, { limit: 1000 });
      return (
        <div>
          {summary
            ? `${summary.loadedCount}:${summary.totalTradingVolume}:${summary.totalRewardsUsd}:${summary.totalManualRewardsUsd}:${summary.avgEffectiveRewardsRatio}`
            : "loading"}
        </div>
      );
    }

    renderWithSWR(<TestComponent />);

    expect(await screen.findByText("2:40:14:4:0.5")).toBeTruthy();
    expect(mockFetchIncentivesGraphql).toHaveBeenCalledWith(ENDPOINT, INCENTIVE_ACCOUNT_EPOCH_AUDIT_QUERY, {
      limit: 1000,
      offset: 0,
    });
  });

  it("does not request audit data for an invalid account or missing endpoint", async () => {
    function InvalidAccount() {
      useIncentiveAccountEpochAudit(ARBITRUM, { where: { account: "invalid" } });
      return null;
    }

    const { unmount } = renderWithSWR(<InvalidAccount />);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mockFetchIncentivesGraphql).not.toHaveBeenCalled();
    unmount();

    mockGetIncentivesIndexerUrl.mockReturnValue(undefined);

    function MissingEndpoint() {
      useIncentiveAccountEpochAudit(ARBITRUM, {});
      return null;
    }

    renderWithSWR(<MissingEndpoint />);
    await waitFor(() => expect(mockFetchIncentivesGraphql).not.toHaveBeenCalled());
  });
});
