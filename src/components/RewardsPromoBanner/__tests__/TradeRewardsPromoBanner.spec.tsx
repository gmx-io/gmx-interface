import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "config/chains";
import { REWARDS_TRADE_PROMO_DISMISSED_KEY } from "config/localStorage";
import { useIncentivesV2State } from "context/IncentivesV2Context/IncentivesV2Context";
import type { AccountIncentiveStatus, IncentivesConfig } from "domain/synthetics/incentives/v2/types";
import { useAccountIncentiveStatus } from "domain/synthetics/incentives/v2/useAccountIncentiveStatus";
import { useRewardsPromoActivity } from "domain/synthetics/incentives/v2/useRewardsPromoActivity";
import { useChainId } from "lib/chains";
import { USD_DECIMALS } from "lib/numbers";
import { useIsWalletInitializing } from "lib/wallets/useIsWalletInitializing";
import useWallet from "lib/wallets/useWallet";

import { TradeRewardsPromoBanner } from "../TradeRewardsPromoBanner";

vi.mock("context/IncentivesV2Context/IncentivesV2Context", () => ({
  useIncentivesV2State: vi.fn(),
}));
vi.mock("domain/synthetics/incentives/v2/useAccountIncentiveStatus", () => ({
  useAccountIncentiveStatus: vi.fn(),
}));
vi.mock("domain/synthetics/incentives/v2/useRewardsPromoActivity", () => ({
  useRewardsPromoActivity: vi.fn(),
}));
vi.mock("lib/chains", () => ({ useChainId: vi.fn() }));
vi.mock("lib/userAnalytics/rewardsEvents", () => ({
  sendRewardsBannerEvent: vi.fn(),
  sendRewardsNavigationEvent: vi.fn(),
}));
vi.mock("lib/wallets/useIsWalletInitializing", () => ({ useIsWalletInitializing: vi.fn() }));
vi.mock("lib/wallets/useWallet", () => ({ default: vi.fn() }));

const ACCOUNT = "0x52908400098527886E0F7030069857D2E4169EE7";
const FACTOR = 10n ** BigInt(USD_DECIMALS);
const config = {
  epochTimestamp: 100,
  feeShareFactor: FACTOR,
  esGmxShareFactor: (FACTOR * 8n) / 10n,
  gtShareFactor: (FACTOR * 2n) / 10n,
  maxMultiplier: 120n,
  multiplierDecimals: 100n,
} as IncentivesConfig;
const baseStatus: AccountIncentiveStatus = {
  account: ACCOUNT,
  multiplier: 0n,
  volumeTier: null,
  stakingTier: null,
  projectedVolumeTier: null,
  projectedStakingTier: null,
  epochTimestamp: config.epochTimestamp,
  tradingVolume: 0n,
  tierVolume: 0n,
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

const mockUseIncentivesV2State = vi.mocked(useIncentivesV2State);
const mockUseAccountIncentiveStatus = vi.mocked(useAccountIncentiveStatus);
const mockUseRewardsPromoActivity = vi.mocked(useRewardsPromoActivity);
const mockUseChainId = vi.mocked(useChainId);
const mockUseIsWalletInitializing = vi.mocked(useIsWalletInitializing);
const mockUseWallet = vi.mocked(useWallet);

i18n.load({ en: {} });
i18n.activate("en");

function renderBanner() {
  return render(
    <I18nProvider i18n={i18n}>
      <MemoryRouter>
        <TradeRewardsPromoBanner />
      </MemoryRouter>
    </I18nProvider>
  );
}

function normalizeText(element: HTMLElement) {
  return element.textContent?.replace(/\s/g, "");
}

function setStatus(status?: Partial<AccountIncentiveStatus>, loading = false) {
  mockUseAccountIncentiveStatus.mockReturnValue({
    data: status ? { ...baseStatus, ...status } : undefined,
    error: undefined,
    loading,
    isValidating: false,
    mutate: vi.fn(),
    endpoint: "https://example.com/graphql",
  });
}

describe("TradeRewardsPromoBanner", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mockUseChainId.mockReturnValue({ chainId: ARBITRUM } as ReturnType<typeof useChainId>);
    mockUseIsWalletInitializing.mockReturnValue(false);
    mockUseWallet.mockReturnValue({ account: ACCOUNT, status: "connected" } as ReturnType<typeof useWallet>);
    mockUseIncentivesV2State.mockReturnValue({
      availability: { status: "active", config, isStale: false },
      isActive: true,
      refreshConfig: vi.fn(),
    });
    setStatus();
    mockUseRewardsPromoActivity.mockReturnValue({
      data: undefined,
      error: undefined,
      loading: false,
      endpoint: "https://example.com/graphql",
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("uses the config-derived maximum reward rate when no exact estimate exists", () => {
    renderBanner();

    expect(screen.getByText("Earn rewards")).toBeDefined();
    expect(screen.getByText(/receive up to 120% of your fees back/)).toBeDefined();
  });

  it("prioritizes the exact remaining manual reward cap", () => {
    setStatus({ epochTimestamp: config.epochTimestamp, manualRewardRemainingUsd: 500n * FACTOR });
    renderBanner();

    expect(normalizeText(screen.getByRole("heading", { name: /You've received bonus/ }))).toContain("$500");
    expect(screen.getByText("Start trading to redeem your rewards.")).toBeDefined();
  });

  it("shows the recent-activity estimate and staking CTA", () => {
    mockUseRewardsPromoActivity.mockReturnValue({
      data: {
        netPositionFeeUsd: 100n * FACTOR,
        firstTradeTimestamp: Math.floor(Date.now() / 1000) - 15 * 24 * 60 * 60,
      },
      error: undefined,
      loading: false,
      endpoint: "https://example.com/graphql",
    });
    renderBanner();

    expect(normalizeText(screen.getByText(/With your recent activity/))).toContain("$120inrewards");
    expect(screen.getByRole("link", { name: /Stake GMX/ }).getAttribute("href")).toBe("/earn/portfolio");
  });

  it("restores dismissals when the wallet account changes", () => {
    const otherAccount = "0x8617E340B3D01FA5F11F306F4090FD50E238070D";
    localStorage.setItem(
      JSON.stringify([REWARDS_TRADE_PROMO_DISMISSED_KEY, ARBITRUM, otherAccount]),
      JSON.stringify(true)
    );
    const view = renderBanner();
    expect(screen.getByTestId("trade-rewards-promo")).toBeDefined();

    mockUseWallet.mockReturnValue({ account: otherAccount } as ReturnType<typeof useWallet>);
    setStatus({ account: otherAccount });
    view.rerender(
      <I18nProvider i18n={i18n}>
        <MemoryRouter>
          <TradeRewardsPromoBanner />
        </MemoryRouter>
      </I18nProvider>
    );

    expect(screen.queryByTestId("trade-rewards-promo")).toBeNull();
  });

  it("does not round a positive manual reward balance down to zero", () => {
    setStatus({ epochTimestamp: config.epochTimestamp, manualRewardRemainingUsd: FACTOR / 2n });
    renderBanner();

    expect(screen.getByRole("heading", { name: /You've received bonus of < \$1/ })).toBeDefined();
  });

  it("keeps the trade promo dismissed when its variant changes", () => {
    const view = renderBanner();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByTestId("trade-rewards-promo")).toBeNull();

    setStatus({ epochTimestamp: config.epochTimestamp, manualRewardRemainingUsd: 500n * FACTOR });
    view.rerender(
      <I18nProvider i18n={i18n}>
        <MemoryRouter>
          <TradeRewardsPromoBanner />
        </MemoryRouter>
      </I18nProvider>
    );
    expect(screen.queryByRole("heading", { name: /You've received bonus/ })).toBeNull();
    expect(mockUseAccountIncentiveStatus.mock.calls.at(-1)?.[1]).toMatchObject({ enabled: false });
    expect(mockUseRewardsPromoActivity.mock.calls.at(-1)?.[1]).toMatchObject({ enabled: false });
  });

  it("does not use a manual reward cap from a different epoch", () => {
    setStatus({ epochTimestamp: config.epochTimestamp - 1, manualRewardRemainingUsd: 500n * FACTOR });
    renderBanner();

    expect(screen.queryByTestId("trade-rewards-promo")).toBeNull();
    expect(screen.queryByRole("heading", { name: /You've received bonus/ })).toBeNull();
  });

  it("hides cached personalization across an epoch rollover until current status arrives", () => {
    setStatus({ manualRewardRemainingUsd: 500n * FACTOR });
    const view = renderBanner();
    expect(screen.getByRole("heading", { name: /You've received bonus/ })).toBeDefined();

    const nextConfig = { ...config, epochTimestamp: config.epochTimestamp + 1 };
    mockUseIncentivesV2State.mockReturnValue({
      availability: { status: "active", config: nextConfig, isStale: false },
      isActive: true,
      refreshConfig: vi.fn(),
    });
    view.rerender(
      <I18nProvider i18n={i18n}>
        <MemoryRouter>
          <TradeRewardsPromoBanner />
        </MemoryRouter>
      </I18nProvider>
    );
    expect(screen.queryByTestId("trade-rewards-promo")).toBeNull();

    setStatus({ epochTimestamp: nextConfig.epochTimestamp });
    view.rerender(
      <I18nProvider i18n={i18n}>
        <MemoryRouter>
          <TradeRewardsPromoBanner />
        </MemoryRouter>
      </I18nProvider>
    );
    expect(screen.getByText(/receive up to 120% of your fees back/)).toBeDefined();
  });

  it("stays hidden while connected account status is loading or V2 is inactive", () => {
    setStatus(undefined, true);
    const view = renderBanner();
    expect(screen.queryByTestId("trade-rewards-promo")).toBeNull();

    setStatus();
    mockUseIncentivesV2State.mockReturnValue({
      availability: { status: "inactive" },
      isActive: false,
      refreshConfig: vi.fn(),
    });
    view.rerender(
      <I18nProvider i18n={i18n}>
        <MemoryRouter>
          <TradeRewardsPromoBanner />
        </MemoryRouter>
      </I18nProvider>
    );
    expect(screen.queryByTestId("trade-rewards-promo")).toBeNull();
  });

  it("retains resolved personalization during same-account revalidation", () => {
    setStatus({ manualRewardRemainingUsd: 500n * FACTOR });
    const view = renderBanner();
    expect(screen.getByRole("heading", { name: /You've received bonus/ })).toBeDefined();

    setStatus(undefined, true);
    view.rerender(
      <I18nProvider i18n={i18n}>
        <MemoryRouter>
          <TradeRewardsPromoBanner />
        </MemoryRouter>
      </I18nProvider>
    );

    expect(screen.getByRole("heading", { name: /You've received bonus/ })).toBeDefined();
  });

  it("hides during reconnect and never reuses another account's personalization", () => {
    const otherAccount = "0x8617E340B3D01FA5F11F306F4090FD50E238070D";
    setStatus({ manualRewardRemainingUsd: 500n * FACTOR });
    const view = renderBanner();
    expect(screen.getByRole("heading", { name: /You've received bonus/ })).toBeDefined();

    mockUseWallet.mockReturnValue({ account: undefined, status: "reconnecting" } as ReturnType<typeof useWallet>);
    setStatus(undefined, true);
    view.rerender(
      <I18nProvider i18n={i18n}>
        <MemoryRouter>
          <TradeRewardsPromoBanner />
        </MemoryRouter>
      </I18nProvider>
    );
    expect(screen.queryByTestId("trade-rewards-promo")).toBeNull();

    mockUseWallet.mockReturnValue({ account: otherAccount, status: "connected" } as ReturnType<typeof useWallet>);
    view.rerender(
      <I18nProvider i18n={i18n}>
        <MemoryRouter>
          <TradeRewardsPromoBanner />
        </MemoryRouter>
      </I18nProvider>
    );
    expect(screen.queryByRole("heading", { name: /You've received bonus/ })).toBeNull();

    setStatus({ account: otherAccount });
    view.rerender(
      <I18nProvider i18n={i18n}>
        <MemoryRouter>
          <TradeRewardsPromoBanner />
        </MemoryRouter>
      </I18nProvider>
    );
    expect(screen.getByText(/receive up to 120% of your fees back/)).toBeDefined();
  });

  it("stays hidden throughout a slow wallet restoration", () => {
    mockUseWallet.mockReturnValue({ account: undefined, status: "disconnected" } as ReturnType<typeof useWallet>);
    mockUseIsWalletInitializing.mockReturnValue(true);

    const view = renderBanner();
    expect(screen.queryByTestId("trade-rewards-promo")).toBeNull();

    mockUseIsWalletInitializing.mockReturnValue(false);
    view.rerender(
      <I18nProvider i18n={i18n}>
        <MemoryRouter>
          <TradeRewardsPromoBanner />
        </MemoryRouter>
      </I18nProvider>
    );
    expect(screen.getByText(/receive up to 120% of your fees back/)).toBeDefined();
  });

  it("waits for wallet reconnect when incentives activate after configuration loads", () => {
    mockUseWallet.mockReturnValue({ account: undefined, status: "disconnected" } as ReturnType<typeof useWallet>);
    mockUseIsWalletInitializing.mockReturnValue(true);
    mockUseIncentivesV2State.mockReturnValue({
      availability: { status: "loading" },
      isActive: false,
      refreshConfig: vi.fn(),
    });
    const view = renderBanner();

    mockUseIncentivesV2State.mockReturnValue({
      availability: { status: "active", config, isStale: false },
      isActive: true,
      refreshConfig: vi.fn(),
    });
    view.rerender(
      <I18nProvider i18n={i18n}>
        <MemoryRouter>
          <TradeRewardsPromoBanner />
        </MemoryRouter>
      </I18nProvider>
    );
    expect(screen.queryByTestId("trade-rewards-promo")).toBeNull();

    mockUseIsWalletInitializing.mockReturnValue(false);
    view.rerender(
      <I18nProvider i18n={i18n}>
        <MemoryRouter>
          <TradeRewardsPromoBanner />
        </MemoryRouter>
      </I18nProvider>
    );
    expect(screen.getByText(/receive up to 120% of your fees back/)).toBeDefined();
  });
});
