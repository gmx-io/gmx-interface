import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getRewardsPromoSelection } from "domain/synthetics/incentives/v2/rewardsPromo";
import type { AccountIncentiveStatus, IncentivesConfig } from "domain/synthetics/incentives/v2/types";
import { USD_DECIMALS } from "lib/numbers";

import { getRewardsPromotionalBannerContent, RewardsPromotionalBanners } from "../RewardsPromotionalBanners";

vi.mock("config/env", () => ({ isDevelopment: () => true }));
vi.mock("lib/userAnalytics/rewardsEvents", () => ({
  sendRewardsBannerEvent: vi.fn(),
  sendRewardsNavigationEvent: vi.fn(),
}));

const USD_UNIT = 10n ** BigInt(USD_DECIMALS);
const ACCOUNT = "0x52908400098527886E0F7030069857D2E4169EE7";

const config = {
  epochTimestamp: 100,
  feeShareFactor: USD_UNIT,
  esGmxShareFactor: (USD_UNIT * 8n) / 10n,
  gtShareFactor: (USD_UNIT * 2n) / 10n,
  maxMultiplier: 120n,
  multiplierDecimals: 100n,
  volumeTiers: [
    { tier: "Tier1", threshold: 0n, multiplier: 100n },
    { tier: "Tier2", threshold: 1_000n * USD_UNIT, multiplier: 125n },
  ],
  featuredMarketIndexTokens: ["0x1111111111111111111111111111111111111111"],
} as IncentivesConfig;

const status: AccountIncentiveStatus = {
  account: ACCOUNT,
  multiplier: 100n,
  volumeTier: "Tier1",
  stakingTier: null,
  projectedVolumeTier: "Tier1",
  projectedStakingTier: null,
  epochTimestamp: 100,
  tierVolume: 800n * USD_UNIT,
  tradingVolume: 50n * USD_UNIT,
  referralVolume: 0n,
  currentStakedBalance: 0n,
  boostIds: [],
  esGmxRewards: 0n,
  gtRewards: 0n,
  rewardsUsd: 0n,
  manualRewardCapUsd: 500n * USD_UNIT,
  manualRewardConsumedUsd: 100n * USD_UNIT,
  manualRewardRemainingUsd: 400n * USD_UNIT,
};
const tinyManualStatus = { ...status, manualRewardRemainingUsd: USD_UNIT / 2n };
const singleBannerConfig: IncentivesConfig = { ...config, featuredMarketIndexTokens: [] };
const REWARDS_ROUTE_ENTRIES = ["/rewards"];
const REWARDS_BANNERS_DEBUG_ROUTE_ENTRIES = ["/rewards?rewardsDebug=banners"];
const singleBannerStatus: AccountIncentiveStatus = {
  ...status,
  tierVolume: 0n,
  boostIds: ["FeaturedMarkets"],
  manualRewardRemainingUsd: 0n,
};

i18n.load({ en: {} });
i18n.activate("en");

function renderBanners() {
  const promoSelection = getRewardsPromoSelection({ config, status });

  return render(
    <I18nProvider i18n={i18n}>
      <MemoryRouter initialEntries={REWARDS_ROUTE_ENTRIES}>
        <RewardsPromotionalBanners account={ACCOUNT} config={config} status={status} promoSelection={promoSelection} />
      </MemoryRouter>
    </I18nProvider>
  );
}

function normalizeText(element: HTMLElement) {
  return element.textContent?.replace(/\s/g, "");
}

describe("RewardsPromotionalBanners", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("builds banners only from V2 status and config fields", () => {
    const banners = getRewardsPromotionalBannerContent({
      config,
      status,
      promoSelection: getRewardsPromoSelection({ config, status }),
    });

    expect(banners.map((banner) => banner.type)).toEqual([
      "manual-reward",
      "next-volume-tier",
      "pair-boosts",
      "restake-rewards",
    ]);
  });

  it("hides activity promos for an indexed account with no activity but keeps manual rewards eligible", () => {
    const inactiveStatus: AccountIncentiveStatus = {
      ...status,
      multiplier: 0n,
      tierVolume: 0n,
      tradingVolume: 0n,
      referralVolume: 0n,
      currentStakedBalance: 0n,
      boostIds: [],
      esGmxRewards: 0n,
      gtRewards: 0n,
      rewardsUsd: 0n,
      manualRewardCapUsd: 0n,
      manualRewardConsumedUsd: 0n,
      manualRewardRemainingUsd: 0n,
    };

    expect(
      getRewardsPromotionalBannerContent({
        config,
        status: inactiveStatus,
        promoSelection: getRewardsPromoSelection({ config, status: inactiveStatus }),
      })
    ).toEqual([]);
    const manualStatus: AccountIncentiveStatus = {
      ...inactiveStatus,
      manualRewardCapUsd: 200n * USD_UNIT,
      manualRewardRemainingUsd: 200n * USD_UNIT,
      boostIds: ["ManualAllocation"],
    };
    expect(
      getRewardsPromotionalBannerContent({
        config,
        status: manualStatus,
        promoSelection: getRewardsPromoSelection({ config, status: manualStatus }),
      }).map((banner) => banner.type)
    ).toEqual(["manual-reward"]);
  });

  it("uses tierVolume for the near-tier decision and hides qualified featured markets", () => {
    const qualifiedStatus: AccountIncentiveStatus = {
      ...status,
      tierVolume: 600n * USD_UNIT,
      tradingVolume: 990n * USD_UNIT,
      boostIds: ["FeaturedMarkets"],
      manualRewardRemainingUsd: 0n,
    };
    const banners = getRewardsPromotionalBannerContent({
      config,
      status: qualifiedStatus,
      promoSelection: getRewardsPromoSelection({ config, status: qualifiedStatus }),
    });

    expect(banners.map((banner) => banner.type)).toEqual(["restake-rewards"]);
  });

  it("offers both wallet GMX and esGMX staking opportunities", () => {
    const banners = getRewardsPromotionalBannerContent({
      config,
      status,
      promoSelection: getRewardsPromoSelection({ config, status }),
      walletGmx: 2n * 10n ** 18n,
      walletEsGmx: 3n * 10n ** 18n,
    });

    expect(banners.map((banner) => banner.type)).toEqual([
      "manual-reward",
      "gmx-ready-to-stake",
      "esgmx-ready-to-stake",
      "next-volume-tier",
      "pair-boosts",
      "restake-rewards",
    ]);
  });

  it("never advertises a tier below a higher persisted tier", () => {
    const persistedStatus: AccountIncentiveStatus = {
      ...status,
      volumeTier: "Tier2",
      projectedVolumeTier: "Tier1",
      manualRewardRemainingUsd: 0n,
      boostIds: ["FeaturedMarkets"],
    };
    const banners = getRewardsPromotionalBannerContent({
      config,
      status: persistedStatus,
      promoSelection: getRewardsPromoSelection({ config, status: persistedStatus }),
    });

    expect(banners.map((banner) => banner.type)).toEqual(["restake-rewards"]);
  });

  it("supports carousel navigation and dismisses only the selected opportunity", () => {
    renderBanners();

    const carousel = screen.getByRole("region", { name: "Rewards opportunities" });
    const liveRegion = carousel.querySelector("[aria-live]");
    const dots = screen.getAllByRole("button", { name: /Go to slide/ });

    expect(liveRegion?.getAttribute("aria-live")).toBe("off");
    expect(dots).toHaveLength(4);
    expect(dots[0].getAttribute("aria-current")).toBe("true");
    expect(fireEvent.keyDown(carousel, { key: "ArrowRight" })).toBe(false);
    expect(screen.getByText("Almost at the next tier")).toBeDefined();
    expect(dots[1].getAttribute("aria-current")).toBe("true");
    expect(screen.getByRole("link", { name: /Trade/ }).getAttribute("href")).toBe("/trade");

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.getByText("Activate Pair Boosts")).toBeDefined();
    expect(screen.queryByText("Almost at the next tier")).toBeNull();
  });

  it("rotates every six seconds without user interaction", () => {
    vi.useFakeTimers();
    renderBanners();
    expect(screen.getByRole("heading", { name: /You've received bonus/ })).toBeDefined();

    act(() => vi.advanceTimersByTime(6000));
    expect(screen.getByText("Almost at the next tier")).toBeDefined();

    act(() => vi.advanceTimersByTime(6000));
    expect(screen.getByText("Activate Pair Boosts")).toBeDefined();
  });

  it("pauses and resumes automatic rotation", () => {
    vi.useFakeTimers();
    renderBanners();

    fireEvent.click(screen.getByRole("button", { name: "Pause carousel" }));
    act(() => vi.advanceTimersByTime(12_000));
    expect(screen.getByRole("heading", { name: /You've received bonus/ })).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Resume carousel" }));
    act(() => vi.advanceTimersByTime(6_000));
    expect(screen.getByText("Almost at the next tier")).toBeDefined();
  });

  it("navigates in both directions with touch swipes", () => {
    renderBanners();
    const carousel = screen.getByRole("region", { name: "Rewards opportunities" });
    let banner = carousel.firstElementChild as HTMLElement;

    fireEvent.pointerDown(banner, { pointerType: "touch", pointerId: 1, clientX: 200, clientY: 20 });
    fireEvent.pointerUp(banner, { pointerType: "touch", pointerId: 1, clientX: 120, clientY: 25 });
    expect(screen.getByText("Almost at the next tier")).toBeDefined();

    banner = carousel.firstElementChild as HTMLElement;
    fireEvent.pointerDown(banner, { pointerType: "touch", pointerId: 2, clientX: 120, clientY: 20 });
    fireEvent.pointerUp(banner, { pointerType: "touch", pointerId: 2, clientX: 200, clientY: 25 });
    expect(screen.getByRole("heading", { name: /You've received bonus/ })).toBeDefined();
  });

  it("does not start a swipe from an interactive control", () => {
    renderBanners();

    const action = screen.getByRole("link", { name: /Start trading/ });
    const banner = action.closest("[style]") as HTMLElement;
    fireEvent.pointerDown(action, { pointerType: "touch", pointerId: 1, clientX: 100, clientY: 10 });
    fireEvent.pointerUp(banner, { pointerType: "touch", pointerId: 1, clientX: 20, clientY: 10 });

    expect(screen.getByRole("heading", { name: /You've received bonus/ })).toBeDefined();
  });

  it("keeps a positive sub-dollar manual allocation visible", () => {
    const promoSelection = getRewardsPromoSelection({ config, status: tinyManualStatus });
    const view = render(
      <I18nProvider i18n={i18n}>
        <MemoryRouter>
          <RewardsPromotionalBanners
            account={ACCOUNT}
            config={config}
            status={tinyManualStatus}
            promoSelection={promoSelection}
          />
        </MemoryRouter>
      </I18nProvider>
    );

    expect(view.getByRole("heading", { name: /You've received bonus of < \$1/ })).toBeDefined();
  });

  it("hides carousel controls when only one opportunity is available", () => {
    const promoSelection = getRewardsPromoSelection({ config: singleBannerConfig, status: singleBannerStatus });
    render(
      <I18nProvider i18n={i18n}>
        <MemoryRouter>
          <RewardsPromotionalBanners
            account={ACCOUNT}
            config={singleBannerConfig}
            status={singleBannerStatus}
            promoSelection={promoSelection}
          />
        </MemoryRouter>
      </I18nProvider>
    );

    expect(screen.getByText("Restake your rewards and earn more")).toBeDefined();
    expect(screen.queryByRole("region", { name: "Rewards opportunities" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Go to slide/ })).toBeNull();
  });

  it("does not render personalized opportunities without a connected account or status", () => {
    const promoSelection = getRewardsPromoSelection({ config, status });
    const { rerender } = render(
      <I18nProvider i18n={i18n}>
        <MemoryRouter>
          <RewardsPromotionalBanners config={config} status={status} promoSelection={promoSelection} />
        </MemoryRouter>
      </I18nProvider>
    );
    expect(screen.queryByTestId("rewards-promotional-banners")).toBeNull();

    rerender(
      <I18nProvider i18n={i18n}>
        <MemoryRouter>
          <RewardsPromotionalBanners account={ACCOUNT} config={config} />
        </MemoryRouter>
      </I18nProvider>
    );
    expect(screen.queryByTestId("rewards-promotional-banners")).toBeNull();
  });

  it("shows every deterministic banner fixture in development debug mode without an account", () => {
    render(
      <I18nProvider i18n={i18n}>
        <MemoryRouter initialEntries={REWARDS_BANNERS_DEBUG_ROUTE_ENTRIES}>
          <RewardsPromotionalBanners config={config} />
        </MemoryRouter>
      </I18nProvider>
    );

    expect(normalizeText(screen.getByRole("heading", { name: /You've received bonus/ }))).toContain("$200");
    expect(screen.getAllByRole("button", { name: /Go to slide/ })).toHaveLength(6);
  });
});
