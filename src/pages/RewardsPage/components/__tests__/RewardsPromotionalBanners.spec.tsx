import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getRewardsPromoSelection } from "domain/synthetics/incentives/v2/rewardsPromo";
import type { AccountIncentiveStatus, IncentivesConfig } from "domain/synthetics/incentives/v2/types";
import { USD_DECIMALS } from "lib/numbers";
import { getStartRewardsVestingPath } from "pages/RewardsPage/rewardsRoutes";

import {
  EARN_PORTFOLIO_STAKE_ES_GMX_LINK,
  EARN_PORTFOLIO_STAKE_GMX_LINK,
} from "components/Earn/Portfolio/AssetsList/GmxAssetCard/constants";

import { getRewardsPromotionalBannerContent, RewardsPromotionalBanners } from "../RewardsPromotionalBanners";

vi.mock("config/env", () => ({ isDevelopment: () => true }));
vi.mock("lib/userAnalytics/rewardsEvents", () => ({
  sendRewardsBannerEvent: vi.fn(),
  sendRewardsNavigationEvent: vi.fn(),
}));

const USD_UNIT = 10n ** BigInt(USD_DECIMALS);
const ACCOUNT = "0x52908400098527886E0F7030069857D2E4169EE7";
const OTHER_ACCOUNT = "0x8617E340B3D01FA5F11F306F4090FD50E238070D";

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
const otherAccountStatus = { ...status, account: OTHER_ACCOUNT };
const refreshedStatus = { ...status, tradingVolume: status.tradingVolume + USD_UNIT };
const tinyManualStatus = { ...status, manualRewardRemainingUsd: USD_UNIT / 2n };
const singleBannerConfig: IncentivesConfig = { ...config, featuredMarketIndexTokens: [] };
const REWARDS_ROUTE_ENTRIES = ["/rewards"];
const REWARDS_BANNERS_DEBUG_ROUTE_ENTRIES = ["/rewards?rewardsDebug=banners"];

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
      "referral",
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
      }).map((banner) => banner.type)
    ).toEqual(["referral"]);
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
    ).toEqual(["manual-reward", "referral"]);
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

    expect(banners.map((banner) => banner.type)).toEqual(["referral", "restake-rewards"]);
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
      "referral",
      "next-volume-tier",
      "pair-boosts",
      "restake-rewards",
    ]);
    expect(banners.find((banner) => banner.type === "gmx-ready-to-stake")?.actions[0].to).toBe(
      EARN_PORTFOLIO_STAKE_GMX_LINK
    );
    expect(banners.find((banner) => banner.type === "esgmx-ready-to-stake")?.actions).toEqual([
      expect.objectContaining({ to: EARN_PORTFOLIO_STAKE_ES_GMX_LINK }),
      expect.objectContaining({ to: getStartRewardsVestingPath() }),
    ]);
    expect(banners.find((banner) => banner.type === "restake-rewards")?.actions[0].to).toBe(
      EARN_PORTFOLIO_STAKE_GMX_LINK
    );
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

    expect(banners.map((banner) => banner.type)).toEqual(["referral", "restake-rewards"]);
  });

  it("supports carousel navigation and dismisses only the selected opportunity", () => {
    renderBanners();

    const carousel = screen.getByRole("region", { name: "Rewards opportunities" });
    const liveRegion = carousel.querySelector("[aria-live]");
    const dots = screen.getAllByRole("button", { name: /Go to slide/ });

    expect(liveRegion?.getAttribute("aria-live")).toBe("off");
    expect(dots).toHaveLength(5);
    expect(dots[0].getAttribute("aria-current")).toBe("true");
    expect(fireEvent.keyDown(carousel, { key: "ArrowRight" })).toBe(false);
    expect(screen.getByText("Referral Bonus")).toBeDefined();
    expect(dots[1].getAttribute("aria-current")).toBe("true");
    expect(screen.getByRole("link", { name: /Invite/ }).getAttribute("href")).toBe("/referrals/affiliates");

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.getByText("Almost at the next tier")).toBeDefined();
    expect(screen.queryByText("Referral Bonus")).toBeNull();
  });

  it("keeps the selected opportunity when newly eligible banners are inserted before it", () => {
    const promoSelection = getRewardsPromoSelection({ config, status });
    const { rerender } = render(
      <I18nProvider i18n={i18n}>
        <MemoryRouter initialEntries={REWARDS_ROUTE_ENTRIES}>
          <RewardsPromotionalBanners
            account={ACCOUNT}
            config={config}
            status={status}
            promoSelection={promoSelection}
          />
        </MemoryRouter>
      </I18nProvider>
    );

    fireEvent.click(screen.getAllByRole("button", { name: /Go to slide/ })[1]);
    expect(screen.getByText("Referral Bonus")).toBeDefined();

    rerender(
      <I18nProvider i18n={i18n}>
        <MemoryRouter initialEntries={REWARDS_ROUTE_ENTRIES}>
          <RewardsPromotionalBanners
            account={ACCOUNT}
            config={config}
            status={status}
            promoSelection={promoSelection}
            walletGmx={2n * 10n ** 18n}
          />
        </MemoryRouter>
      </I18nProvider>
    );

    expect(screen.getByText("Referral Bonus")).toBeDefined();
    expect(screen.queryByText("You have GMX ready to stake")).toBeNull();
  });

  it("resets the selected opportunity when the account changes", () => {
    const promoSelection = getRewardsPromoSelection({ config, status });
    const otherPromoSelection = getRewardsPromoSelection({ config, status: otherAccountStatus });
    const { rerender } = render(
      <I18nProvider i18n={i18n}>
        <MemoryRouter initialEntries={REWARDS_ROUTE_ENTRIES}>
          <RewardsPromotionalBanners
            account={ACCOUNT}
            config={config}
            status={status}
            promoSelection={promoSelection}
          />
        </MemoryRouter>
      </I18nProvider>
    );

    fireEvent.click(screen.getAllByRole("button", { name: /Go to slide/ })[1]);
    expect(screen.getByText("Referral Bonus")).toBeDefined();

    rerender(
      <I18nProvider i18n={i18n}>
        <MemoryRouter initialEntries={REWARDS_ROUTE_ENTRIES}>
          <RewardsPromotionalBanners account={OTHER_ACCOUNT} config={config} isLoading />
        </MemoryRouter>
      </I18nProvider>
    );
    expect(screen.getByText("Referral Bonus")).toBeDefined();

    rerender(
      <I18nProvider i18n={i18n}>
        <MemoryRouter initialEntries={REWARDS_ROUTE_ENTRIES}>
          <RewardsPromotionalBanners
            account={OTHER_ACCOUNT}
            config={config}
            status={otherAccountStatus}
            promoSelection={otherPromoSelection}
          />
        </MemoryRouter>
      </I18nProvider>
    );

    expect(screen.getByRole("heading", { name: /You've received bonus/ })).toBeDefined();
    expect(screen.queryByText("Referral Bonus")).toBeNull();
  });

  it("rotates every six seconds without user interaction", () => {
    vi.useFakeTimers();
    renderBanners();
    expect(screen.getByRole("heading", { name: /You've received bonus/ })).toBeDefined();

    act(() => vi.advanceTimersByTime(6000));
    expect(screen.getByText("Referral Bonus")).toBeDefined();

    act(() => vi.advanceTimersByTime(6000));
    expect(screen.getByText("Almost at the next tier")).toBeDefined();
  });

  it("does not restart auto-rotation when banner content refreshes", () => {
    vi.useFakeTimers();
    const promoSelection = getRewardsPromoSelection({ config, status });
    const { rerender } = render(
      <I18nProvider i18n={i18n}>
        <MemoryRouter initialEntries={REWARDS_ROUTE_ENTRIES}>
          <RewardsPromotionalBanners
            account={ACCOUNT}
            config={config}
            status={status}
            promoSelection={promoSelection}
          />
        </MemoryRouter>
      </I18nProvider>
    );

    act(() => vi.advanceTimersByTime(5000));
    rerender(
      <I18nProvider i18n={i18n}>
        <MemoryRouter initialEntries={REWARDS_ROUTE_ENTRIES}>
          <RewardsPromotionalBanners
            account={ACCOUNT}
            config={config}
            status={refreshedStatus}
            promoSelection={promoSelection}
          />
        </MemoryRouter>
      </I18nProvider>
    );
    act(() => vi.advanceTimersByTime(1000));

    expect(screen.getByText("Referral Bonus")).toBeDefined();
  });

  it("navigates in both directions with touch swipes", () => {
    renderBanners();
    const carousel = screen.getByRole("region", { name: "Rewards opportunities" });
    let banner = carousel.firstElementChild as HTMLElement;

    fireEvent.pointerDown(banner, { pointerType: "touch", pointerId: 1, clientX: 200, clientY: 20 });
    fireEvent.pointerUp(banner, { pointerType: "touch", pointerId: 1, clientX: 120, clientY: 25 });
    expect(screen.getByText("Referral Bonus")).toBeDefined();

    banner = carousel.firstElementChild as HTMLElement;
    fireEvent.pointerDown(banner, { pointerType: "touch", pointerId: 2, clientX: 120, clientY: 20 });
    fireEvent.pointerUp(banner, { pointerType: "touch", pointerId: 2, clientX: 200, clientY: 25 });
    expect(screen.getByRole("heading", { name: /You've received bonus/ })).toBeDefined();
  });

  it("does not start a swipe from an interactive control", () => {
    renderBanners();

    const action = screen.getByRole("link", { name: /Trade/ });
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
    render(
      <I18nProvider i18n={i18n}>
        <MemoryRouter>
          <RewardsPromotionalBanners account={ACCOUNT} config={singleBannerConfig} />
        </MemoryRouter>
      </I18nProvider>
    );

    expect(screen.getByText("Referral Bonus")).toBeDefined();
    expect(screen.queryByRole("region", { name: "Rewards opportunities" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Go to slide/ })).toBeNull();
  });

  it("keeps the referral opportunity available without status or a connected account", () => {
    const { rerender } = render(
      <I18nProvider i18n={i18n}>
        <MemoryRouter>
          <RewardsPromotionalBanners config={config} />
        </MemoryRouter>
      </I18nProvider>
    );
    expect(screen.getByText("Referral Bonus")).toBeDefined();

    rerender(
      <I18nProvider i18n={i18n}>
        <MemoryRouter>
          <RewardsPromotionalBanners account={ACCOUNT} config={config} />
        </MemoryRouter>
      </I18nProvider>
    );
    expect(screen.getByText("Referral Bonus")).toBeDefined();
  });

  it("shows every requested banner and action in development debug mode", () => {
    render(
      <I18nProvider i18n={i18n}>
        <MemoryRouter initialEntries={REWARDS_BANNERS_DEBUG_ROUTE_ENTRIES}>
          <RewardsPromotionalBanners config={config} />
        </MemoryRouter>
      </I18nProvider>
    );

    expect(normalizeText(screen.getByRole("heading", { name: /You've received bonus/ }))).toContain("$200");
    expect(screen.getByText("Start trading to activate it and get your rewards.")).toBeDefined();
    expect(screen.getByRole("link", { name: "Trade" }).getAttribute("href")).toBe("/trade");

    const dots = screen.getAllByRole("button", { name: /Go to slide/ });
    expect(dots).toHaveLength(7);

    fireEvent.click(dots[1]);
    expect(screen.getByText("You have GMX ready to stake")).toBeDefined();
    expect(screen.getByText("You have 100 GMX unstaked - stake now to earn more rewards.")).toBeDefined();
    expect(screen.getByRole("link", { name: "Stake GMX" }).getAttribute("href")).toBe(EARN_PORTFOLIO_STAKE_GMX_LINK);

    fireEvent.click(dots[2]);
    expect(screen.getByText("You have esGMX available")).toBeDefined();
    expect(screen.getByText("You have 100 esGMX – stake it or vest to get additional rewards")).toBeDefined();
    expect(screen.getByRole("link", { name: "Stake" }).getAttribute("href")).toBe(EARN_PORTFOLIO_STAKE_ES_GMX_LINK);
    expect(screen.getByRole("link", { name: "Vest" }).getAttribute("href")).toBe(getStartRewardsVestingPath());

    fireEvent.click(dots[3]);
    expect(screen.getByText("Referral Bonus")).toBeDefined();
    expect(screen.getByText("Refer other traders and receive 50% of their rewards")).toBeDefined();
    expect(screen.getByRole("link", { name: "Invite" }).getAttribute("href")).toBe("/referrals/affiliates");

    fireEvent.click(dots[4]);
    const nextTierTitle = screen.getByText("Almost at the next tier");
    expect(nextTierTitle.parentElement?.querySelector("p")?.textContent).toMatch(
      /Trade .* more to unlock .* status and a \+.* multiplier/
    );

    fireEvent.click(dots[5]);
    expect(screen.getByText("Activate Pair Boosts")).toBeDefined();
    expect(screen.getByText("Trade featured pairs to boost multiplier and rewards")).toBeDefined();

    fireEvent.click(dots[6]);
    expect(screen.getByText("Restake your rewards")).toBeDefined();
    expect(screen.getByText("Restake rewards to boost earnings and unlock more GMX yield.")).toBeDefined();
    expect(screen.getByRole("link", { name: "Stake rewards" }).getAttribute("href")).toBe(
      EARN_PORTFOLIO_STAKE_GMX_LINK
    );
  });
});
