import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryHistory } from "history";
import { Route, Router, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM, AVALANCHE } from "config/chains";
import { useChainId } from "lib/chains";
import useWallet from "lib/wallets/useWallet";

import { getRewardsDebugConfig, type RewardsDebugMode } from "../rewardsDebug";
import { RewardsPage } from "../RewardsPage";
import { useRewardsPageData } from "../useRewardsPageData";

const rewardsAnalyticsMock = vi.hoisted(() => ({
  sendRewardsPageViewEvent: vi.fn(),
}));

vi.mock("lib/chains", () => ({
  useChainId: vi.fn(),
}));

vi.mock("lib/wallets/useWallet", () => ({
  default: vi.fn(),
}));

vi.mock("pages/RewardsPage/useRewardsPageData", () => ({
  useRewardsPageData: vi.fn(),
}));

vi.mock("lib/userAnalytics/rewardsEvents", () => rewardsAnalyticsMock);

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
  default: ({ subtitle }: { subtitle: React.ReactNode }) => <div data-testid="page-subtitle">{subtitle}</div>,
}));

vi.mock("components/Tabs/Tabs", () => ({
  default: ({
    selectedValue,
    options,
    rightContent,
  }: {
    selectedValue: string;
    options: { value: string }[];
    rightContent?: React.ReactNode;
  }) => (
    <div data-options={options.map((option) => option.value).join(",")} data-testid="tabs">
      <span data-testid="selected-tab">{selectedValue}</span>
      {rightContent}
    </div>
  ),
}));

vi.mock("pages/RewardsPage/components/RewardsOnboardingModal", () => ({
  RewardsOnboardingModal: ({ shouldAutoOpen }: { shouldAutoOpen: boolean }) => (
    <button type="button" data-auto-open={String(shouldAutoOpen)}>
      How it works?
    </button>
  ),
}));

vi.mock("pages/RewardsPage/components/RewardsTiersTab", () => ({
  RewardsTiersTab: ({
    config,
    summaryUnavailable,
  }: {
    config: { epochTimestamp?: number };
    summaryUnavailable: boolean;
  }) => (
    <div
      data-config-epoch={config.epochTimestamp}
      data-summary-unavailable={String(summaryUnavailable)}
      data-testid="tiers-tab"
    />
  ),
}));

vi.mock("pages/RewardsPage/components/RewardsHistoryTab", () => ({
  RewardsHistoryTab: ({
    chainId,
    account,
    config,
  }: {
    chainId: number;
    account?: string;
    config: { epochTimestamp?: number };
  }) => (
    <div
      data-account={account}
      data-chain-id={chainId}
      data-config-epoch={config.epochTimestamp}
      data-testid="history-tab"
    />
  ),
}));

vi.mock("pages/RewardsPage/components/RewardsVestingFlow", () => ({
  RewardsVestingFlow: () => <div data-testid="vesting-flow" />,
}));

vi.mock("pages/RewardsPage/components/RewardsVestingFaq", () => ({
  RewardsVestingFaq: () => <div data-testid="vesting-faq" />,
}));

vi.mock("pages/RewardsPage/components/RewardsPromotionalBanners", () => ({
  RewardsPromotionalBanners: () => <div data-testid="promotional-banners" />,
}));

vi.mock("pages/RewardsPage/components/RewardsLeaderboardTab", () => ({
  RewardsLeaderboardTab: ({ config }: { config?: unknown }) => (
    <div data-config={config ? "active" : "all-time-only"} data-testid="leaderboard-tab" />
  ),
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
    canLoadAllTimeLeaderboard: availability.status !== "unsupported-chain",
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

  it("shows the updated page description", () => {
    renderPage("/rewards");

    expect(screen.getByTestId("page-subtitle").textContent).toBe(
      "Stake GMX, trade, and earn rewards worth up to 120% of your fees."
    );
  });

  it("places the onboarding launcher in the shared tabs row", () => {
    renderPage("/rewards");

    const launcher = screen.getByRole("button", { name: "How it works?" });
    expect(screen.getByTestId("tabs").contains(launcher)).toBe(true);
    expect(launcher.getAttribute("data-auto-open")).toBe("true");
  });

  it("hides the Rewards tab while disconnected", () => {
    mockUseWallet.mockReturnValue({ account: undefined } as ReturnType<typeof useWallet>);

    renderPage("/rewards");

    expect(screen.getByTestId("tabs").getAttribute("data-options")).toBe("tiers,leaderboard");
  });

  it("renders the loading shell without mounting a tab", () => {
    mockUseRewardsPageData.mockReturnValue(getPageData({ status: "loading" }));

    renderPage("/rewards/history");

    expect(screen.getByTestId("page-layout")).toBeDefined();
    expect(screen.getByTestId("rewards-loader")).toBeDefined();
    expect(screen.getByTestId("selected-tab").textContent).toBe("history");
    expect(screen.queryByTestId("history-tab")).toBeNull();
  });

  it.each([
    ["loading", { status: "loading" } as const],
    ["error", { status: "error", error: new Error("Unavailable") } as const],
    ["inactive", { status: "inactive" } as const],
  ])("keeps the all-time leaderboard available while config is %s", (_label, availability) => {
    mockUseRewardsPageData.mockReturnValue(getPageData(availability));

    renderPage("/rewards/leaderboard");

    expect(screen.getByTestId("selected-tab").textContent).toBe("leaderboard");
    expect(screen.getByTestId("leaderboard-tab").getAttribute("data-config")).toBe("all-time-only");
    expect(screen.queryByTestId("rewards-loader")).toBeNull();
    expect(screen.queryByText("Rewards are temporarily unavailable")).toBeNull();
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

    expect(screen.getByTestId("selected-tab").textContent).toBe("history");
    expect(screen.getByTestId("history-tab").getAttribute("data-chain-id")).toBe(String(ARBITRUM));
    expect(screen.getByTestId("history-tab").getAttribute("data-account")).toBe("0x123");
    expect(screen.getByTestId("vesting-flow")).toBeDefined();
    const historyTab = screen.getByTestId("history-tab");
    const vestingFaq = screen.getByTestId("vesting-faq");
    expect(historyTab.compareDocumentPosition(vestingFaq) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const contentColumn = historyTab.parentElement;
    expect(contentColumn?.contains(screen.getByTestId("vesting-flow"))).toBe(true);
    expect(contentColumn?.contains(vestingFaq)).toBe(false);
    expect(vestingFaq.parentElement?.className).toContain("sticky");
    expect(mockUseRewardsPageData).toHaveBeenCalledWith({
      chainId: ARBITRUM,
      account: "0x123",
      loadTierAccountData: false,
    });
  });

  it.each([["loading"], ["error"], ["empty"]])("renders the development-only %s page fixture", (mode) => {
    renderPage(`/rewards/leaderboard?rewardsDebug=${mode}`);

    if (mode === "loading") expect(screen.getByTestId("rewards-loader")).toBeDefined();
    if (mode === "empty") expect(screen.getByText("No rewards")).toBeDefined();
    if (mode === "error") {
      expect(screen.getByText("Rewards are temporarily unavailable")).toBeDefined();
      fireEvent.click(screen.getByRole("button", { name: "Retry" }));
      expect(mockRetry).not.toHaveBeenCalled();
    }
    expect(screen.queryByTestId("leaderboard-tab")).toBeNull();
  });

  it.each([
    ["loading", { status: "loading" } as const],
    ["error", { status: "error", error: new Error("Unavailable") } as const],
    ["inactive", { status: "inactive" } as const],
  ])("renders the deterministic banner fixture while live config is %s", (_label, availability) => {
    mockUseRewardsPageData.mockReturnValue(getPageData(availability));

    renderPage("/rewards?rewardsDebug=banners");

    const debugConfig = getRewardsDebugConfig("banners");
    expect(screen.getByTestId("tiers-tab").getAttribute("data-config-epoch")).toBe(String(debugConfig?.epochTimestamp));
    expect(screen.queryByTestId("rewards-loader")).toBeNull();
    expect(screen.queryByText("Rewards are temporarily unavailable")).toBeNull();
    expect(screen.queryByText("The Rewards program is not currently active")).toBeNull();
  });

  const vestingDebugModes = [
    "vesting-idle",
    "vesting-active",
    "vesting-complete",
    "vesting-error",
    "vesting-loading",
  ] satisfies RewardsDebugMode[];
  const unavailableConfigStates = [
    ["loading", { status: "loading" } as const],
    ["error", { status: "error", error: new Error("Unavailable") } as const],
    ["inactive", { status: "inactive" } as const],
  ] as const;

  it.each(
    unavailableConfigStates.flatMap(([availabilityLabel, availability]) =>
      vestingDebugModes.map((mode) => [mode, availabilityLabel, availability] as const)
    )
  )("renders the %s fixture while live config is %s", (mode, _availabilityLabel, availability) => {
    mockUseRewardsPageData.mockReturnValue(getPageData(availability));

    renderPage(`/rewards/history?rewardsDebug=${mode}`);

    const debugConfig = getRewardsDebugConfig(mode);
    expect(screen.getByTestId("vesting-flow")).toBeDefined();
    expect(screen.getByTestId("history-tab").getAttribute("data-config-epoch")).toBe(
      String(debugConfig?.epochTimestamp)
    );
    expect(screen.queryByTestId("rewards-loader")).toBeNull();
    expect(screen.queryByText("Rewards are temporarily unavailable")).toBeNull();
    expect(screen.queryByText("The Rewards program is not currently active")).toBeNull();
  });

  it("tracks active tab views using rewards analytics tab names", async () => {
    renderPage("/rewards/history");

    await waitFor(() => {
      expect(rewardsAnalyticsMock.sendRewardsPageViewEvent).toHaveBeenCalledWith("rewards");
    });
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
