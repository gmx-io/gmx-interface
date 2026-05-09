/* eslint-disable react-perf/jsx-no-new-object-as-prop */
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { IncentivesConfig } from "domain/synthetics/incentives/types";

vi.mock("domain/synthetics/markets", () => ({
  useMarkets: () => ({ marketsData: {} }),
}));

// Mock TooltipWithPortal so its handle/content render inline as DOM text — keeps
// boost description counts unambiguous for the test.
vi.mock("components/Tooltip/TooltipWithPortal", () => ({
  default: ({ handle, content }: { handle: React.ReactNode; content: React.ReactNode }) => (
    <div data-testid="tooltip">
      <div data-testid="tooltip-handle">{handle}</div>
      <div data-testid="tooltip-content">{content}</div>
    </div>
  ),
}));

import { TierLevelsSection } from "../TierLevelsSection";

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
  volumeTiers: [{ tier: "Tier1", threshold: 2000n * USD, multiplier: 25 }],
  stakingTiers: [{ tier: "Tier1", threshold: 10n * GMX_DEC, multiplier: 25 }],
  boosts: [
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
  cleanup();
});

function switchToBoostsTab(container: HTMLElement) {
  const boostsTab = Array.from(container.querySelectorAll("button, div, span")).find(
    (el) => el.textContent?.trim() === "Activity Boosts"
  );
  if (!boostsTab) throw new Error("Activity Boosts tab not found");
  fireEvent.click(boostsTab);
}

describe("TierLevelsSection BoostsTable", () => {
  it("renders table skeleton rows while tiers config is loading", () => {
    const { container } = renderWithI18n(<TierLevelsSection chainId={42161} isLoading config={undefined} />);

    const allText = container.textContent || "";
    expect(allText).toContain("Volume Tiers");
    expect(allText).not.toContain("Ranked");
    expect(container.querySelectorAll(".react-loading-skeleton").length).toBeGreaterThan(0);
  });

  it("keeps the Show more toggle aligned to its content width", () => {
    renderWithI18n(<TierLevelsSection chainId={42161} config={mockConfig} />);

    expect(screen.getByRole("button", { name: "Show more" }).className).toContain("inline-flex");
  });

  it("renders each non-featured boost description exactly once", () => {
    const { container } = renderWithI18n(<TierLevelsSection chainId={42161} config={mockConfig} />);

    switchToBoostsTab(container);

    // Find all <td> cells in the boosts table that hold a boost description.
    // Boosts table is the only one rendered inside the boosts tab.
    const allText = container.textContent || "";

    const balancingMatches = allText.match(
      /Place balancing trades \(\$1,000,000\+\) on underutilized sides to earn an additional multiplier on those trades\./g
    );
    expect(balancingMatches).not.toBeNull();
    expect(balancingMatches!.length).toBe(1);

    const lifetimeMatches = allText.match(
      /Reach \$200,000,000\+ in lifetime trading volume to unlock a permanent 1× multiplier\./g
    );
    expect(lifetimeMatches).not.toBeNull();
    expect(lifetimeMatches!.length).toBe(1);
  });

  it("renders the FeaturedMarkets description once and shows the 'Featured markets' tooltip handle when feature tokens exist", () => {
    const configWithFeatured: IncentivesConfig = {
      ...mockConfig,
      boosts: [{ boost: "FeaturedMarkets", multiplier: 50 }, ...mockConfig.boosts],
      featuredMarketTokens: ["0xMarket"],
    };

    const { container } = renderWithI18n(<TierLevelsSection chainId={42161} config={configWithFeatured} />);

    switchToBoostsTab(container);

    const allText = container.textContent || "";

    const featuredDescMatches = allText.match(
      /Trade featured markets to activate this boost and earn a higher multiplier for those trades\./g
    );
    expect(featuredDescMatches).not.toBeNull();
    expect(featuredDescMatches!.length).toBe(1);

    // The "Featured markets." annotation only appears when featuredMarketTokens is non-empty.
    expect(allText).toContain("Featured markets.");
  });
});
