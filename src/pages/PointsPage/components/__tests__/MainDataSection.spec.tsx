/* eslint-disable react-perf/jsx-no-new-object-as-prop */
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { render, screen, cleanup, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, afterEach } from "vitest";

import { formatMultiplier } from "domain/synthetics/incentives/constants";
import type { IncentivesConfig } from "domain/synthetics/incentives/types";

// SVG imports need to be mocked for happy-dom

vi.mock("img/ic_arrow_right.svg?react", () => ({
  default: (props: any) => <svg data-testid="arrow-right-icon" {...props} />,
}));
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
    gmxInStakedGmx: 0n,
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

// Mock TooltipWithPortal to render its handle and content inline so we can query
// both the projected multiplier badge and the surrounding labels.
vi.mock("components/Tooltip/TooltipWithPortal", () => ({
  default: ({ handle, content }: { handle: React.ReactNode; content: React.ReactNode }) => (
    <div data-testid="tooltip">
      <div data-testid="tooltip-handle">{handle}</div>
      <div data-testid="tooltip-content">{content}</div>
    </div>
  ),
}));

// Stub out TierCardsSection — it pulls in heavy hooks (staking data, banner data)
// and renders its own ArrowRight icons, which would interfere with assertions.
vi.mock("../TierCardsSection", () => ({
  TierCardsSection: () => <div data-testid="tier-cards-section" />,
}));

// Import after mocks
import { MainDataSection } from "../MainDataSection";

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
    { tier: "Tier5", threshold: 50000n * USD, multiplier: 250 },
  ],
  stakingTiers: [
    { tier: "Tier1", threshold: 10n * GMX_DEC, multiplier: 25 },
    { tier: "Tier2", threshold: 100n * GMX_DEC, multiplier: 50 },
    { tier: "Tier3", threshold: 1000n * GMX_DEC, multiplier: 100 },
    { tier: "Tier4", threshold: 5000n * GMX_DEC, multiplier: 200 },
    { tier: "Tier5", threshold: 10000n * GMX_DEC, multiplier: 300 },
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
    gmxInStakedGmx: 0n,
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

/**
 * Returns the rendered text content of the projected-multiplier tooltip handle
 * (the "3x → 4x" element rendered above the "Your multiplier" label), or
 * undefined if no projected badge is shown.
 */
function getProjectedHandleText(): string | undefined {
  // The MainDataSection renders multiple tooltips (multiplier, points balance,
  // ...). The projected-multiplier handle is the only one that contains the
  // arrow-right icon, so use that to locate it.
  const arrow = screen.queryByTestId("arrow-right-icon");
  if (!arrow) return undefined;
  // The handle is the closest tooltip-handle ancestor.
  const handle = arrow.closest('[data-testid="tooltip-handle"]');
  return handle?.textContent ?? undefined;
}

describe("MainDataSection projected multiplier", () => {
  it("clamps the projected raw value to maxMultiplier when delta would exceed cap", () => {
    // Current multiplier = 300 (3.00x). Projected staking goes Tier3 (1x) -> Tier5 (3x),
    // adding +2.00x => raw projected 5.00x. Cap is 4.00x (config.maxMultiplier=400).
    renderWithI18n(
      <MainDataSection
        multiplier={300}
        pointsBalance={0n}
        config={mockConfig}
        currentEpochStats={undefined}
        effectiveVolumeTier={null}
        effectiveStakingTier="Tier3"
        projectedVolumeTier={null}
        projectedStakingTier="Tier5"
      />
    );

    const handleText = getProjectedHandleText();
    expect(handleText).toBeDefined();
    // Current and projected values both appear in the handle.
    expect(handleText).toContain(formatMultiplier(300)); // "3.00x"
    expect(handleText).toContain(formatMultiplier(400)); // "4.00x"
    // The uncapped 5.00x must NOT leak through.
    expect(handleText).not.toContain(formatMultiplier(500));
  });

  it("hides the projected badge when current multiplier is already at cap", () => {
    // Current multiplier = cap = 400. Even if projected staking goes up (Tier5),
    // clamped projected = 400, so projected === current => no badge.
    renderWithI18n(
      <MainDataSection
        multiplier={400}
        pointsBalance={0n}
        config={mockConfig}
        currentEpochStats={undefined}
        effectiveVolumeTier={null}
        effectiveStakingTier="Tier3"
        projectedVolumeTier={null}
        projectedStakingTier="Tier5"
      />
    );

    expect(screen.queryByTestId("arrow-right-icon")).toBeNull();
    // The static (non-projected) display still shows the current multiplier.
    expect(screen.getByText(formatMultiplier(400))).toBeDefined();
  });

  it("renders unchanged projected behaviour when delta stays under cap (200 → 250)", () => {
    // Current multiplier = 200 (2.00x). Projected staking Tier1 (0.25x) -> Tier2 (0.50x)
    // adds +0.25x => projected 2.25x => 225. Below cap (4.00x), so no clamping.
    renderWithI18n(
      <MainDataSection
        multiplier={200}
        pointsBalance={0n}
        config={mockConfig}
        currentEpochStats={undefined}
        effectiveVolumeTier={null}
        effectiveStakingTier="Tier1"
        projectedVolumeTier={null}
        projectedStakingTier="Tier2"
      />
    );

    const handleText = getProjectedHandleText();
    expect(handleText).toBeDefined();
    expect(handleText).toContain(formatMultiplier(200)); // "2.00x"
    expect(handleText).toContain(formatMultiplier(225)); // "2.25x"
  });

  it("does not show projected badge when projected equals current (no tier change)", () => {
    renderWithI18n(
      <MainDataSection
        multiplier={200}
        pointsBalance={0n}
        config={mockConfig}
        currentEpochStats={undefined}
        effectiveVolumeTier="Tier1"
        effectiveStakingTier="Tier1"
        projectedVolumeTier="Tier1"
        projectedStakingTier="Tier1"
      />
    );

    expect(screen.queryByTestId("arrow-right-icon")).toBeNull();
  });

  it("renders the static current multiplier when no projected tiers are provided", () => {
    const { container } = renderWithI18n(
      <MainDataSection
        multiplier={300}
        pointsBalance={0n}
        config={mockConfig}
        currentEpochStats={undefined}
        effectiveVolumeTier="Tier1"
        effectiveStakingTier="Tier3"
      />
    );

    expect(screen.queryByTestId("arrow-right-icon")).toBeNull();
    expect(within(container).getByText(formatMultiplier(300))).toBeDefined();
  });
});

describe("MainDataSection loading state", () => {
  it("uses dark placeholder colors for the summary skeletons", () => {
    const { container } = renderWithI18n(<MainDataSection isLoading config={mockConfig} />);

    const skeletons = container.querySelectorAll(".react-loading-skeleton");
    expect(skeletons).toHaveLength(2);
    skeletons.forEach((skeleton) => {
      const style = (skeleton as HTMLElement).style;
      expect(style.getPropertyValue("--base-color")).toBe("#B4BBFF1A");
      expect(style.getPropertyValue("--highlight-color")).toBe("#B4BBFF1A");
    });
  });
});
