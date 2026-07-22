import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { AccountIncentiveStatus, IncentivesConfig } from "domain/synthetics/incentives/v2/types";
import { USD_DECIMALS } from "lib/numbers";

import { getRewardsPromotionalBannerContent, RewardsPromotionalBanners } from "../RewardsPromotionalBanners";

const USD_UNIT = 10n ** BigInt(USD_DECIMALS);
const ACCOUNT = "0x52908400098527886E0F7030069857D2E4169EE7";

const config = {
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

i18n.load({ en: {} });
i18n.activate("en");

function renderBanners() {
  return render(
    <I18nProvider i18n={i18n}>
      <MemoryRouter>
        <RewardsPromotionalBanners account={ACCOUNT} config={config} status={status} />
      </MemoryRouter>
    </I18nProvider>
  );
}

function normalizeText(element: HTMLElement) {
  return element.textContent?.replace(/\s/g, "");
}

describe("RewardsPromotionalBanners", () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it("builds banners only from V2 status and config fields", () => {
    const banners = getRewardsPromotionalBannerContent({ config, status });

    expect(banners.map((banner) => banner.type)).toEqual([
      "manual-reward",
      "next-volume-tier",
      "pair-boosts",
      "restake-rewards",
    ]);
    renderBanners();
    expect(normalizeText(screen.getByRole("heading", { name: /You've received bonus/ }))).toContain("$400");
  });

  it("uses tierVolume for the near-tier decision and hides qualified featured markets", () => {
    const banners = getRewardsPromotionalBannerContent({
      config,
      status: {
        ...status,
        tierVolume: 600n * USD_UNIT,
        tradingVolume: 990n * USD_UNIT,
        boostIds: ["FeaturedMarkets"],
        manualRewardRemainingUsd: 0n,
      },
    });

    expect(banners.map((banner) => banner.type)).toEqual(["restake-rewards"]);
  });

  it("offers both wallet GMX and esGMX staking opportunities", () => {
    const banners = getRewardsPromotionalBannerContent({
      config,
      status,
      stakingData: { gmxBalance: 2n * 10n ** 18n, esGmxBalance: 3n * 10n ** 18n },
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
    const banners = getRewardsPromotionalBannerContent({
      config,
      status: {
        ...status,
        volumeTier: "Tier2",
        projectedVolumeTier: "Tier1",
        manualRewardRemainingUsd: 0n,
        boostIds: ["FeaturedMarkets"],
      },
    });

    expect(banners.map((banner) => banner.type)).toEqual(["restake-rewards"]);
  });

  it("supports carousel navigation and dismisses only the selected opportunity", () => {
    renderBanners();

    const carousel = screen.getByRole("region", { name: "Rewards opportunities" });
    const liveRegion = carousel.querySelector("[aria-live]");
    expect(liveRegion?.getAttribute("aria-live")).toBe("off");
    expect(screen.getByRole("button", { name: "Pause banner rotation" })).toBeDefined();
    expect(fireEvent.keyDown(carousel, { key: "ArrowRight" })).toBe(false);
    expect(screen.getByText("Almost at the next tier")).toBeDefined();
    expect(liveRegion?.getAttribute("aria-live")).toBe("polite");
    expect(screen.getByRole("button", { name: "Resume banner rotation" })).toBeDefined();
    expect(screen.getByRole("link", { name: /Trade/ }).getAttribute("href")).toBe("/trade");

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.getByText("Activate Pair Boosts")).toBeDefined();
    expect(screen.queryByText("Almost at the next tier")).toBeNull();
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
    const view = render(
      <I18nProvider i18n={i18n}>
        <MemoryRouter>
          <RewardsPromotionalBanners account={ACCOUNT} config={config} status={tinyManualStatus} />
        </MemoryRouter>
      </I18nProvider>
    );

    expect(view.getByRole("heading", { name: /You've received bonus of < \$1/ })).toBeDefined();
  });

  it("does not render personalized opportunities without a connected account or status", () => {
    const { rerender } = render(
      <I18nProvider i18n={i18n}>
        <MemoryRouter>
          <RewardsPromotionalBanners config={config} status={status} />
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
});
