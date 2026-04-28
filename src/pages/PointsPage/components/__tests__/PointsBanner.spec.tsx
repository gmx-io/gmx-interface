import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POINTS_PAGE_BANNERS_DISMISSED_KEY } from "config/localStorage";
import type { EpochStats, IncentivesConfig, RewardsHistoryEntry } from "domain/synthetics/incentives/types";

import { PointsBanner } from "../PointsBanner";

i18n.load({ en: {} });
i18n.activate("en");

const STORAGE_KEY = JSON.stringify(POINTS_PAGE_BANNERS_DISMISSED_KEY);
const GMX_DECIMALS = 10n ** 18n;

const currentEpochStats: EpochStats = {
  account: "0xAccount",
  multiplier: 100,
  epochTimestamp: 0,
  volumeTier: "Tier1",
  stakingTier: "Tier1",
  tradedVolume: 100n,
  boostIds: [],
};

const currentEpochHistory: RewardsHistoryEntry = {
  epoch: 1,
  volume: 0n,
  pointsEarned: 0n,
  pointsSpent: 0n,
  pointsExpired: 10n * GMX_DECIMALS,
  pointsBalance: 0n,
  rewardsEarned: 0n,
  rewardsClaimed: 0n,
};

const config: IncentivesConfig = {
  programStartTimestamp: 0,
  epochTimestamp: 0,
  epochStartTimestamp: 0,
  epochDuration: 604800,
  maxMultiplier: 400,
  multiplierDecimals: 100,
  volumeTierPersistenceEpochs: 4,
  pointsExpirationEpochs: 13,
  basePointsFactor: GMX_DECIMALS,
  pointsToGmxFactor: GMX_DECIMALS,
  volumeTiers: [
    { tier: "Tier1", threshold: 0n, multiplier: 100 },
    { tier: "Tier2", threshold: 1000n, multiplier: 125 },
  ],
  stakingTiers: [],
  boosts: [],
  balancingTradesThreshold: 0n,
  lifetimeVolumeThreshold: 0n,
  downgradingCoefficients: {},
  featuredMarketTokens: [],
};

function renderBanner() {
  return render(
    <I18nProvider i18n={i18n}>
      <MemoryRouter>
        <PointsBanner
          isActiveUser
          account="0xAccount"
          config={config}
          currentEpochStats={currentEpochStats}
          currentEpochHistory={currentEpochHistory}
        />
      </MemoryRouter>
    </I18nProvider>
  );
}

function renderTwoBanners() {
  return render(
    <I18nProvider i18n={i18n}>
      <MemoryRouter>
        <PointsBanner
          isActiveUser
          account="0xAccount"
          config={config}
          currentEpochStats={currentEpochStats}
          currentEpochHistory={currentEpochHistory}
        />
        <PointsBanner
          isActiveUser
          account="0xAccount"
          config={config}
          currentEpochStats={currentEpochStats}
          currentEpochHistory={currentEpochHistory}
        />
      </MemoryRouter>
    </I18nProvider>
  );
}

describe("PointsBanner", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("slides the displayed banner in from the right", () => {
    const { container } = renderBanner();

    expect(container.querySelector(".animate-points-banner-slide-in-right")).not.toBeNull();
  });

  it("chooses animation direction when clicking banner dots", () => {
    const { container } = renderBanner();
    const dots = container.querySelectorAll(".rounded-full");

    fireEvent.click(dots[3]);

    expect(screen.getByText("Restake your rewards and earn more")).toBeTruthy();
    expect(container.querySelector(".animate-points-banner-slide-in-right")).not.toBeNull();

    fireEvent.click(dots[0]);

    expect(screen.getByText("Don't Let Rewards Expire")).toBeTruthy();
    expect(container.querySelector(".animate-points-banner-slide-in-left")).not.toBeNull();
  });

  it("restarts the auto-rotate timer when switching banners", () => {
    vi.useFakeTimers();

    const { container } = renderBanner();
    const dots = container.querySelectorAll(".rounded-full");

    act(() => {
      vi.advanceTimersByTime(5999);
    });

    fireEvent.click(dots[3]);

    expect(screen.getByText("Restake your rewards and earn more")).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(screen.getByText("Restake your rewards and earn more")).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(5999);
    });

    expect(screen.getByText("Don't Let Rewards Expire")).toBeTruthy();
  });

  it("advances to the next banner on left swipe", () => {
    const { container } = renderBanner();
    const banner = container.querySelector(".animate-points-banner-slide-in-right");

    fireEvent.pointerDown(banner!, { pointerId: 1, pointerType: "touch", clientX: 200, clientY: 20 });
    fireEvent.pointerUp(banner!, { pointerId: 1, pointerType: "touch", clientX: 120, clientY: 25 });

    expect(screen.getByText("So Close to the Next Tier")).toBeTruthy();
    expect(container.querySelector(".animate-points-banner-slide-in-right")).not.toBeNull();
  });

  it("moves to the previous banner on right swipe", () => {
    const { container } = renderBanner();
    const banner = container.querySelector(".animate-points-banner-slide-in-right");

    fireEvent.pointerDown(banner!, { pointerId: 1, pointerType: "touch", clientX: 120, clientY: 20 });
    fireEvent.pointerUp(banner!, { pointerId: 1, pointerType: "touch", clientX: 200, clientY: 25 });

    expect(screen.getByText("Restake your rewards and earn more")).toBeTruthy();
    expect(container.querySelector(".animate-points-banner-slide-in-left")).not.toBeNull();
  });

  it("dismisses only the currently displayed banner type", () => {
    renderBanner();

    expect(screen.getByText("Don't Let Rewards Expire")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByText("Don't Let Rewards Expire")).toBeNull();
    expect(screen.getByText("So Close to the Next Tier")).toBeTruthy();
    expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify({ "points-expiring": true }));
  });

  it("keeps other queued banners visible when a type is already dismissed", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ "points-expiring": true }));

    renderBanner();

    expect(screen.queryByText("Don't Let Rewards Expire")).toBeNull();
    expect(screen.getByText("So Close to the Next Tier")).toBeTruthy();
  });

  it("syncs dismissed banner types across mounted banner instances", () => {
    renderTwoBanners();

    expect(screen.getAllByText("Don't Let Rewards Expire")).toHaveLength(2);

    fireEvent.click(screen.getAllByRole("button", { name: "Close" })[0]);

    expect(screen.queryByText("Don't Let Rewards Expire")).toBeNull();
    expect(screen.getAllByText("So Close to the Next Tier")).toHaveLength(2);
  });
});
