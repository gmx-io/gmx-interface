import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "config/chains";
import { ES_GMX_DECIMALS, GT_DECIMALS } from "domain/synthetics/incentives/v2/constants";
import type { AccountIncentiveStatus, IncentivesConfig, LeaderboardEntry } from "domain/synthetics/incentives/v2/types";
import {
  formatFactorPercentage,
  formatMultiplier,
  getMaxRewardRateFactor,
} from "domain/synthetics/incentives/v2/utils";
import { formatUsd, PRECISION } from "lib/numbers";

import { RewardsTiersTab } from "../RewardsTiersTab";

vi.mock("components/AppCard/AppCard", () => ({
  AppCard: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
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
const GMX_UNIT = 10n ** BigInt(ES_GMX_DECIMALS);
const GT_UNIT = 10n ** BigInt(GT_DECIMALS);

function usd(value: bigint) {
  return value * PRECISION;
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

function renderTab(overrides: Partial<RewardsTiersTabProps> = {}) {
  return render(
    <I18nProvider i18n={i18n}>
      <MemoryRouter>
        <RewardsTiersTab {...defaultProps} {...overrides} />
      </MemoryRouter>
    </I18nProvider>
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
});

describe("RewardsTiersTab", () => {
  it("does not render account zeros or inactive statuses while disconnected", () => {
    renderTab({ account: undefined });

    expect(screen.getByText("All-time Rewards")).toBeDefined();
    expect(document.body.textContent).not.toContain(formatUsd(0n, { fallbackToZero: true }));
    expect(screen.queryByText("Inactive")).toBeNull();
    expect(screen.queryByText("0 qualified this epoch")).toBeNull();
  });

  it("distinguishes active and projected volume tiers", () => {
    renderTab();

    const activeRow = screen.getByRole("row", { name: /Ranked.*Active/ });
    const projectedRow = screen.getByRole("row", { name: /Certified.*Next epoch/ });

    expect(within(activeRow).getByText("Active")).toBeDefined();
    expect(within(projectedRow).getByText("Next epoch")).toBeDefined();
  });

  it("keeps volume, staking, and activity cards in the designed order", () => {
    renderTab({
      status: {
        ...status,
        volumeTier: null,
        projectedVolumeTier: null,
        boostIds: [],
        manualRewardRemainingUsd: 0n,
      },
    });

    const volumeCard = screen.getByText("Volume Tier").closest(".group");
    const stakingCard = screen.getByText("Staking Tier").closest(".group");
    const activityCard = screen.getByText("Activity Boost").closest(".group");

    expect(volumeCard).not.toBeNull();
    expect(stakingCard).not.toBeNull();
    expect(activityCard).not.toBeNull();
    expect(volumeCard!.compareDocumentPosition(stakingCard!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(stakingCard!.compareDocumentPosition(activityCard!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("renders config-derived volume and staking targets", () => {
    const progressingStatus = {
      ...status,
      tierVolume: usd(3_000n),
      currentStakedBalance: 300n * GMX_UNIT,
    };

    renderTab({ status: progressingStatus });

    expect(document.body.textContent).toMatch(/Trade .* more to unlock Certified status/);
    expect(document.body.textContent).toContain(
      "Increase your staked GMX or esGMX balance by 200 to get Advocate status"
    );
  });

  it("prefixes multiplier adjustments with a plus sign", () => {
    renderTab();

    expect(screen.getAllByText("+0.25x").length).toBeGreaterThan(0);
    expect(screen.getAllByText("+0.5x").length).toBeGreaterThan(0);
  });

  it("labels trade-specific boosts as qualified this epoch instead of active", () => {
    renderTab({
      status: {
        ...status,
        boostIds: ["FeaturedMarkets"],
        manualRewardCapUsd: 0n,
        manualRewardRemainingUsd: 0n,
      },
    });

    expect(screen.getByRole("heading", { name: "1 qualified this epoch" })).toBeDefined();
    expect(screen.queryByRole("heading", { name: /active boost/ })).toBeNull();
  });

  it("includes manual allocation in the summed persistent boost badge", () => {
    renderTab({
      status: {
        ...status,
        boostIds: ["LifetimeTrading", "ManualAllocation"],
      },
    });

    const boostsHeading = screen.getByRole("heading", { name: "2 active boosts" });
    const boostsCard = boostsHeading.closest(".group");
    expect(boostsCard).toBeDefined();
    expect(within(boostsCard as HTMLElement).getByText("3x")).toBeDefined();
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
    expect(stakingCard!.textContent).toContain(
      "Increase your staked GMX or esGMX balance by 800 to get Steward status"
    );

    const tierProgress = within(stakingCard as HTMLElement).getByRole("progressbar", {
      name: "Staking tier levels",
    });
    expect(tierProgress.getAttribute("aria-valuenow")).toBe("3");
    expect(tierProgress.getAttribute("aria-valuemax")).toBe("4");
  });

  it("renders config-derived reward economics", () => {
    renderTab();
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

  it("does not render the removed account sidebar sections", () => {
    renderTab();

    expect(screen.queryByText("Current status")).toBeNull();
    expect(screen.queryByText("Current epoch rewards")).toBeNull();
    expect(screen.queryByText("Activity boosts")).toBeNull();
    expect(screen.queryByRole("button", { name: "Activity Boosts" })).toBeNull();
    expect(screen.queryByText("Manual allocation")).toBeNull();
    expect(screen.queryByText("Manual allocation ranges")).toBeNull();
    expect(screen.queryByText("Consumed")).toBeNull();
    expect(screen.queryByText("Provisional")).toBeNull();
  });
});
