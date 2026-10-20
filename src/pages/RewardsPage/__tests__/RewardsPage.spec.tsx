import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "config/chains";
import { useChainId } from "lib/chains";
import useWallet from "lib/wallets/useWallet";

import { RewardsPage } from "../RewardsPage";
import { useRewardsPageData } from "../useRewardsPageData";

vi.mock("lib/chains", () => ({
  useChainId: vi.fn(),
}));

vi.mock("lib/wallets/useWallet", () => ({
  default: vi.fn(),
}));

vi.mock("pages/RewardsPage/useRewardsPageData", () => ({
  useRewardsPageData: vi.fn(),
}));

vi.mock("lib/userAnalytics/rewardsEvents", () => ({
  sendRewardsPageViewEvent: vi.fn(),
}));

vi.mock("components/AppPageLayout/AppPageLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("components/ChainContentHeader/ChainContentHeader", () => ({
  ChainContentHeader: () => null,
}));

vi.mock("components/Loader/Loader", () => ({
  default: () => null,
}));

vi.mock("components/PageTitle/PageTitle", () => ({
  default: () => null,
}));

vi.mock("components/Tabs/Tabs", () => ({
  default: () => null,
}));

vi.mock("pages/RewardsPage/components/RewardsOnboardingModal", () => ({
  RewardsOnboardingModal: () => null,
}));

vi.mock("pages/RewardsPage/components/RewardsTiersTab", () => ({
  RewardsTiersTab: ({
    summaryUnavailable,
    statusLoading,
    statusUnavailable,
  }: {
    summaryUnavailable: boolean;
    statusLoading: boolean;
    statusUnavailable: boolean;
  }) => (
    <div
      data-summary-unavailable={String(summaryUnavailable)}
      data-status-loading={String(statusLoading)}
      data-status-unavailable={String(statusUnavailable)}
      data-testid="tiers-tab"
    />
  ),
}));

vi.mock("pages/RewardsPage/components/RewardsHistoryTab", () => ({
  RewardsHistoryTab: () => null,
}));

vi.mock("pages/RewardsPage/components/RewardsVestingFlow", () => ({
  RewardsVestingFlow: () => null,
}));

vi.mock("pages/RewardsPage/components/RewardsVestingFaq", () => ({
  RewardsVestingFaq: () => null,
}));

vi.mock("pages/RewardsPage/components/RewardsPromotionalBanners", () => ({
  RewardsPromotionalBanners: () => null,
}));

vi.mock("pages/RewardsPage/components/RewardsLeaderboardTab", () => ({
  RewardsLeaderboardTab: () => null,
}));

const mockUseRewardsPageData = vi.mocked(useRewardsPageData);
const mockConfig = {} as Extract<ReturnType<typeof useRewardsPageData>["availability"], { status: "active" }>["config"];
const ROUTER_ENTRIES = ["/rewards"];
const INDEXING_WARNING = "The new epoch is being indexed. Account totals will update shortly.";
const REFRESH_WARNING = "Some account rewards could not be refreshed. Public incentive data remains available.";

i18n.load({ en: {} });
i18n.activate("en");

function getPageData(overrides: Partial<ReturnType<typeof useRewardsPageData>>): ReturnType<typeof useRewardsPageData> {
  return {
    availability: { status: "active", config: mockConfig, isStale: false },
    config: mockConfig,
    canLoadAllTimeLeaderboard: true,
    accountStatus: undefined,
    allTimeSummary: undefined,
    allTimeSummaryLoaded: false,
    isMixedEpoch: false,
    isMixedEpochPersistent: false,
    accountStatusError: undefined,
    allTimeSummaryError: undefined,
    accountStatusLoading: false,
    allTimeSummaryLoading: false,
    accountStatusValidating: false,
    allTimeSummaryValidating: false,
    retry: vi.fn(),
    mutateConfig: vi.fn(),
    mutateAccountStatus: vi.fn(),
    mutateAllTimeSummary: vi.fn(),
    ...overrides,
  };
}

describe("RewardsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useChainId).mockReturnValue({ chainId: ARBITRUM } as ReturnType<typeof useChainId>);
    vi.mocked(useWallet).mockReturnValue({ account: "0x123" } as ReturnType<typeof useWallet>);
  });

  afterEach(cleanup);

  it.each<{
    name: string;
    overrides: Partial<ReturnType<typeof useRewardsPageData>>;
    expected: boolean[];
    warnings: string[];
  }>([
    { name: "a matching epoch", overrides: {}, expected: [false, false, false], warnings: [] },
    {
      name: "a transient mixed epoch",
      overrides: { isMixedEpoch: true },
      expected: [true, false, false],
      warnings: [],
    },
    {
      name: "a persistent mixed epoch",
      overrides: { isMixedEpoch: true, isMixedEpochPersistent: true },
      expected: [false, true, false],
      warnings: [INDEXING_WARNING],
    },
    {
      name: "an account status error",
      overrides: { accountStatusError: new Error("failed") },
      expected: [false, true, false],
      warnings: [REFRESH_WARNING],
    },
    {
      name: "a summary error before the summary loads",
      overrides: { allTimeSummaryError: new Error("failed") },
      expected: [false, false, true],
      warnings: [REFRESH_WARNING],
    },
    {
      name: "a summary refresh error after an empty summary loaded",
      overrides: { allTimeSummaryError: new Error("failed"), allTimeSummaryLoaded: true },
      expected: [false, false, false],
      warnings: [REFRESH_WARNING],
    },
  ])("passes tier account flags for $name", ({ overrides, expected, warnings }) => {
    const [statusLoading, statusUnavailable, summaryUnavailable] = expected;
    mockUseRewardsPageData.mockReturnValue(getPageData(overrides));

    render(
      <I18nProvider i18n={i18n}>
        <MemoryRouter initialEntries={ROUTER_ENTRIES}>
          <Route path="/rewards/:tab?">
            <RewardsPage />
          </Route>
        </MemoryRouter>
      </I18nProvider>
    );

    const tiersTab = screen.getByTestId("tiers-tab");
    expect(tiersTab.getAttribute("data-status-loading")).toBe(String(statusLoading));
    expect(tiersTab.getAttribute("data-status-unavailable")).toBe(String(statusUnavailable));
    expect(tiersTab.getAttribute("data-summary-unavailable")).toBe(String(summaryUnavailable));
    for (const warning of [INDEXING_WARNING, REFRESH_WARNING]) {
      expect(screen.queryByText(warning) !== null).toBe(warnings.includes(warning));
    }
  });
});
