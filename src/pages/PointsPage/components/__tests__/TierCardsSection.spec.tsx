/* eslint-disable react-perf/jsx-no-new-object-as-prop */
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, afterEach } from "vitest";

import type { EpochStats, IncentivesConfig } from "domain/synthetics/incentives/types";

// SVG imports need to be mocked for happy-dom

vi.mock("img/ic_boost.svg?react", () => ({
  default: (props: any) => <svg data-testid="boost-icon" {...props} />,
}));
vi.mock("img/ic_multiplier.svg?react", () => ({
  default: (props: any) => <svg data-testid="multiplier-icon" {...props} />,
}));
vi.mock("img/ic_points.svg?react", () => ({
  default: (props: any) => <svg data-testid="points-icon" {...props} />,
}));
vi.mock("img/ic_staking.svg?react", () => ({
  default: (props: any) => <svg data-testid="staking-icon" {...props} />,
}));

const stakingDataMock = vi.hoisted(() => ({
  data: {
    gmxInStakedGmx: 50n * 10n ** 18n,
    gmxBalance: 0n,
  },
}));

vi.mock("domain/stake/useStakingProcessedData", () => ({
  useStakingProcessedData: () => ({
    data: stakingDataMock.data,
  }),
}));

const walletMock = vi.hoisted(() => ({
  account: undefined as string | undefined,
}));

vi.mock("lib/wallets/useWallet", () => ({
  default: () => ({ account: walletMock.account }),
}));

const personalizedBannerDataMock = vi.hoisted(() => ({
  data: {
    bannerVariant: "new-or-low-fees" as "manual-reward" | "recent-activity" | "new-or-low-fees" | undefined,
    isManuallyRewarded: false,
    hasVolumeAfterFirstProgramEpoch: false,
    manualAllocatedPoints: undefined as bigint | undefined,
    manualBonusUsd: undefined as bigint | undefined,
    estimatedRewardsUsd: undefined as number | undefined,
    isLoading: false,
  },
}));

vi.mock("domain/synthetics/incentives/usePersonalizedBannerData", () => ({
  usePersonalizedBannerData: () => personalizedBannerDataMock.data,
}));

// Mock TooltipWithPortal to render its handle and content inline
vi.mock("components/Tooltip/TooltipWithPortal", () => ({
  default: ({ handle, content }: { handle: React.ReactNode; content: React.ReactNode }) => (
    <div data-testid="tooltip">
      <div data-testid="tooltip-handle">{handle}</div>
      <div data-testid="tooltip-content">{content}</div>
    </div>
  ),
}));

// Import after mocks
import { TierCardsSection } from "../TierCardsSection";

i18n.load({ en: {} });
i18n.activate("en");

const USD = 10n ** 30n;
const GMX_DEC = 10n ** 18n;

const mockConfig: IncentivesConfig = {
  programStartTimestamp: 1699500000,
  epochTimestamp: 1700000000,
  epochStartTimestamp: 1699900000,
  epochDuration: 604800,
  maxMultiplier: 400,
  multiplierDecimals: 100,
  volumeTierPersistenceEpochs: 4,
  pointsExpirationEpochs: 13,
  basePointsFactor: 1000000000000000000n,
  pointsToGmxFactor: 1000000000000000000n,
  volumeTiers: [
    { tier: "Tier1", threshold: 2000n * USD, multiplier: 25 },
    { tier: "Tier2", threshold: 5000n * USD, multiplier: 50 },
    { tier: "Tier3", threshold: 10000n * USD, multiplier: 100 },
    { tier: "Tier4", threshold: 20000n * USD, multiplier: 150 },
  ],
  stakingTiers: [
    { tier: "Tier1", threshold: 10n * GMX_DEC, multiplier: 25 },
    { tier: "Tier2", threshold: 100n * GMX_DEC, multiplier: 50 },
    { tier: "Tier3", threshold: 1000n * GMX_DEC, multiplier: 100 },
  ],
  boosts: [
    { boost: "FeaturedMarkets", multiplier: 50 },
    { boost: "BalancingTrades", multiplier: 50 },
    { boost: "LifetimeTrading", multiplier: 100 },
  ],
  balancingTradesThreshold: 1_000_000n * USD,
  lifetimeVolumeThreshold: 200_000_000n * USD,
  downgradingCoefficients: {},
  featuredMarketTokens: [],
};

function renderWithI18n(ui: React.ReactElement) {
  return render(
    <I18nProvider i18n={i18n}>
      <MemoryRouter>{ui}</MemoryRouter>
    </I18nProvider>
  );
}

afterEach(() => {
  stakingDataMock.data = {
    gmxInStakedGmx: 50n * GMX_DEC,
    gmxBalance: 0n,
  };
  walletMock.account = undefined;
  personalizedBannerDataMock.data = {
    bannerVariant: "new-or-low-fees",
    isManuallyRewarded: false,
    hasVolumeAfterFirstProgramEpoch: false,
    manualAllocatedPoints: undefined,
    manualBonusUsd: undefined,
    estimatedRewardsUsd: undefined,
    isLoading: false,
  };
  cleanup();
});

describe("TierCardsSection", () => {
  describe("VolumeBanner (inactive volume card)", () => {
    it("shows first volume tier threshold from config", () => {
      renderWithI18n(<TierCardsSection config={mockConfig} currentEpochStats={undefined} />);

      // First tier threshold is $2,000 => formatAmountHuman renders "$⁠2k" (with thin space)
      expect(screen.getByText(/2k/i)).toBeDefined();
    });

    it("shows first tier name from config (Ranked for Tier1)", () => {
      renderWithI18n(<TierCardsSection config={mockConfig} currentEpochStats={undefined} />);

      expect(screen.getByText(/Ranked/)).toBeDefined();
    });

    it("shows first tier multiplier from config", () => {
      renderWithI18n(<TierCardsSection config={mockConfig} currentEpochStats={undefined} />);

      const allText = document.body.textContent || "";
      expect(allText).toContain("0.25x");
    });

    it("shows calculated rewards estimate", () => {
      renderWithI18n(<TierCardsSection config={mockConfig} currentEpochStats={undefined} />);

      // Both volume and staking banners contain "additional trading rewards"
      const elements = screen.getAllByText(/additional trading rewards/);
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("StakingBanner (inactive staking card)", () => {
    it('shows static "Stake to Boost Points" copy when wallet not connected', () => {
      walletMock.account = undefined;

      renderWithI18n(<TierCardsSection config={mockConfig} currentEpochStats={undefined} />);

      expect(screen.getByText(/Stake to Boost Points/)).toBeDefined();
      expect(screen.getByText(/up to 50% of your fees as rewards/)).toBeDefined();
    });

    it('shows static "Stake to Boost Points" copy while personalized data is loading', () => {
      walletMock.account = "0xAccount";
      personalizedBannerDataMock.data = {
        ...personalizedBannerDataMock.data,
        bannerVariant: undefined,
        isLoading: true,
      };

      renderWithI18n(<TierCardsSection config={mockConfig} currentEpochStats={undefined} />);

      expect(screen.getByText(/Stake to Boost Points/)).toBeDefined();
    });

    it("falls through to new-or-low-fees copy when bannerVariant is manual-reward (skipping the Tradebox-only redeem message)", () => {
      walletMock.account = "0xAccount";
      personalizedBannerDataMock.data = {
        ...personalizedBannerDataMock.data,
        bannerVariant: "manual-reward",
        isManuallyRewarded: true,
        manualBonusUsd: 200n * USD,
      };

      renderWithI18n(<TierCardsSection config={mockConfig} currentEpochStats={undefined} />);

      expect(screen.queryByText(/You've received bonus of/)).toBeNull();
      expect(screen.queryByText(/Start trading to redeem your rewards/)).toBeNull();
      expect(screen.getByText(/Earn rewards/)).toBeDefined();
      expect(screen.getByText(/Stake GMX and receive 50% of your fees back/)).toBeDefined();
    });

    it("shows recent-activity copy when connected and bannerVariant is recent-activity", () => {
      walletMock.account = "0xAccount";
      personalizedBannerDataMock.data = {
        ...personalizedBannerDataMock.data,
        bannerVariant: "recent-activity",
        estimatedRewardsUsd: 250,
      };

      renderWithI18n(<TierCardsSection config={mockConfig} currentEpochStats={undefined} />);

      expect(screen.getByText(/With your recent activity, staking/)).toBeDefined();
      expect(screen.getByText(/\$250 in rewards/)).toBeDefined();
    });

    it("shows new-or-low-fees copy when connected and bannerVariant is new-or-low-fees", () => {
      walletMock.account = "0xAccount";
      personalizedBannerDataMock.data = {
        ...personalizedBannerDataMock.data,
        bannerVariant: "new-or-low-fees",
      };

      renderWithI18n(<TierCardsSection config={mockConfig} currentEpochStats={undefined} />);

      expect(screen.getByText(/Earn rewards/)).toBeDefined();
      expect(screen.getByText(/Stake GMX and receive 50% of your fees back/)).toBeDefined();
    });

    it("prompts to buy GMX when the wallet has no GMX", () => {
      stakingDataMock.data = {
        gmxInStakedGmx: 0n,
        gmxBalance: 0n,
      };

      renderWithI18n(<TierCardsSection config={mockConfig} currentEpochStats={undefined} />);

      expect(screen.getByText("Buy GMX")).toBeDefined();
    });

    it("prompts to stake GMX when the wallet has GMX", () => {
      stakingDataMock.data = {
        gmxInStakedGmx: 0n,
        gmxBalance: 10n * GMX_DEC,
      };

      renderWithI18n(<TierCardsSection config={mockConfig} currentEpochStats={undefined} />);

      expect(screen.getByText("Stake GMX")).toBeDefined();
    });
  });

  describe("when config is undefined/loading", () => {
    it("shows ... placeholders", () => {
      const { container } = renderWithI18n(<TierCardsSection config={undefined} currentEpochStats={undefined} />);

      // When config is undefined, the banners render "..." for threshold/tier/multiplier values.
      // These "..." may be embedded inside Trans-rendered text, so check the full text content.
      const allText = container.textContent || "";
      expect(allText).toContain("...");
    });
  });

  describe("active volume card", () => {
    it("shows correct progress bar and 'Trade $X to unlock...' text", () => {
      const currentEpochStats: EpochStats = {
        account: "0x1234",
        multiplier: 125,
        epochTimestamp: 1700000000,
        volumeTier: "Tier1",
        stakingTier: null,
        tradedVolume: 3000n * USD, // $3,000
        boostIds: [],
      };

      renderWithI18n(<TierCardsSection config={mockConfig} currentEpochStats={currentEpochStats} />);

      // Should show "Volume this epoch:" with current volume
      expect(screen.getByText(/Volume this epoch/)).toBeDefined();

      // Next tier (Tier2) threshold = $5000 => compact display renders "$5K"
      expect(screen.getByText(/5K/)).toBeDefined();
      expect(screen.getByText(/Certified/)).toBeDefined();
    });
  });

  describe("active staking card", () => {
    it("shows segmented progress bar", () => {
      const currentEpochStats: EpochStats = {
        account: "0x1234",
        multiplier: 150,
        epochTimestamp: 1700000000,
        volumeTier: null,
        stakingTier: "Tier1",
        tradedVolume: 0n,
        boostIds: [],
      };

      const { container } = renderWithI18n(
        <TierCardsSection config={mockConfig} currentEpochStats={currentEpochStats} />
      );

      // Staking progress bar has multiple segments (one per tier)
      // There should be 3 segments for 3 staking tiers
      // Each segment is a div with relative flex-1 and bg-slate-700 class
      const segments = container.querySelectorAll(".bg-slate-700");
      expect(segments.length).toBeGreaterThanOrEqual(3);
    });

    it("prompts to buy GMX when wallet GMX is not enough for the next tier", () => {
      stakingDataMock.data = {
        gmxInStakedGmx: 25n * GMX_DEC,
        gmxBalance: 50n * GMX_DEC,
      };

      const currentEpochStats: EpochStats = {
        account: "0x1234",
        multiplier: 150,
        epochTimestamp: 1700000000,
        volumeTier: null,
        stakingTier: "Tier1",
        tradedVolume: 0n,
        boostIds: [],
      };

      renderWithI18n(<TierCardsSection config={mockConfig} currentEpochStats={currentEpochStats} />);

      const allText = document.body.textContent || "";
      expect(allText).toContain("Stake 75 GMX more to get Advocate status +0.5x");
      expect(screen.getByText("Buy GMX")).toBeDefined();
    });

    it("prompts to stake the missing GMX amount when wallet GMX reaches the next tier requirement", () => {
      stakingDataMock.data = {
        gmxInStakedGmx: 25n * GMX_DEC,
        gmxBalance: 75n * GMX_DEC,
      };

      const currentEpochStats: EpochStats = {
        account: "0x1234",
        multiplier: 150,
        epochTimestamp: 1700000000,
        volumeTier: null,
        stakingTier: "Tier1",
        tradedVolume: 0n,
        boostIds: [],
      };

      renderWithI18n(<TierCardsSection config={mockConfig} currentEpochStats={currentEpochStats} />);

      const allText = document.body.textContent || "";
      expect(allText).toContain("Stake 75 GMX more to get Advocate status +0.5x");
      expect(screen.getByText("Stake 75 GMX")).toBeDefined();
    });

    it("hides next tier target copy and CTA on the last staking tier", () => {
      stakingDataMock.data = {
        gmxInStakedGmx: 1000n * GMX_DEC,
        gmxBalance: 5000n * GMX_DEC,
      };

      const currentEpochStats: EpochStats = {
        account: "0x1234",
        multiplier: 150,
        epochTimestamp: 1700000000,
        volumeTier: null,
        stakingTier: "Tier3",
        tradedVolume: 0n,
        boostIds: [],
      };

      renderWithI18n(<TierCardsSection config={mockConfig} currentEpochStats={currentEpochStats} />);

      const allText = document.body.textContent || "";
      expect(allText).not.toContain("GMX more to get");
      expect(allText).not.toContain("Stake 0 GMX");
    });
  });

  describe("card sorting", () => {
    it("active cards appear first, then inactive", () => {
      const currentEpochStats: EpochStats = {
        account: "0x1234",
        multiplier: 150,
        epochTimestamp: 1700000000,
        volumeTier: null,
        stakingTier: "Tier1",
        tradedVolume: 0n,
        boostIds: ["FeaturedMarkets"],
      };

      const { container } = renderWithI18n(
        <TierCardsSection config={mockConfig} currentEpochStats={currentEpochStats} />
      );

      // Three cards are rendered in a grid
      const cards = container.querySelectorAll(".grid > *");
      expect(cards.length).toBe(3);

      // Volume is inactive (volumeTier: null), staking and boosts are active
      // Active cards (staking, boosts) should appear before inactive (volume)
      // The volume banner has "Start trading" link text only when inactive
      const allTexts = container.textContent || "";
      const startTradingIndex = allTexts.indexOf("Start trading");
      const stakingTierIndex = allTexts.indexOf("Staking Tier");

      // Staking (active) should appear before Volume (inactive, contains "Start trading")
      expect(stakingTierIndex).toBeLessThan(startTradingIndex);
    });
  });

  describe("boosts card", () => {
    it("shows boost labels from config when inactive", () => {
      renderWithI18n(<TierCardsSection config={mockConfig} currentEpochStats={undefined} />);

      expect(screen.getAllByText("Featured Markets").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Balancing Trades").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Lifetime Volume").length).toBeGreaterThan(0);
    });

    it("shows active boosts count when active", () => {
      const currentEpochStats: EpochStats = {
        account: "0x1234",
        multiplier: 150,
        epochTimestamp: 1700000000,
        volumeTier: null,
        stakingTier: null,
        tradedVolume: 0n,
        boostIds: ["FeaturedMarkets", "BalancingTrades"],
      };

      renderWithI18n(<TierCardsSection config={mockConfig} currentEpochStats={currentEpochStats} />);

      // "2 active boosts" is rendered with "2" and "active boosts" as separate nodes
      // Use getAllByText since "2" might match other elements
      const allText = document.body.textContent || "";
      expect(allText).toContain("2");
      expect(allText).toContain("active boosts");
    });
  });
});
