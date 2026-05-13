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
    manualAllocatedPoints: undefined,
    manualBonusUsd: undefined,
    estimatedRewardsUsd: undefined,
    isLoading: false,
  };
  cleanup();
});

describe("TierCardsSection", () => {
  describe("VolumeBanner (inactive volume card)", () => {
    it("shows static FEDEV-3501 banner copy", () => {
      renderWithI18n(<TierCardsSection config={mockConfig} currentEpochStats={undefined} />);

      const allText = document.body.textContent || "";
      expect(screen.getByText("Trade More. Earn More.")).toBeDefined();
      expect(
        screen.getByText("Increase your trading volume to unlock a higher status and boost your rewards multiplier.")
      ).toBeDefined();
      expect(screen.getByText("Start trading")).toBeDefined();
      expect(allText).not.toContain("Reach $");
      expect(allText).not.toContain("additional trading rewards");
    });

    it("does not use currentEpochStats.volumeTier to activate the volume card", () => {
      const currentEpochStats: EpochStats = {
        account: "0x1234",
        multiplier: 125,
        epochTimestamp: 1700000000,
        volumeTier: "Tier1",
        stakingTier: null,
        tradedVolume: 3000n * USD,
        boostIds: [],
      };

      renderWithI18n(<TierCardsSection config={mockConfig} currentEpochStats={currentEpochStats} />);

      expect(screen.getByText("Trade More. Earn More.")).toBeDefined();
      expect(screen.queryByText(/Volume this epoch/)).toBeNull();
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
      expect(screen.getByText(/Stake GMX and receive up to 50% of your fees back/)).toBeDefined();
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
      expect(screen.getByText(/Stake GMX and receive up to 50% of your fees back/)).toBeDefined();
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
    it("shows skeleton cards instead of placeholder copy", () => {
      const { container } = renderWithI18n(<TierCardsSection config={undefined} currentEpochStats={undefined} />);

      const allText = container.textContent || "";
      expect(allText).not.toContain("...");
      expect(allText).not.toContain("Reach");
      expect(container.querySelectorAll(".react-loading-skeleton").length).toBeGreaterThan(0);
    });
  });

  describe("active volume card", () => {
    it("shows correct progress bar and 'Trade $X more to unlock...' text", () => {
      const currentEpochStats: EpochStats = {
        account: "0x1234",
        multiplier: 125,
        epochTimestamp: 1700000000,
        volumeTier: "Tier1",
        stakingTier: null,
        tradedVolume: 3000n * USD, // $3,000
        boostIds: [],
      };

      const { container } = renderWithI18n(
        <TierCardsSection config={mockConfig} currentEpochStats={currentEpochStats} effectiveVolumeTier="Tier1" />
      );

      // Should show "Volume this epoch:" with current volume
      expect(screen.getByText(/Volume this epoch/)).toBeDefined();

      // Tier1 -> Tier2 with tradedVolume = $3K, nextThreshold = $5K
      // delta = $5K - $3K = $2K, formatted as "$2K"
      const allText = container.textContent || "";
      expect(allText).toMatch(/Trade \$\s?2K more to unlock\s+Certified status\s+\+0\.50x/);
    });

    it("shows the remaining volume to the next tier (Certified -> Veteran with $7K traded shows $3K more)", () => {
      // User is currently Certified (Tier2 = $5K) with $7K traded.
      // Next tier (Veteran, Tier3) requires $10K -> remaining = $3K.
      const currentEpochStats: EpochStats = {
        account: "0x1234",
        multiplier: 150,
        epochTimestamp: 1700000000,
        volumeTier: "Tier2",
        stakingTier: null,
        tradedVolume: 7000n * USD,
        boostIds: [],
      };

      const { container } = renderWithI18n(
        <TierCardsSection config={mockConfig} currentEpochStats={currentEpochStats} effectiveVolumeTier="Tier2" />
      );

      const allText = container.textContent || "";
      expect(allText).toMatch(/Trade \$\s?3K more to unlock\s+Veteran status\s+\+1\.00x/);
    });

    it("renders progress bar capped to 100% width when traded volume exceeds the next threshold", () => {
      // Cert tier ($5K) with $7K traded — progress = 7K/10K = 70% (not 140%).
      const currentEpochStats: EpochStats = {
        account: "0x1234",
        multiplier: 150,
        epochTimestamp: 1700000000,
        volumeTier: "Tier2",
        stakingTier: null,
        tradedVolume: 7000n * USD,
        boostIds: [],
      };

      const { container } = renderWithI18n(
        <TierCardsSection config={mockConfig} currentEpochStats={currentEpochStats} effectiveVolumeTier="Tier2" />
      );

      // Find the volume progress bar fill (has bg-blue-300 inline width style)
      const progressFill = container.querySelector(".bg-blue-300[style*='width']") as HTMLElement | null;
      expect(progressFill).toBeTruthy();
      // 7000 * 100 / 10000 = 70%
      expect(progressFill?.style.width).toBe("70%");
    });

    it("renders volume progress bar inside a tooltip with 'get <NextTier> Status' content", () => {
      // Tier1 (Ranked, $2K threshold) with $3K traded -> nextTier=Tier2 (Certified, $5K, +0.50x)
      // Tooltip should be: "$3K/$5K get Certified Status +0.50x"
      const currentEpochStats: EpochStats = {
        account: "0x1234",
        multiplier: 125,
        epochTimestamp: 1700000000,
        volumeTier: "Tier1",
        stakingTier: null,
        tradedVolume: 3000n * USD,
        boostIds: [],
      };

      const { container } = renderWithI18n(
        <TierCardsSection config={mockConfig} currentEpochStats={currentEpochStats} effectiveVolumeTier="Tier1" />
      );

      // The volume progress bar lives inside a tooltip-handle wrapper; the mock renders
      // both `tooltip-handle` and `tooltip-content` siblings. Find the tooltip whose
      // handle contains the volume fill bar.
      const tooltips = container.querySelectorAll('[data-testid="tooltip"]');
      const volumeTooltip = Array.from(tooltips).find((t) =>
        t.querySelector('[data-testid="tooltip-handle"] .bg-blue-300[style*="width"]')
      );
      expect(volumeTooltip).toBeTruthy();
      const tooltipContent = volumeTooltip?.querySelector('[data-testid="tooltip-content"]');
      const tooltipText = tooltipContent?.textContent || "";
      expect(tooltipText).toMatch(/\$\s?3K\/\$\s?5K\s+get\s+Certified Status\s+\+0\.50x/);
    });

    it("renders preserve-mode tooltip ('to save <CurrentTier> Status') when projectedTierId is null", () => {
      // User has Tier2 (Certified, +0.50x) but projection says they will lose it.
      // Bar should target the current tier's threshold ($5K) instead of the next.
      const currentEpochStats: EpochStats = {
        account: "0x1234",
        multiplier: 150,
        epochTimestamp: 1700000000,
        volumeTier: "Tier2",
        stakingTier: null,
        tradedVolume: 2000n * USD, // $2K out of $5K needed to keep
        boostIds: [],
      };

      const { container } = renderWithI18n(
        <TierCardsSection
          config={mockConfig}
          currentEpochStats={currentEpochStats}
          effectiveVolumeTier="Tier2"
          projectedVolumeTier={null}
        />
      );

      const tooltips = container.querySelectorAll('[data-testid="tooltip"]');
      const volumeTooltip = Array.from(tooltips).find((t) =>
        t.querySelector('[data-testid="tooltip-handle"] .bg-blue-300[style*="width"]')
      );
      expect(volumeTooltip).toBeTruthy();
      const tooltipContent = volumeTooltip?.querySelector('[data-testid="tooltip-content"]');
      const tooltipText = tooltipContent?.textContent || "";
      // tradedVolume / currentThreshold = $2K/$5K, target to "save Certified"
      expect(tooltipText).toMatch(/\$\s?2K\/\$\s?5K\s+to save\s+Certified Status\s+\+0\.50x/);

      // CTA should also use "Trade $X more to keep ..." wording.
      const allText = container.textContent || "";
      expect(allText).toMatch(/Trade \$\s?3K more to keep\s+Certified status\s+\+0\.50x/);
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
      expect(allText).toContain("Stake 75 GMX more to get Advocate status +0.50x");
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
      expect(allText).toContain("Stake 75 GMX more to get Advocate status +0.50x");
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

  describe("max tier display (FEDEV-3824)", () => {
    it("shows 'Max tier reached' copy and green progress fill when at the top volume tier", () => {
      // Tier4 (Legendary) is the last tier in mockConfig.volumeTiers.
      const currentEpochStats: EpochStats = {
        account: "0x1234",
        multiplier: 250,
        epochTimestamp: 1700000000,
        volumeTier: "Tier4",
        stakingTier: null,
        tradedVolume: 25_000n * USD,
        boostIds: [],
      };

      const { container } = renderWithI18n(
        <TierCardsSection config={mockConfig} currentEpochStats={currentEpochStats} effectiveVolumeTier="Tier4" />
      );

      const allText = container.textContent || "";
      expect(allText).toMatch(/Max tier reached/);

      // The fill bar should now be green-300 instead of blue-300.
      const greenFill = container.querySelector(".bg-green-300[style*='width']") as HTMLElement | null;
      expect(greenFill).toBeTruthy();
      expect(greenFill?.style.width).toBe("100%");
      // No blue fill on the volume card.
      const blueVolumeFill = container.querySelector(".bg-blue-300[style*='width']");
      expect(blueVolumeFill).toBeNull();
    });

    it("falls back to the preserve-mode bar at max volume tier when projectedTierId is null", () => {
      // User is at the last tier but projection is to lose it next epoch — the bar should show
      // progress towards keeping the current tier, NOT show the "Max tier reached" celebratory
      // copy.
      const currentEpochStats: EpochStats = {
        account: "0x1234",
        multiplier: 250,
        epochTimestamp: 1700000000,
        volumeTier: "Tier4",
        stakingTier: null,
        tradedVolume: 5_000n * USD, // far below Tier4's $20K threshold
        boostIds: [],
      };

      const { container } = renderWithI18n(
        <TierCardsSection
          config={mockConfig}
          currentEpochStats={currentEpochStats}
          effectiveVolumeTier="Tier4"
          projectedVolumeTier={null}
        />
      );

      const allText = container.textContent || "";
      // Should NOT show the "Max tier reached" celebratory copy in this case.
      expect(allText).not.toMatch(/Max tier reached/);
      // Should show the keep/save preserve copy targeting Legendary (current top tier).
      expect(allText).toMatch(/Trade \$\s?15K more to keep\s+Legendary status\s+\+1\.50x/);

      // Bar fill should be the normal blue (not green).
      const tooltips = container.querySelectorAll('[data-testid="tooltip"]');
      const volumeTooltip = Array.from(tooltips).find((t) =>
        t.querySelector('[data-testid="tooltip-handle"] .bg-blue-300[style*="width"]')
      );
      expect(volumeTooltip).toBeTruthy();
      const tooltipContent = volumeTooltip?.querySelector('[data-testid="tooltip-content"]');
      const tooltipText = tooltipContent?.textContent || "";
      expect(tooltipText).toMatch(/\$\s?5K\/\$\s?20K\s+to save\s+Legendary Status\s+\+1\.50x/);
    });

    it("shows 'Max tier reached' copy and green segmented bar at the top staking tier", () => {
      stakingDataMock.data = {
        gmxInStakedGmx: 1500n * GMX_DEC,
        gmxBalance: 0n,
      };

      const currentEpochStats: EpochStats = {
        account: "0x1234",
        multiplier: 200,
        epochTimestamp: 1700000000,
        volumeTier: null,
        stakingTier: "Tier3", // last staking tier in mockConfig
        tradedVolume: 0n,
        boostIds: [],
      };

      const { container } = renderWithI18n(
        <TierCardsSection config={mockConfig} currentEpochStats={currentEpochStats} />
      );

      const allText = container.textContent || "";
      expect(allText).toMatch(/Max tier reached/);

      // All staking segments should now use green-300 instead of blue-300.
      const greenSegments = container.querySelectorAll(".bg-green-300");
      expect(greenSegments.length).toBeGreaterThanOrEqual(3);
      const blueStakingSegments = container.querySelectorAll(".bg-blue-300:not([style*='width'])");
      expect(blueStakingSegments.length).toBe(0);
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

    it("shows plural active boosts count when active", () => {
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

      const allText = document.body.textContent || "";
      expect(allText).toContain("2 active boosts");
    });

    it("shows singular active boost count when exactly one boost is active", () => {
      const currentEpochStats: EpochStats = {
        account: "0x1234",
        multiplier: 150,
        epochTimestamp: 1700000000,
        volumeTier: null,
        stakingTier: null,
        tradedVolume: 0n,
        boostIds: ["FeaturedMarkets"],
      };

      renderWithI18n(<TierCardsSection config={mockConfig} currentEpochStats={currentEpochStats} />);

      const allText = document.body.textContent || "";
      expect(allText).toContain("1 active boost");
      expect(allText).not.toContain("1 active boosts");
    });
  });
});
