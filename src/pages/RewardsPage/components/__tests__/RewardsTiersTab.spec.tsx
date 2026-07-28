import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "config/chains";
import { ES_GMX_DECIMALS, GT_DECIMALS } from "domain/synthetics/incentives/v2/constants";
import type { AccountIncentiveStatus, IncentivesConfig, LeaderboardEntry } from "domain/synthetics/incentives/v2/types";
import { useRewardsPromoActivity } from "domain/synthetics/incentives/v2/useRewardsPromoActivity";
import {
  formatFactorPercentage,
  formatMultiplier,
  getMaxRewardRateFactor,
} from "domain/synthetics/incentives/v2/utils";
import { useRewardsVestingData } from "domain/vesting/useRewardsVestingData";
import { useChainId } from "lib/chains";
import { formatUsd, PRECISION } from "lib/numbers";
import { useIsWalletInitializing } from "lib/wallets/useIsWalletInitializing";
import useWallet from "lib/wallets/useWallet";

import { EARN_PORTFOLIO_STAKE_GMX_LINK } from "components/Earn/Portfolio/AssetsList/GmxAssetCard/constants";

import { RewardsTiersTab } from "../RewardsTiersTab";

vi.mock("components/AppCard/AppCard", () => ({
  AppCard: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
}));

vi.mock("domain/synthetics/incentives/v2/useRewardsPromoActivity", () => ({
  useRewardsPromoActivity: vi.fn(),
}));

vi.mock("domain/vesting/useRewardsVestingData", () => ({
  useRewardsVestingData: vi.fn(),
}));

vi.mock("lib/wallets/useIsWalletInitializing", () => ({
  useIsWalletInitializing: vi.fn(),
}));

vi.mock("lib/wallets/useWallet", () => ({
  default: vi.fn(),
}));

vi.mock("lib/chains", () => ({
  useChainId: vi.fn(),
}));

vi.mock("lib/userAnalytics/rewardsEvents", () => ({
  sendRewardsBannerEvent: vi.fn(),
  sendRewardsNavigationEvent: vi.fn(),
}));

vi.mock("components/Table/Table", () => ({
  Table: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
  TableTd: ({ children }: { children: React.ReactNode }) => <td>{children}</td>,
  TableTh: ({ children }: { children: React.ReactNode }) => <th>{children}</th>,
  TableTheadTr: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
  TableTr: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
}));

vi.mock("components/TableScrollFade/TableScrollFade", () => ({
  TableScrollFadeContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("components/Tabs/Tabs", () => ({
  default: ({
    options,
    selectedValue,
    onChange,
  }: {
    options: { value: string; label: React.ReactNode }[];
    selectedValue: string;
    onChange: (value: string) => void;
  }) => (
    <div>
      {options.map((option) => (
        <button aria-pressed={selectedValue === option.value} key={option.value} onClick={() => onChange(option.value)}>
          {option.label}
        </button>
      ))}
    </div>
  ),
}));

const CHECKSUMMED_ACCOUNT = "0x52908400098527886E0F7030069857D2E4169EE7";
const SAME_ACCOUNT_DIFFERENT_CASE = "0x52908400098527886e0f7030069857d2e4169ee7";
const OTHER_CHECKSUMMED_ACCOUNT = "0x8617E340B3D01FA5F11F306F4090FD50E238070D";
const GMX_UNIT = 10n ** BigInt(ES_GMX_DECIMALS);
const GT_UNIT = 10n ** BigInt(GT_DECIMALS);
const mockUseRewardsPromoActivity = vi.mocked(useRewardsPromoActivity);
const mockUseRewardsVestingData = vi.mocked(useRewardsVestingData);
const mockUseChainId = vi.mocked(useChainId);
const mockUseIsWalletInitializing = vi.mocked(useIsWalletInitializing);
const mockUseWallet = vi.mocked(useWallet);

function usd(value: bigint) {
  return value * PRECISION;
}

function normalizeText(text: string | null | undefined) {
  return text?.replace(/\s/g, "") ?? "";
}

async function expectTooltipText(text: string) {
  const expectedText = normalizeText(text);

  await waitFor(() => {
    expect(
      Array.from(document.querySelectorAll(".Tooltip-popup")).some((tooltip) =>
        normalizeText(tooltip.textContent).includes(expectedText)
      )
    ).toBe(true);
  });
}

const config: IncentivesConfig = {
  epochTimestamp: 1_000,
  epochStartTimestamp: 1_000,
  programStartTimestamp: 500,
  epochDuration: 604_800,
  maxMultiplier: 1_000n,
  multiplierDecimals: 100n,
  volumeTierPersistenceEpochs: 4,
  feeShareFactor: PRECISION / 10n,
  esGmxShareFactor: PRECISION / 2n,
  gtShareFactor: PRECISION / 2n,
  referralRewardShareFactor: PRECISION / 20n,
  volumeTiers: [
    { tier: "Tier1", threshold: usd(1_000n), multiplier: 25n },
    { tier: "Tier2", threshold: usd(5_000n), multiplier: 50n },
  ],
  stakingTiers: [
    { tier: "Tier1", threshold: 100n * GMX_UNIT, multiplier: 10n },
    { tier: "Tier2", threshold: 500n * GMX_UNIT, multiplier: 25n },
  ],
  boosts: [
    { boost: "FeaturedMarkets", multiplier: 25n },
    { boost: "BalancingTrades", multiplier: 50n },
    { boost: "LifetimeTrading", multiplier: 100n },
    { boost: "ManualAllocation", multiplier: 200n },
  ],
  featuredMarketIndexTokens: ["0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a"],
  downgradingCoefficients: [],
  balancingTradesThreshold: usd(10_000n),
  lifetimeVolumeThreshold: usd(1_000_000n),
  manualAllocationTiers: [
    { minVolume: usd(10_000n), maxVolume: usd(250_000n), rewardCapUsd: usd(50n) },
    { minVolume: usd(750_000_000n), maxVolume: null, rewardCapUsd: usd(25_000n) },
  ],
};

const status: AccountIncentiveStatus = {
  account: CHECKSUMMED_ACCOUNT,
  multiplier: 175n,
  volumeTier: "Tier1",
  stakingTier: "Tier1",
  projectedVolumeTier: "Tier2",
  projectedStakingTier: "Tier2",
  epochTimestamp: config.epochTimestamp,
  tradingVolume: usd(7_000n),
  tierVolume: usd(6_000n),
  referralVolume: usd(12_345n),
  currentStakedBalance: 250n * GMX_UNIT,
  boostIds: ["FeaturedMarkets", "ManualAllocation"],
  esGmxRewards: 0n,
  gtRewards: 0n,
  rewardsUsd: usd(75n),
  manualRewardCapUsd: usd(100n),
  manualRewardConsumedUsd: usd(40n),
  manualRewardRemainingUsd: usd(60n),
};

const allTimeSummary: LeaderboardEntry = {
  rank: 7,
  address: CHECKSUMMED_ACCOUNT,
  tradingVolume: usd(100_000n),
  referralVolume: usd(25_000n),
  esGmxRewards: 12n * GMX_UNIT,
  gtRewards: 150n * GT_UNIT,
  rewardsUsd: usd(500n),
  multiplier: null,
};

type RewardsTiersTabProps = React.ComponentProps<typeof RewardsTiersTab>;

const defaultProps: RewardsTiersTabProps = {
  chainId: ARBITRUM,
  config,
  account: CHECKSUMMED_ACCOUNT,
  status,
  allTimeSummary,
  statusLoading: false,
  summaryLoading: false,
  statusUnavailable: false,
  summaryUnavailable: false,
};

i18n.load({ en: {} });
i18n.activate("en");

function getTabNode(overrides: Partial<RewardsTiersTabProps> = {}) {
  return (
    <I18nProvider i18n={i18n}>
      <MemoryRouter>
        <RewardsTiersTab {...defaultProps} {...overrides} />
      </MemoryRouter>
    </I18nProvider>
  );
}

function renderTab(overrides: Partial<RewardsTiersTabProps> = {}) {
  return render(getTabNode(overrides));
}

function getVestingDataResult(walletGmxBalance = 0n): ReturnType<typeof useRewardsVestingData> {
  return {
    data: {
      walletGmxBalance,
      walletEsGmxBalance: 5n * GMX_UNIT,
      stakedGmxBalance: 0n,
      freePairAmount: 0n,
      vestingInfo: {
        pairAmount: 0n,
        vestedAmount: 0n,
        escrowedBalance: 0n,
        claimedAmounts: 0n,
        claimable: 0n,
        maxVestableAmount: 5n * GMX_UNIT,
        averageStakedAmount: 0n,
      },
      vestingDuration: 365n * 24n * 60n * 60n,
      gmxPrice: 2n * PRECISION,
    },
    vestableEsGmx: 5n * GMX_UNIT,
    vestableEsGmxUsd: usd(10n),
    isLoading: false,
    error: undefined,
    mutate: vi.fn(),
  };
}

beforeEach(() => {
  mockUseChainId.mockReturnValue({ chainId: ARBITRUM } as ReturnType<typeof useChainId>);
  mockUseWallet.mockReturnValue({
    account: CHECKSUMMED_ACCOUNT,
    status: "connected",
    active: true,
    chainId: ARBITRUM,
  } as ReturnType<typeof useWallet>);
  mockUseIsWalletInitializing.mockReturnValue(false);
  mockUseRewardsPromoActivity.mockReturnValue({
    data: undefined,
    error: undefined,
    loading: false,
    endpoint: "https://example.com/graphql",
  });
  mockUseRewardsVestingData.mockReturnValue(getVestingDataResult());
});

afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
});

describe("RewardsTiersTab", () => {
  it("does not render account zeros or inactive statuses while disconnected", () => {
    renderTab({ account: undefined });

    expect(screen.queryByText("Current Multiplier")).toBeNull();
    expect(screen.queryByText("All-time Rewards")).toBeNull();
    expect(screen.queryByText("Vestable esGMX")).toBeNull();
    expect(screen.queryByTestId("rewards-promotional-banners")).toBeNull();
    expect(document.body.textContent).not.toContain(formatUsd(0n, { fallbackToZero: true }));
    expect(screen.queryByText("Inactive")).toBeNull();
    expect(screen.queryByText("0 qualified this epoch")).toBeNull();
  });

  it("uses the V1 current multiplier transition treatment when connected", () => {
    renderTab();

    const multiplierSummary = screen.getByTestId("rewards-current-multiplier");
    const transitionArrow = screen.getByTestId("multiplier-transition-arrow");
    expect(multiplierSummary.textContent).toContain("1.75x");
    expect(multiplierSummary.textContent).toContain("2.15x");
    expect(within(multiplierSummary).getByText("1.75x").className).toContain("text-green-300");
    expect(within(multiplierSummary).getByText("2.15x").className).toContain("text-blue-100");
    expect(transitionArrow.getAttribute("class")).toContain("size-16");
    expect(transitionArrow.getAttribute("class")).toContain("rounded-full");
    expect(document.body.textContent?.replace(/\s/g, "")).toContain("$500");
    expect(screen.getByText("5.00 esGMX")).toBeDefined();
  });

  it("uses an unpadded referral glyph in the boosts card and keeps the centered table icon", () => {
    renderTab();

    const referralBoostButton = screen.getByRole("button", { name: "Referral Boost" });
    expect(referralBoostButton.querySelector("svg")?.getAttribute("viewBox")).toBe("0 0 20 20");

    fireEvent.click(screen.getByRole("button", { name: "Activity Boosts" }));

    const referralVolumeRow = screen.getByRole("row", { name: /Referral Volume/ });
    expect(referralVolumeRow.querySelector("svg")?.getAttribute("viewBox")).toBe("0 0 28 28");
  });

  it("caps the projected multiplier transition at the configured maximum", () => {
    renderTab({ status: { ...status, multiplier: 990n } });

    const multiplierSummary = screen.getByTestId("rewards-current-multiplier");
    expect(multiplierSummary.textContent).toContain("9.9x");
    expect(multiplierSummary.textContent).toContain("10x");
    expect(within(multiplierSummary).getByTestId("multiplier-transition-arrow")).toBeDefined();
  });

  it("hides a projected multiplier transition when the capped value is unchanged", () => {
    renderTab({ status: { ...status, multiplier: config.maxMultiplier } });

    const multiplierSummary = screen.getByTestId("rewards-current-multiplier");
    expect(multiplierSummary.textContent).toContain("10x");
    expect(within(multiplierSummary).queryByTestId("multiplier-transition-arrow")).toBeNull();
  });

  it("shows multiplier transitions for tier downgrades and expirations", () => {
    const view = renderTab({
      status: {
        ...status,
        volumeTier: "Tier2",
        stakingTier: "Tier2",
        projectedVolumeTier: "Tier1",
        projectedStakingTier: "Tier1",
      },
    });

    let multiplierSummary = screen.getByTestId("rewards-current-multiplier");
    expect(multiplierSummary.textContent).toContain("1.75x");
    expect(multiplierSummary.textContent).toContain("1.35x");

    view.rerender(
      getTabNode({
        status: {
          ...status,
          projectedVolumeTier: null,
          projectedStakingTier: null,
        },
      })
    );

    multiplierSummary = screen.getByTestId("rewards-current-multiplier");
    expect(multiplierSummary.textContent).toContain("1.75x");
    expect(multiplierSummary.textContent).toContain("1.4x");
  });

  it("does not show a false downgrade while the persistent multiplier remains above the cap", () => {
    const cappedConfig: IncentivesConfig = {
      ...config,
      maxMultiplier: 100n,
    };
    const cappedStatus: AccountIncentiveStatus = {
      ...status,
      multiplier: 100n,
      volumeTier: "Tier2",
      projectedVolumeTier: "Tier1",
      stakingTier: null,
      projectedStakingTier: null,
      boostIds: ["LifetimeTrading"],
      manualRewardRemainingUsd: 0n,
    };
    const view = renderTab({ config: cappedConfig, status: cappedStatus });

    let multiplierSummary = screen.getByTestId("rewards-current-multiplier");
    expect(multiplierSummary.textContent).toContain("1x");
    expect(within(multiplierSummary).queryByTestId("multiplier-transition-arrow")).toBeNull();

    const belowCapConfig: IncentivesConfig = {
      ...cappedConfig,
      boosts: cappedConfig.boosts.map((boost) =>
        boost.boost === "LifetimeTrading" ? { ...boost, multiplier: 50n } : boost
      ),
    };
    view.rerender(getTabNode({ config: belowCapConfig, status: cappedStatus }));

    multiplierSummary = screen.getByTestId("rewards-current-multiplier");
    expect(multiplierSummary.textContent).toContain("1x");
    expect(multiplierSummary.textContent).toContain("0.75x");
    expect(within(multiplierSummary).getByTestId("multiplier-transition-arrow")).toBeDefined();
  });

  it("accepts the same account returned with different checksum casing", () => {
    renderTab({ account: SAME_ACCOUNT_DIFFERENT_CASE });

    expect(screen.getByTestId("rewards-current-multiplier").textContent).toContain("1.75x");
    expect(screen.queryByText("Your current status is temporarily unavailable.")).toBeNull();
  });

  it("opens Buy GMX in place or links to Stake GMX from the active staking card", () => {
    const view = renderTab();

    let stakingCard = screen.getByRole("heading", { name: "Supporter" }).closest(".group");
    fireEvent.click(within(stakingCard as HTMLElement).getByRole("button", { name: "Buy GMX" }));
    expect(screen.getByRole("button", { name: "Buy GMX on GMX swap" })).toBeDefined();

    mockUseRewardsVestingData.mockReturnValue(getVestingDataResult(5n * GMX_UNIT));
    view.rerender(getTabNode());

    stakingCard = screen.getByRole("heading", { name: "Supporter" }).closest(".group");
    expect(
      within(stakingCard as HTMLElement)
        .getByRole("link", { name: "Stake GMX" })
        .getAttribute("href")
    ).toBe(EARN_PORTFOLIO_STAKE_GMX_LINK);
  });

  it("opens Buy GMX in place from the inactive staking card", () => {
    renderTab({
      status: {
        ...status,
        stakingTier: null,
        projectedStakingTier: null,
      },
    });

    const stakingCard = screen.getByText("Staking Tier").closest(".group");
    fireEvent.click(within(stakingCard as HTMLElement).getByRole("button", { name: "Buy GMX" }));

    expect(screen.getByRole("button", { name: "Buy GMX on GMX swap" })).toBeDefined();
  });

  it("closes the Buy GMX modal when the account changes", async () => {
    const view = renderTab();
    const stakingCard = screen.getByRole("heading", { name: "Supporter" }).closest(".group");

    fireEvent.click(within(stakingCard as HTMLElement).getByRole("button", { name: "Buy GMX" }));
    expect(screen.getByRole("button", { name: "Buy GMX on GMX swap" })).toBeDefined();

    view.rerender(getTabNode({ account: OTHER_CHECKSUMMED_ACCOUNT }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Buy GMX on GMX swap" })).toBeNull());

    view.rerender(getTabNode());
    expect(screen.queryByRole("button", { name: "Buy GMX on GMX swap" })).toBeNull();
  });

  it("shows the concise tier descriptions without a show-more control", async () => {
    renderTab();

    expect(
      screen.getByText("Your epoch trading volume sets your Volume Tier and determines your multiplier.")
    ).toBeDefined();
    expect(screen.queryByRole("button", { name: "Show more" })).toBeNull();

    const volumeDetails = screen.getByRole("button", { name: "Volume Tier details" });
    fireEvent.mouseEnter(volumeDetails.closest(".Tooltip-handle")!);
    expect(
      await screen.findByText("A tier applies in the epoch it is achieved and for 4 following epochs.")
    ).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Staking Tiers" }));
    expect(
      screen.getByText("Your Staking Tier is based on staked GMX and determines your staking multiplier.")
    ).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Activity Boosts" }));
    expect(
      screen.getByText(
        "Activity Boosts are multiplier adjustments earned and applied exclusively to qualifying activity."
      )
    ).toBeDefined();
  });

  it("shows active and projected statuses for volume and staking tiers", () => {
    renderTab();

    const activeRow = screen.getByRole("row", { name: /Ranked.*Active/ });
    const projectedRow = screen.getByRole("row", { name: /Certified.*Next epoch/ });

    expect(within(activeRow).getByText("Active")).toBeDefined();
    expect(within(projectedRow).getByText("Next epoch")).toBeDefined();
    const multiplierWidth = screen.getByRole("columnheader", { name: "Multiplier" }).getAttribute("width");
    const statusWidth = screen.getByRole("columnheader", { name: "Status" }).getAttribute("width");

    fireEvent.click(screen.getByRole("button", { name: "Staking Tiers" }));

    expect(screen.getByRole("row", { name: /Supporter.*Active/ })).toBeDefined();
    expect(screen.getByRole("row", { name: /Advocate.*Next epoch/ })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "Status" })).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Activity Boosts" }));

    expect(screen.getByRole("columnheader", { name: "Boost" }).getAttribute("width")).toBe(multiplierWidth);
    expect(screen.getByRole("columnheader", { name: "Status" }).getAttribute("width")).toBe(statusWidth);
  });

  it("renders config-derived volume and staking targets", () => {
    const progressingStatus = {
      ...status,
      tierVolume: usd(3_000n),
      currentStakedBalance: 300n * GMX_UNIT,
    };

    renderTab({ status: progressingStatus });

    expect(document.body.textContent).toMatch(/Trade .* more to unlock Certified status/);
    expect(document.body.textContent).toContain("Increase your staked GMX balance by 200 to get Advocate status");
  });

  it("shows vestable esGMX with its unit and opens the rewards vesting flow", () => {
    renderTab();

    const summary = screen.getByTestId("rewards-vestable-summary");
    expect(summary.textContent).toContain("5.00 esGMX");
    expect(summary.textContent?.replace(/\s/g, "")).toContain("$10.00");
    expect(within(summary).getByRole("link", { name: "Start vesting" }).getAttribute("href")).toBe(
      "/rewards/history?vesting=start"
    );
  });

  it("shows a dash when vestable esGMX is known but its USD price is unavailable", () => {
    const vestingResult = getVestingDataResult();
    vestingResult.vestableEsGmxUsd = undefined;
    vestingResult.data = vestingResult.data ? { ...vestingResult.data, gmxPrice: undefined } : undefined;
    mockUseRewardsVestingData.mockReturnValue(vestingResult);

    renderTab();

    const summary = screen.getByTestId("rewards-vestable-summary");
    expect(summary.textContent).toContain("5.00 esGMX");
    expect(within(summary).getByText("-", { exact: true })).toBeDefined();
  });

  it("makes tier and featured-market details keyboard focusable", async () => {
    renderTab();

    expect(screen.getByRole("button", { name: "Volume Tier" })).toBeDefined();
    expect(screen.getAllByRole("button", { name: /Staking tier$/ })).toHaveLength(config.stakingTiers.length);
    expect(screen.getByRole("button", { name: "Supporter Staking tier" })).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Activity Boosts" }));
    const featuredMarketsButton = screen.getByRole("button", { name: /Featured markets:/ });
    expect(featuredMarketsButton).toBeDefined();

    fireEvent.mouseEnter(featuredMarketsButton.closest(".Tooltip-handle")!);
    expect((await screen.findByRole("link", { name: /GMX\/USD/ })).getAttribute("href")).toBe("/trade/long?market=GMX");
  });

  it("renders the config-derived maximum reward rate in the inactive staking banner", () => {
    const bannerConfig: IncentivesConfig = {
      ...config,
      esGmxShareFactor: PRECISION,
      gtShareFactor: PRECISION / 5n,
    };

    renderTab({
      config: bannerConfig,
      status: {
        ...status,
        stakingTier: null,
        projectedStakingTier: null,
      },
    });

    expect(screen.getByText(/Stake GMX and receive up to/).textContent).toContain(
      formatFactorPercentage(getMaxRewardRateFactor(bannerConfig))
    );
  });

  it("personalizes the inactive staking card and chooses the wallet action", () => {
    mockUseRewardsVestingData.mockReturnValue(getVestingDataResult(5n * GMX_UNIT));
    mockUseRewardsPromoActivity.mockReturnValue({
      data: {
        netPositionFeeUsd: usd(100n),
        firstTradeTimestamp: Math.floor(Date.now() / 1000) - 15 * 24 * 60 * 60,
      },
      error: undefined,
      loading: false,
      endpoint: "https://example.com/graphql",
    });

    renderTab({
      status: {
        ...status,
        stakingTier: null,
        projectedStakingTier: null,
        manualRewardRemainingUsd: 0n,
      },
    });

    const stakingCard = screen.getByText(/With your recent activity, staking GMX could have earned/).closest(".group");
    expect(stakingCard).not.toBeNull();
    expect(
      within(stakingCard as HTMLElement)
        .getByRole("link", { name: /^Stake GMX/ })
        .getAttribute("href")
    ).toBe(EARN_PORTFOLIO_STAKE_GMX_LINK);
    expect(mockUseRewardsPromoActivity).toHaveBeenLastCalledWith(ARBITRUM, {
      account: CHECKSUMMED_ACCOUNT,
      enabled: true,
    });
  });

  it("waits for the wallet GMX balance before choosing Buy or Stake, then shows Stake", () => {
    const inactiveStatus = {
      ...status,
      stakingTier: null,
      projectedStakingTier: null,
      manualRewardRemainingUsd: 0n,
    };
    mockUseRewardsVestingData.mockReturnValue({
      data: undefined,
      vestableEsGmx: undefined,
      vestableEsGmxUsd: undefined,
      isLoading: true,
      error: undefined,
      mutate: vi.fn(),
    });
    const view = renderTab({ status: inactiveStatus });

    expect(screen.queryByRole("button", { name: "Buy GMX" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Stake GMX" })).toBeNull();

    mockUseRewardsVestingData.mockReturnValue(getVestingDataResult(5n * GMX_UNIT));
    view.rerender(getTabNode({ status: inactiveStatus }));

    const stakingCard = screen.getByText("Staking Tier").closest(".group");
    expect(
      within(stakingCard as HTMLElement)
        .getByRole("link", { name: "Stake GMX" })
        .getAttribute("href")
    ).toBe(EARN_PORTFOLIO_STAKE_GMX_LINK);
    expect(screen.queryByRole("button", { name: "Buy GMX" })).toBeNull();
  });

  it("uses the staking action when the wallet GMX balance is unavailable", () => {
    mockUseRewardsVestingData.mockReturnValue({
      data: undefined,
      vestableEsGmx: undefined,
      vestableEsGmxUsd: undefined,
      isLoading: false,
      error: new Error("RPC unavailable"),
      mutate: vi.fn(),
    });

    renderTab({
      status: {
        ...status,
        stakingTier: null,
        projectedStakingTier: null,
        manualRewardRemainingUsd: 0n,
      },
    });

    expect(screen.getByRole("link", { name: "Stake GMX" }).getAttribute("href")).toBe(EARN_PORTFOLIO_STAKE_GMX_LINK);
    expect(screen.queryByRole("button", { name: "Buy GMX" })).toBeNull();
  });

  it("does not flash anonymous staking content while the wallet is restoring", () => {
    mockUseWallet.mockReturnValue({
      account: undefined,
      status: "disconnected",
      active: false,
      chainId: ARBITRUM,
    } as ReturnType<typeof useWallet>);
    mockUseIsWalletInitializing.mockReturnValue(true);

    renderTab({
      account: undefined,
      status: undefined,
    });

    expect(screen.queryByText("Stake to Boost Rewards")).toBeNull();
    expect(screen.queryByText(/Stake GMX and receive up to/)).toBeNull();
    expect(screen.queryByTestId("rewards-promotional-banners")).toBeNull();
  });

  it("keeps the generic staking copy for manual allocations without loading promo activity", () => {
    mockUseRewardsPromoActivity.mockReturnValue({
      data: {
        netPositionFeeUsd: usd(100n),
        firstTradeTimestamp: Math.floor(Date.now() / 1000) - 15 * 24 * 60 * 60,
      },
      error: undefined,
      loading: false,
      endpoint: "https://example.com/graphql",
    });

    renderTab({
      status: {
        ...status,
        stakingTier: null,
        projectedStakingTier: null,
      },
    });

    expect(screen.getByText(/Stake GMX and receive up to .* of your fees back/)).toBeDefined();
    expect(screen.queryByText(/With your recent activity, staking GMX could have earned/)).toBeNull();
    expect(mockUseRewardsPromoActivity).toHaveBeenLastCalledWith(ARBITRUM, {
      account: CHECKSUMMED_ACCOUNT,
      enabled: false,
    });
  });

  it("labels staking progress as GMX staked", async () => {
    renderTab({
      status: {
        ...status,
        currentStakedBalance: 499n * GMX_UNIT + (6n * GMX_UNIT) / 10n,
      },
    });

    const stakingCard = screen.getByRole("heading", { name: "Supporter" }).closest(".group");
    const tierProgress = within(stakingCard as HTMLElement).getByRole("progressbar", {
      name: "Staking tier levels",
    });
    const tierGroup = within(stakingCard as HTMLElement).getByRole("group", { name: "Staking tiers" });
    const nextTierSegment = within(tierGroup)
      .getByRole("button", { name: "Advocate Staking tier" })
      .closest(".Tooltip");

    expect(tierProgress).toBeDefined();
    expect(nextTierSegment).not.toBeNull();
    expect(within(stakingCard as HTMLElement).getByText(/GMX staked:/).textContent).toContain("499");
    expect(stakingCard?.textContent).not.toContain("499.6");
    fireEvent.mouseEnter(nextTierSegment as Element);

    await waitFor(() => {
      const tooltip = document.querySelector(".Tooltip-popup");
      expect(tooltip).not.toBeNull();
      expect(tooltip!.textContent).toContain("Staked: 499 / 500 GMX");
      expect(tooltip!.textContent).not.toContain("esGMX");
    });
  });

  it("labels staking tier table thresholds in GMX", () => {
    renderTab();

    fireEvent.click(screen.getByRole("button", { name: "Staking Tiers" }));

    expect(screen.getByRole("columnheader", { name: "GMX staked" })).toBeDefined();
    expect(screen.getByRole("row", { name: /Supporter.*100 GMX/ })).toBeDefined();
    expect(screen.queryByText(/100 GMX \+ esGMX/)).toBeNull();
  });

  it("renders config-derived activity boost levels", () => {
    renderTab({
      status: {
        ...status,
        boostIds: ["FeaturedMarkets", "LifetimeTrading", "ManualAllocation"],
      },
    });

    fireEvent.click(screen.getByRole("button", { name: "Activity Boosts" }));

    const featuredMarketsRow = screen.getByRole("row", { name: /Featured Markets/ });
    const balancingTradesRow = screen.getByRole("row", { name: /Balancing Trades/ });
    const lifetimeVolumeRow = screen.getByRole("row", { name: /Lifetime Volume/ });
    const returnBonusRow = screen.getByRole("row", { name: /Return Bonus/ });
    const referralVolumeRow = screen.getByRole("row", { name: /Referral Volume/ });

    expect(screen.getByRole("columnheader", { name: "Boost" })).toBeDefined();
    expect(screen.queryByRole("columnheader", { name: "Multiplier" })).toBeNull();
    expect(featuredMarketsRow.textContent).toContain("GMX");
    expect(within(featuredMarketsRow).getByText("+0.25x")).toBeDefined();
    expect(within(featuredMarketsRow).getByText("Qualified this epoch")).toBeDefined();
    expect(featuredMarketsRow.textContent).toContain(
      "Trade featured markets to activate this boost and earn a higher multiplier for those trades."
    );
    expect(normalizeText(balancingTradesRow.textContent)).toContain(
      normalizeText(
        "Place balancing position increases ($10K+) on underutilized sides to earn an additional multiplier on those trades."
      )
    );
    expect(within(balancingTradesRow).getByText("+0.5x")).toBeDefined();
    expect(within(balancingTradesRow).getByText("Not qualified this epoch")).toBeDefined();
    expect(normalizeText(lifetimeVolumeRow.textContent)).toContain(
      normalizeText("Reach $1M+ in lifetime trading volume to unlock a permanent 1× multiplier.")
    );
    expect(within(lifetimeVolumeRow).getByText("+1x")).toBeDefined();
    expect(within(lifetimeVolumeRow).getByText("Active")).toBeDefined();
    expect(within(returnBonusRow).getByText("+2x")).toBeDefined();
    expect(within(returnBonusRow).getByText("Active")).toBeDefined();
    expect(returnBonusRow.textContent).toContain(
      "Available to eligible historical users until the incremental reward cap is consumed."
    );
    expect(referralVolumeRow.textContent).toContain("Receive 50% of the rewards earned by every trader you invite.");
    expect(within(referralVolumeRow).getByText("50% of rewards")).toBeDefined();
    expect(within(referralVolumeRow).getByText("Active")).toBeDefined();
    expect(referralVolumeRow.querySelector("svg path")?.getAttribute("fill")).toBe("#7885FF");
  });

  it("uses the inactive referral icon without referral volume", () => {
    renderTab({
      status: {
        ...status,
        referralVolume: 0n,
      },
    });

    fireEvent.click(screen.getByRole("button", { name: "Activity Boosts" }));

    const referralVolumeRow = screen.getByRole("row", { name: /Referral Volume/ });
    expect(within(referralVolumeRow).getByText("Inactive")).toBeDefined();
    expect(referralVolumeRow.querySelector("svg path")?.getAttribute("fill")).toBe("#A0A3C4");
  });

  it("marks the Return Bonus inactive when its incremental reward cap is consumed", () => {
    renderTab({
      status: {
        ...status,
        boostIds: ["ManualAllocation"],
        manualRewardRemainingUsd: 0n,
      },
    });

    fireEvent.click(screen.getByRole("button", { name: "Activity Boosts" }));

    const returnBonusRow = screen.getByRole("row", { name: /Return Bonus/ });
    expect(within(returnBonusRow).getByText("Inactive")).toBeDefined();
  });

  it("shows active boosts first without adding the Referral Boost to the multiplier", () => {
    renderTab({
      status: {
        ...status,
        boostIds: ["LifetimeTrading", "ManualAllocation"],
      },
    });

    const boostsHeading = screen.getByRole("heading", { name: "3 active boosts" });
    const boostsCard = boostsHeading.closest(".group");
    expect(boostsCard).toBeDefined();
    expect(within(boostsCard as HTMLElement).getByText("3x")).toBeDefined();
    expect(
      within(boostsCard as HTMLElement)
        .getAllByRole("button")
        .map((button) => button.getAttribute("aria-label"))
    ).toEqual(["Lifetime Volume", "Return Bonus", "Referral Boost", "Featured Markets", "Balancing Trades"]);
    expect(within(boostsCard as HTMLElement).queryByText("1 qualified this epoch")).toBeNull();
  });

  it("uses muted text for the Referral Boost description", async () => {
    renderTab();

    const referralBoost = screen.getByRole("button", { name: "Referral Boost" });
    fireEvent.mouseEnter(referralBoost);

    const description = await screen.findByText("Receive 50% of the rewards earned by every trader you invite.");
    expect(description.className).toContain("text-typography-secondary");
  });

  it("restores the V1 activity boost descriptions in the summary card", async () => {
    renderTab();

    fireEvent.mouseEnter(screen.getByRole("button", { name: "Featured Markets" }));
    await expectTooltipText(
      "Trade featured markets to activate this boost and earn a higher multiplier for those trades."
    );

    fireEvent.mouseEnter(screen.getByRole("button", { name: "Balancing Trades" }));
    await expectTooltipText(
      "Place balancing position increases ($10K+) on underutilized sides to earn an additional multiplier on those trades."
    );

    fireEvent.mouseEnter(screen.getByRole("button", { name: "Lifetime Volume" }));
    await expectTooltipText("Reach $1M+ in lifetime trading volume to unlock a permanent 1× multiplier.");
  });

  it("uses the configured lifetime boost multiplier in its description", async () => {
    renderTab({
      config: {
        ...config,
        boosts: config.boosts.map((boost) =>
          boost.boost === "LifetimeTrading" ? { ...boost, multiplier: 150n } : boost
        ),
      },
    });

    fireEvent.mouseEnter(screen.getByRole("button", { name: "Lifetime Volume" }));
    await expectTooltipText("Reach $1M+ in lifetime trading volume to unlock a permanent 1.5× multiplier.");
  });

  it("uses active and inactive referral artwork in the boosts card", () => {
    const view = renderTab();

    let referralBoost = screen.getByRole("button", { name: "Referral Boost" });
    expect(referralBoost.querySelector("svg path")?.getAttribute("fill")).toBe("#7885FF");

    view.rerender(
      getTabNode({
        status: {
          ...status,
          boostIds: ["LifetimeTrading"],
          referralVolume: 0n,
        },
      })
    );

    referralBoost = screen.getByRole("button", { name: "Referral Boost" });
    expect(referralBoost.querySelector("svg path")?.getAttribute("fill")).toBe("#A0A3C4");
  });

  it("places active tier cards before banner cards while preserving their default order", () => {
    renderTab({
      status: {
        ...status,
        volumeTier: null,
        projectedVolumeTier: null,
        boostIds: ["LifetimeTrading"],
        referralVolume: 0n,
        manualRewardRemainingUsd: 0n,
      },
    });

    const stakingCard = screen.getByRole("heading", { name: "Supporter" }).closest(".group");
    const boostsCard = screen.getByRole("heading", { name: "1 active boost" }).closest(".group");
    const volumeCard = screen.getByText("Volume Tier").closest(".group");

    expect(stakingCard?.parentElement).toBe(volumeCard?.parentElement);
    expect(boostsCard?.parentElement).toBe(volumeCard?.parentElement);
    expect(Array.from(volumeCard!.parentElement!.children)).toEqual([stakingCard, boostsCard, volumeCard]);
  });

  it("uses the live staking tier for progress and the next target after a multi-tier jump", () => {
    const multiTierConfig: IncentivesConfig = {
      ...config,
      stakingTiers: [
        { tier: "Tier1", threshold: 100n * GMX_UNIT, multiplier: 10n },
        { tier: "Tier2", threshold: 500n * GMX_UNIT, multiplier: 25n },
        { tier: "Tier3", threshold: 1_000n * GMX_UNIT, multiplier: 50n },
        { tier: "Tier4", threshold: 2_000n * GMX_UNIT, multiplier: 75n },
      ],
    };

    renderTab({
      config: multiTierConfig,
      status: {
        ...status,
        stakingTier: "Tier1",
        projectedStakingTier: "Tier3",
        currentStakedBalance: 1_200n * GMX_UNIT,
      },
    });

    const stakingHeading = screen.getByRole("heading", { name: "Supporter" });
    const stakingCard = stakingHeading.closest(".group");
    expect(stakingCard).toBeDefined();
    expect(stakingCard!.textContent).toContain("0.1x →0.5x");
    expect(stakingCard!.textContent).toContain("Increase your staked GMX balance by 800 to get Steward status");

    const tierProgress = within(stakingCard as HTMLElement).getByRole("progressbar", {
      name: "Staking tier levels",
    });
    expect(tierProgress.getAttribute("aria-valuenow")).toBe("3");
    expect(tierProgress.getAttribute("aria-valuemax")).toBe("4");
  });

  it("renders config-derived reward economics", () => {
    renderTab();

    fireEvent.click(screen.getByRole("button", { name: "How does it work?" }));
    expect(document.body.textContent).toContain("Trade & Stake to Earn Your Tiers");
    expect(document.body.textContent).toContain("Your weekly trading volume sets your volume tier");
    expect(document.body.textContent).toContain(
      `You receive ${formatFactorPercentage(config.esGmxShareFactor)} of your rewards in esGMX`
    );
    expect(document.body.textContent).toContain(
      `plus an additional ${formatFactorPercentage(config.gtShareFactor)} in GT tokens`
    );

    fireEvent.click(screen.getByRole("button", { name: "How long does a volume tier remain active?" }));
    expect(document.body.textContent).toContain(
      "A tier applies in the epoch it is achieved and for 4 following epochs."
    );

    fireEvent.click(screen.getByRole("button", { name: "How are rewards calculated?" }));

    expect(screen.getByText("Eligible fee share").parentElement?.textContent).toContain(
      formatFactorPercentage(config.feeShareFactor)
    );
    expect(screen.getByText("esGMX allocation share").parentElement?.textContent).toContain(
      formatFactorPercentage(config.esGmxShareFactor)
    );
    expect(screen.getByText("GT allocation share").parentElement?.textContent).toContain(
      formatFactorPercentage(config.gtShareFactor)
    );
    expect(screen.getByText("Maximum multiplier").parentElement?.textContent).toContain(
      formatMultiplier(config.maxMultiplier, config.multiplierDecimals)
    );
    expect(screen.getByText("Maximum combined reward per eligible fee").parentElement?.textContent).toContain(
      formatFactorPercentage(getMaxRewardRateFactor(config))
    );
  });

  it("shows projected downgrade details without marking unavailable data inactive", () => {
    vi.spyOn(Date, "now").mockReturnValue((config.epochTimestamp + 1_000) * 1000);
    renderTab({
      status: {
        ...status,
        volumeTier: "Tier2",
        projectedVolumeTier: "Tier1",
        tierVolume: usd(3_000n),
      },
    });

    expect(screen.getByRole("row", { name: /Certified.*Expires in/ })).toBeDefined();
    expect(screen.getByRole("row", { name: /Ranked.*Next epoch/ })).toBeDefined();
    expect(document.body.textContent).toContain("0.5x →0.25x");
    expect(document.body.textContent).toMatch(/Trade .* more to keep Certified status/);
    expect(screen.queryByText("Max tier reached ✓")).toBeNull();

    cleanup();
    renderTab({ status: undefined, statusUnavailable: true });

    expect(screen.getAllByText("Your current status is temporarily unavailable.")).toHaveLength(3);
    expect(screen.queryByText("Inactive")).toBeNull();
    expect(screen.queryByText("Trade More. Earn More.")).toBeNull();
  });
});
