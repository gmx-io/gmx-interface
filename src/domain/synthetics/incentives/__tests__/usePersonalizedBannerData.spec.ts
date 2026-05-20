import { act, render } from "@testing-library/react";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("lib/chains", () => ({
  useChainId: vi.fn(),
}));

vi.mock("lib/wallets/useWallet", () => ({
  default: vi.fn(),
}));

vi.mock("../useIncentivesConfig", () => ({
  useIncentivesConfig: vi.fn(),
}));

vi.mock("../useAccountNetPositionFeesLast4Months", () => ({
  useAccountNetPositionFeesLast4Months: vi.fn(),
}));

vi.mock("../useAccountFirstTradeTimestamp", () => ({
  useAccountFirstTradeTimestamp: vi.fn(),
}));

vi.mock("../useAccountRewardsHistory", () => ({
  useAccountManualRewardsAllocation: vi.fn(),
}));

vi.mock("domain/legacy", () => ({
  useGmxPrice: vi.fn(),
}));

// Import after mocks are registered
import { ARBITRUM, AVALANCHE } from "config/chains";
import { useGmxPrice } from "domain/legacy";
import { useChainId } from "lib/chains";
import useWallet from "lib/wallets/useWallet";

import { GMX_DECIMALS_FACTOR } from "../constants";
import type { IncentivesConfig } from "../types";
import { useAccountFirstTradeTimestamp } from "../useAccountFirstTradeTimestamp";
import { useAccountNetPositionFeesLast4Months } from "../useAccountNetPositionFeesLast4Months";
import { useAccountManualRewardsAllocation } from "../useAccountRewardsHistory";
import { useIncentivesConfig } from "../useIncentivesConfig";
import { usePersonalizedBannerData } from "../usePersonalizedBannerData";

const mockUseChainId = vi.mocked(useChainId);
const mockUseWallet = vi.mocked(useWallet);
const mockUseIncentivesConfig = vi.mocked(useIncentivesConfig);
const mockUseAccountNetPositionFees = vi.mocked(useAccountNetPositionFeesLast4Months);
const mockUseAccountFirstTradeTimestamp = vi.mocked(useAccountFirstTradeTimestamp);
const mockUseAccountManualRewardsAllocation = vi.mocked(useAccountManualRewardsAllocation);
const mockUseGmxPrice = vi.mocked(useGmxPrice);

// renderHook helper (v11 of @testing-library/react does not export renderHook)
function renderHook<T>(hookFn: () => T): { current: T; rerender: () => void } {
  const ref: { current: T } = {} as any;

  function TestComponent() {
    ref.current = hookFn();
    return null;
  }

  const utils = render(React.createElement(TestComponent));
  return {
    get current() {
      return ref.current;
    },
    rerender: () => utils.rerender(React.createElement(TestComponent)),
  };
}

const USD = 10n ** 30n;
const GMX_PRECISION = GMX_DECIMALS_FACTOR;
const TWO_WEEKS_SECONDS = 14 * 24 * 60 * 60;

const NOW_SECONDS = 1_800_000_000;
const OLD_FIRST_TRADE = NOW_SECONDS - TWO_WEEKS_SECONDS - 1; // > 2 weeks ago
const RECENT_FIRST_TRADE = NOW_SECONDS - 60; // ~1 minute ago — within new-user window

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
    { tier: "Tier1", threshold: 10n * GMX_PRECISION, multiplier: 25 },
    { tier: "Tier2", threshold: 100n * GMX_PRECISION, multiplier: 50 },
    { tier: "Tier3", threshold: 1000n * GMX_PRECISION, multiplier: 100 },
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

function setupDefaults(overrides?: {
  chainId?: number;
  account?: string | undefined;
  config?: IncentivesConfig | undefined;
  configLoading?: boolean;
  netPositionFees?: bigint | undefined;
  netPositionFeesLoading?: boolean;
  firstTradeTimestamp?: number | undefined;
  firstTradeLoading?: boolean;
  manualAllocatedPoints?: bigint | undefined;
  manualAllocatedPointsLoading?: boolean;
  gmxPrice?: bigint | undefined;
  walletStatus?: string;
}) {
  const o = overrides ?? {};
  const chainId = o.chainId ?? ARBITRUM;
  const account = "account" in o ? o.account : "0x1234";

  mockUseChainId.mockReturnValue({ chainId, srcChainId: chainId } as any);
  mockUseWallet.mockReturnValue({ active: true, signer: {}, account, status: o.walletStatus } as any);
  mockUseIncentivesConfig.mockReturnValue({
    data: "config" in o ? o.config : mockConfig,
    loading: o.configLoading ?? false,
  } as any);
  mockUseAccountNetPositionFees.mockReturnValue({
    data: "netPositionFees" in o ? o.netPositionFees : 100n * USD,
    loading: o.netPositionFeesLoading ?? false,
  } as any);
  mockUseAccountFirstTradeTimestamp.mockReturnValue({
    data: "firstTradeTimestamp" in o ? o.firstTradeTimestamp : OLD_FIRST_TRADE,
    loading: o.firstTradeLoading ?? false,
  } as any);
  mockUseAccountManualRewardsAllocation.mockReturnValue({
    data: "manualAllocatedPoints" in o ? o.manualAllocatedPoints : 0n,
    loading: o.manualAllocatedPointsLoading ?? false,
  } as any);
  mockUseGmxPrice.mockReturnValue({
    gmxPrice: "gmxPrice" in o ? o.gmxPrice : 20n * USD,
    mutate: vi.fn(),
  } as any);
}

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(NOW_SECONDS * 1000));
});

describe("usePersonalizedBannerData", () => {
  it('returns "new-or-low-fees" variant when incentives not enabled (non-ARBITRUM chain)', () => {
    setupDefaults({ chainId: AVALANCHE });

    const result = renderHook(() => usePersonalizedBannerData());

    expect(result.current.bannerVariant).toBe("new-or-low-fees");
    expect(result.current.isManuallyRewarded).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('returns "new-or-low-fees" variant when no account connected', () => {
    setupDefaults({ account: undefined });

    const result = renderHook(() => usePersonalizedBannerData());

    expect(result.current.bannerVariant).toBe("new-or-low-fees");
    expect(result.current.isLoading).toBe(false);
  });

  it('returns "manual-reward" variant when there are pre-program manual allocation entries', () => {
    setupDefaults({ manualAllocatedPoints: 25n * GMX_PRECISION });

    const result = renderHook(() => usePersonalizedBannerData());

    expect(result.current.bannerVariant).toBe("manual-reward");
    expect(result.current.isManuallyRewarded).toBe(true);
    expect(result.current.manualBonusUsd).toBe(25n * 20n * USD);
  });

  it("returns correct manualBonusUsd for manually rewarded users", () => {
    const allocatedPoints = 1234n * GMX_PRECISION;
    setupDefaults({ manualAllocatedPoints: allocatedPoints });

    const result = renderHook(() => usePersonalizedBannerData());

    expect(result.current.bannerVariant).toBe("manual-reward");
    expect(result.current.manualBonusUsd).toBe((allocatedPoints * 20n * USD) / GMX_PRECISION);
  });

  it('returns "recent-activity" variant when fees >= $20 and first trade is older than 2 weeks', () => {
    setupDefaults({ netPositionFees: 50n * USD, firstTradeTimestamp: OLD_FIRST_TRADE });

    const result = renderHook(() => usePersonalizedBannerData());

    expect(result.current.bannerVariant).toBe("recent-activity");
  });

  it("calculates estimatedRewardsUsd from netPositionFeesLast4Months", () => {
    setupDefaults({ netPositionFees: 500n * USD });

    const result = renderHook(() => usePersonalizedBannerData());

    expect(result.current.bannerVariant).toBe("recent-activity");
    // $500 fees * 50% max discount = $250
    expect(result.current.estimatedRewardsUsd).toBe(250);
  });

  it('returns "new-or-low-fees" when recent fees are below the display threshold', () => {
    setupDefaults({ netPositionFees: 5n * USD });

    const result = renderHook(() => usePersonalizedBannerData());

    expect(result.current.bannerVariant).toBe("new-or-low-fees");
    expect(result.current.estimatedRewardsUsd).toBeUndefined();
  });

  it('returns "new-or-low-fees" when first trade is within the new-user window', () => {
    setupDefaults({ netPositionFees: 500n * USD, firstTradeTimestamp: RECENT_FIRST_TRADE });

    const result = renderHook(() => usePersonalizedBannerData());

    expect(result.current.bannerVariant).toBe("new-or-low-fees");
  });

  it('returns "new-or-low-fees" when the user has never traded (firstTradeTimestamp undefined)', () => {
    setupDefaults({ netPositionFees: 500n * USD, firstTradeTimestamp: undefined });

    const result = renderHook(() => usePersonalizedBannerData());

    expect(result.current.bannerVariant).toBe("new-or-low-fees");
  });

  it("estimates trade banner rewards as up to 50% of recent open and close fees", () => {
    setupDefaults({ netPositionFees: 50n * USD });
    const result = renderHook(() => usePersonalizedBannerData());

    expect(result.current.bannerVariant).toBe("recent-activity");
    // $50 fees * 50% max discount = $25
    expect(result.current.estimatedRewardsUsd).toBe(25);
  });

  it("does not use multiplier config for the simplified trade banner estimate", () => {
    const configLowCap: IncentivesConfig = { ...mockConfig, maxMultiplier: 200 };
    setupDefaults({ netPositionFees: 250n * USD, config: configLowCap });
    const result1 = renderHook(() => usePersonalizedBannerData());

    const configHighCap: IncentivesConfig = { ...mockConfig, maxMultiplier: 1000 };
    setupDefaults({ netPositionFees: 250n * USD, config: configHighCap });
    const result2 = renderHook(() => usePersonalizedBannerData());

    expect(result1.current.estimatedRewardsUsd).toBe(125);
    expect(result2.current.estimatedRewardsUsd).toBe(125);
  });

  it("does not use boost config for the simplified trade banner estimate", () => {
    const configSmallBoosts: IncentivesConfig = {
      ...mockConfig,
      boosts: [{ boost: "FeaturedMarkets", multiplier: 10 }],
    };
    setupDefaults({ netPositionFees: 250n * USD, config: configSmallBoosts });
    const result1 = renderHook(() => usePersonalizedBannerData());

    const configLargeBoosts: IncentivesConfig = {
      ...mockConfig,
      boosts: [
        { boost: "FeaturedMarkets", multiplier: 100 },
        { boost: "BalancingTrades", multiplier: 100 },
        { boost: "LifetimeTrading", multiplier: 100 },
      ],
    };
    setupDefaults({ netPositionFees: 250n * USD, config: configLargeBoosts });
    const result2 = renderHook(() => usePersonalizedBannerData());

    expect(result1.current.estimatedRewardsUsd).toBe(125);
    expect(result2.current.estimatedRewardsUsd).toBe(125);
  });

  it("waits for incentives config before selecting a banner for connected wallets", () => {
    setupDefaults({ netPositionFees: 500n * USD, config: undefined });

    const result = renderHook(() => usePersonalizedBannerData());

    expect(result.current.bannerVariant).toBeUndefined();
    expect(result.current.isLoading).toBe(true);
  });

  it("waits for manual allocation lookup before falling back to a generic banner", () => {
    setupDefaults({ netPositionFees: 500n * USD, manualAllocatedPoints: undefined });

    const result = renderHook(() => usePersonalizedBannerData());

    expect(result.current.bannerVariant).toBeUndefined();
    expect(result.current.isLoading).toBe(true);
  });

  it("does not show the disconnected fallback while wallet account is reconnecting", () => {
    setupDefaults({ account: undefined, walletStatus: "reconnecting" });

    const result = renderHook(() => usePersonalizedBannerData());

    expect(result.current.bannerVariant).toBeUndefined();
    expect(result.current.isLoading).toBe(true);
  });

  it("does not show the account banner while wallet status is still connecting", () => {
    setupDefaults({ account: "0x1234", walletStatus: "connecting", manualAllocatedPoints: 25n * GMX_PRECISION });

    const result = renderHook(() => usePersonalizedBannerData());

    expect(result.current.bannerVariant).toBeUndefined();
    expect(result.current.isLoading).toBe(true);
  });

  it("briefly waits for a stored wallet connector before showing the disconnected fallback", () => {
    window.localStorage.setItem("wagmi.recentConnectorId", "injected");
    setupDefaults({ account: undefined, walletStatus: "disconnected" });

    const result = renderHook(() => usePersonalizedBannerData());

    expect(result.current.bannerVariant).toBeUndefined();
    expect(result.current.isLoading).toBe(true);

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current.bannerVariant).toBe("new-or-low-fees");
    expect(result.current.isLoading).toBe(false);
  });

  it("keeps the resolved account banner during transient SWR loading gaps", () => {
    setupDefaults({ netPositionFees: 50n * USD, firstTradeTimestamp: OLD_FIRST_TRADE });
    const result = renderHook(() => usePersonalizedBannerData());

    expect(result.current.bannerVariant).toBe("recent-activity");
    expect(result.current.estimatedRewardsUsd).toBe(25);

    setupDefaults({
      netPositionFees: undefined,
      netPositionFeesLoading: true,
      firstTradeTimestamp: undefined,
      firstTradeLoading: true,
    });
    result.rerender();

    expect(result.current.bannerVariant).toBe("recent-activity");
    expect(result.current.estimatedRewardsUsd).toBe(25);
    expect(result.current.isLoading).toBe(false);
  });

  it("keeps a resolved manual reward banner during transient GMX price gaps", () => {
    setupDefaults({ manualAllocatedPoints: 25n * GMX_PRECISION, gmxPrice: 20n * USD });
    const result = renderHook(() => usePersonalizedBannerData());

    expect(result.current.bannerVariant).toBe("manual-reward");
    expect(result.current.manualBonusUsd).toBe(25n * 20n * USD);

    setupDefaults({ manualAllocatedPoints: 25n * GMX_PRECISION, gmxPrice: undefined });
    result.rerender();

    expect(result.current.bannerVariant).toBe("manual-reward");
    expect(result.current.manualBonusUsd).toBe(25n * 20n * USD);
    expect(result.current.isLoading).toBe(false);
  });

  it("does not leak a resolved banner into a new account while that account is loading", () => {
    setupDefaults({ account: "0x1234", netPositionFees: 50n * USD, firstTradeTimestamp: OLD_FIRST_TRADE });
    const result = renderHook(() => usePersonalizedBannerData());

    expect(result.current.bannerVariant).toBe("recent-activity");

    setupDefaults({
      account: "0xabcd",
      netPositionFees: undefined,
      netPositionFeesLoading: true,
      firstTradeTimestamp: undefined,
      firstTradeLoading: true,
      manualAllocatedPoints: undefined,
      manualAllocatedPointsLoading: true,
    });
    result.rerender();

    expect(result.current.bannerVariant).toBeUndefined();
    expect(result.current.isLoading).toBe(true);
  });

  it("requires GMX price for manual allocation USD value (stays loading)", () => {
    setupDefaults({ manualAllocatedPoints: 25n * GMX_PRECISION, gmxPrice: 0n });

    const result = renderHook(() => usePersonalizedBannerData());

    expect(result.current.bannerVariant).toBeUndefined();
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isManuallyRewarded).toBe(true);
  });

  it("returns isLoading: true when first trade timestamp is loading", () => {
    setupDefaults({ firstTradeTimestamp: undefined, firstTradeLoading: true });

    const result = renderHook(() => usePersonalizedBannerData());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.bannerVariant).toBeUndefined();
  });

  it('returns "new-or-low-fees" when netPositionFees is undefined', () => {
    setupDefaults({ netPositionFees: undefined });

    const result = renderHook(() => usePersonalizedBannerData());

    expect(result.current.bannerVariant).toBe("new-or-low-fees");
  });

  it('returns "new-or-low-fees" when netPositionFees is zero', () => {
    setupDefaults({ netPositionFees: 0n });

    const result = renderHook(() => usePersonalizedBannerData());

    expect(result.current.bannerVariant).toBe("new-or-low-fees");
  });
});
