import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryHistory } from "history";
import { Route, Router, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM, AVALANCHE } from "config/chains";
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

vi.mock("components/AppPageLayout/AppPageLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="page-layout">{children}</div>,
}));

vi.mock("components/AppCard/AppCard", () => ({
  AppCard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("components/Button/Button", () => ({
  default: ({ children, onClick }: { children: React.ReactNode; onClick: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

vi.mock("components/ChainContentHeader/ChainContentHeader", () => ({
  ChainContentHeader: () => null,
}));

vi.mock("components/Loader/Loader", () => ({
  default: () => <div data-testid="rewards-loader" />,
}));

vi.mock("components/PageTitle/PageTitle", () => ({
  default: () => null,
}));

vi.mock("components/Tabs/Tabs", () => ({
  default: ({ selectedValue }: { selectedValue: string }) => <div data-testid="tabs">{selectedValue}</div>,
}));

vi.mock("pages/RewardsPage/components/RewardsTiersTab", () => ({
  RewardsTiersTab: ({ summaryUnavailable }: { summaryUnavailable: boolean }) => (
    <div data-summary-unavailable={String(summaryUnavailable)} data-testid="tiers-tab" />
  ),
}));

vi.mock("pages/RewardsPage/components/RewardsHistoryTab", () => ({
  RewardsHistoryTab: ({ chainId, account }: { chainId: number; account?: string }) => (
    <div data-account={account} data-chain-id={chainId} data-testid="history-tab" />
  ),
}));

vi.mock("pages/RewardsPage/components/RewardsVestingFlow", () => ({
  RewardsVestingFlow: () => <div data-testid="vesting-flow" />,
}));

vi.mock("pages/RewardsPage/components/RewardsLeaderboardTab", () => ({
  RewardsLeaderboardTab: () => <div data-testid="leaderboard-tab" />,
}));

const mockUseChainId = vi.mocked(useChainId);
const mockUseWallet = vi.mocked(useWallet);
const mockUseRewardsPageData = vi.mocked(useRewardsPageData);
const mockRetry = vi.fn();
const mockConfig = {} as Extract<ReturnType<typeof useRewardsPageData>["availability"], { status: "active" }>["config"];

i18n.load({ en: {} });
i18n.activate("en");

function getPageData(
  availability: ReturnType<typeof useRewardsPageData>["availability"]
): ReturnType<typeof useRewardsPageData> {
  return {
    availability,
    config: availability.status === "active" ? availability.config : undefined,
    accountStatus: undefined,
    allTimeSummary: undefined,
    allTimeSummaryLoaded: false,
    isMixedEpoch: false,
    accountStatusError: undefined,
    allTimeSummaryError: undefined,
    accountStatusLoading: false,
    allTimeSummaryLoading: false,
    accountStatusValidating: false,
    allTimeSummaryValidating: false,
    retry: mockRetry,
    mutateConfig: vi.fn(),
    mutateAccountStatus: vi.fn(),
    mutateAllTimeSummary: vi.fn(),
  };
}

function LocationProbe() {
  const { pathname, search } = useLocation();

  return <div data-testid="location">{`${pathname}${search}`}</div>;
}

function renderPage(path: string) {
  const history = createMemoryHistory({ initialEntries: [path] });

  return render(
    <I18nProvider i18n={i18n}>
      <Router history={history}>
        <Route path="/rewards/:tab?">
          <RewardsPage />
        </Route>
        <LocationProbe />
      </Router>
    </I18nProvider>
  );
}

describe("RewardsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseChainId.mockReturnValue({ chainId: ARBITRUM } as ReturnType<typeof useChainId>);
    mockUseWallet.mockReturnValue({ account: "0x123" } as ReturnType<typeof useWallet>);
    mockUseRewardsPageData.mockReturnValue(getPageData({ status: "active", config: mockConfig, isStale: false }));
  });

  afterEach(() => {
    cleanup();
  });

  it("falls back from an invalid tab to the canonical Tiers route and preserves the query", async () => {
    renderPage("/rewards/unknown?account=0x123");

    await waitFor(() => {
      expect(screen.getByTestId("location").textContent).toBe("/rewards?account=0x123");
    });
    expect(screen.getByTestId("tiers-tab")).toBeDefined();
  });

  it("renders the loading shell without mounting a tab", () => {
    mockUseRewardsPageData.mockReturnValue(getPageData({ status: "loading" }));

    renderPage("/rewards/history");

    expect(screen.getByTestId("page-layout")).toBeDefined();
    expect(screen.getByTestId("rewards-loader")).toBeDefined();
    expect(screen.getByTestId("rewards-loading-shell").className).toContain("bg-slate-900");
    expect(screen.queryByTestId("history-tab")).toBeNull();
  });

  it("renders a retryable error state", () => {
    mockUseRewardsPageData.mockReturnValue(getPageData({ status: "error", error: new Error("Unavailable") }));

    renderPage("/rewards");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(screen.getByText("Rewards are temporarily unavailable")).toBeDefined();
    expect(mockRetry).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("tiers-tab")).toBeNull();
  });

  it("keeps an inactive program on the V2 route with a retry action", () => {
    mockUseRewardsPageData.mockReturnValue(getPageData({ status: "inactive" }));

    renderPage("/rewards/history?account=0x123");
    fireEvent.click(screen.getByRole("button", { name: "Check again" }));

    expect(screen.getByText("The Rewards program is not currently active")).toBeDefined();
    expect(screen.getByTestId("location").textContent).toBe("/rewards/history?account=0x123");
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });

  it("keeps unsupported chains on the V2 route with an Arbitrum prompt", () => {
    mockUseChainId.mockReturnValue({ chainId: AVALANCHE } as ReturnType<typeof useChainId>);
    mockUseRewardsPageData.mockReturnValue(getPageData({ status: "unsupported-chain" }));

    renderPage("/rewards/leaderboard?epoch=previous");

    expect(screen.getByText("Rewards are available on Arbitrum")).toBeDefined();
    expect(screen.getByTestId("location").textContent).toBe("/rewards/leaderboard?epoch=previous");
  });

  it("renders the active tab with the current chain and account", () => {
    renderPage("/rewards/history");

    expect(screen.getByTestId("tabs").textContent).toBe("history");
    expect(screen.getByTestId("history-tab").getAttribute("data-chain-id")).toBe(String(ARBITRUM));
    expect(screen.getByTestId("history-tab").getAttribute("data-account")).toBe("0x123");
    expect(screen.getByTestId("vesting-flow")).toBeDefined();
    expect(mockUseRewardsPageData).toHaveBeenCalledWith({ chainId: ARBITRUM, account: "0x123" });
  });

  it("keeps a loaded empty all-time summary available after a refresh error", () => {
    mockUseRewardsPageData.mockReturnValue({
      ...getPageData({ status: "active", config: mockConfig, isStale: false }),
      allTimeSummaryLoaded: true,
      allTimeSummaryError: new Error("refresh failed"),
    });

    renderPage("/rewards");

    expect(screen.getByTestId("tiers-tab").getAttribute("data-summary-unavailable")).toBe("false");
    expect(
      screen.getByText("Some account rewards could not be refreshed. Public incentive data remains available.")
    ).toBeDefined();
  });
});
