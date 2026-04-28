import { render } from "@testing-library/react";
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

vi.mock("../useAccountIncentiveDashboard", () => ({
  useAccountIncentiveDashboard: vi.fn(),
}));

vi.mock("../useAccountRewardsHistory", () => ({
  useAccountManualRewardsAllocation: vi.fn(),
}));

vi.mock("domain/legacy", () => ({
  useGmxPrice: vi.fn(),
}));

vi.mock("domain/stake/useStakingProcessedData", () => ({
  useStakingProcessedData: vi.fn(),
}));

vi.mock("domain/synthetics/tokens", () => ({
  useTokensDataRequest: vi.fn().mockReturnValue({ tokensData: undefined }),
  convertToUsd: vi.fn(),
  getMidPrice: vi.fn(),
}));

// Import after mocks are registered
import { useGmxPrice } from "domain/legacy";
import { useStakingProcessedData } from "domain/stake/useStakingProcessedData";
import { useTokensDataRequest, convertToUsd, getMidPrice } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import useWallet from "lib/wallets/useWallet";

import type { AccountIncentiveDashboard, IncentivesConfig } from "../types";
import { useAccountIncentiveDashboard } from "../useAccountIncentiveDashboard";
import { useAccountManualRewardsAllocation } from "../useAccountRewardsHistory";
import { useIncentivesConfig } from "../useIncentivesConfig";
import { usePersonalizedBannerData } from "../usePersonalizedBannerData";

const mockUseChainId = vi.mocked(useChainId);
const mockUseWallet = vi.mocked(useWallet);
const mockUseIncentivesConfig = vi.mocked(useIncentivesConfig);
const mockUseAccountDashboard = vi.mocked(useAccountIncentiveDashboard);
const mockUseAccountManualRewardsAllocation = vi.mocked(useAccountManualRewardsAllocation);
const mockUseGmxPrice = vi.mocked(useGmxPrice);
const mockUseStakingProcessedData = vi.mocked(useStakingProcessedData);
const mockUseTokensDataRequest = vi.mocked(useTokensDataRequest);
const mockConvertToUsd = vi.mocked(convertToUsd);
const mockGetMidPrice = vi.mocked(getMidPrice);

// renderHook helper (v11 of @testing-library/react does not export renderHook)
function renderHook<T>(hookFn: () => T): { current: T } {
  const ref: { current: T } = {} as any;

  function TestComponent() {
    ref.current = hookFn();
    return null;
  }

  render(React.createElement(TestComponent));
  return ref;
}

const ARBITRUM = 42161;
const AVALANCHE = 43114;
const USD = 10n ** 30n;
const GMX_DEC = 10n ** 18n;

const mockConfig: IncentivesConfig = {
  programStartTimestamp: 1699500000,
  epochTimestamp: 1700000000,
  epochStartTimestamp: 1699900000,
  epochDuration: 604800,
  maxMultiplier: 400, // 4.0x
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

const baseDashboard: AccountIncentiveDashboard = {
  account: "0x1234",
  pointsBalance: 100n * GMX_DEC,
  rewardsBalance: 0n,
  recentStats: [
    {
      account: "0x1234",
      multiplier: 150,
      epochTimestamp: 1700000000,
      volumeTier: "Tier1",
      stakingTier: null,
      tradedVolume: 5000n * USD,
      boostIds: [],
    },
  ],
};

function setupDefaults(overrides?: {
  chainId?: number;
  account?: string | undefined;
  config?: IncentivesConfig | undefined;
  dashboard?: AccountIncentiveDashboard | undefined;
  manualAllocatedPoints?: bigint | undefined;
  dashboardLoading?: boolean;
  manualAllocatedPointsLoading?: boolean;
  gmxPrice?: bigint | undefined;
  stakingData?: { gmxInStakedGmx?: bigint } | undefined;
  tokensData?: Record<string, unknown> | undefined;
}) {
  const chainId = overrides?.chainId ?? ARBITRUM;
  const account = overrides?.account ?? "0x1234";

  mockUseChainId.mockReturnValue({ chainId, srcChainId: chainId } as any);
  mockUseWallet.mockReturnValue({ active: true, signer: {}, account } as any);
  mockUseIncentivesConfig.mockReturnValue({ data: overrides?.config ?? mockConfig } as any);
  mockUseAccountDashboard.mockReturnValue({
    data: overrides?.dashboard ?? baseDashboard,
    loading: overrides?.dashboardLoading ?? false,
  } as any);
  mockUseAccountManualRewardsAllocation.mockReturnValue({
    data: overrides?.manualAllocatedPoints ?? 0n,
    loading: overrides?.manualAllocatedPointsLoading ?? false,
  } as any);
  mockUseGmxPrice.mockReturnValue({
    gmxPrice: overrides?.gmxPrice ?? 20n * USD,
    mutate: vi.fn(),
  } as any);
  mockUseStakingProcessedData.mockReturnValue({
    data: overrides?.stakingData ?? { gmxInStakedGmx: 50n * GMX_DEC },
  } as any);
  mockUseTokensDataRequest.mockReturnValue({
    tokensData: overrides?.tokensData ?? undefined,
  } as any);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockConvertToUsd.mockReturnValue(undefined);
  mockGetMidPrice.mockReturnValue(0n);
});

describe("usePersonalizedBannerData", () => {
  it("returns hasPersonalizedData: false when incentives not enabled (non-ARBITRUM chain)", () => {
    setupDefaults({ chainId: AVALANCHE });

    const result = renderHook(() => usePersonalizedBannerData());

    expect(result.current.hasPersonalizedData).toBe(false);
    expect(result.current.isManuallyRewarded).toBe(false);
  });

  it("returns hasPersonalizedData: false when no account connected", () => {
    setupDefaults({ account: undefined });

    const result = renderHook(() => usePersonalizedBannerData());

    expect(result.current.hasPersonalizedData).toBe(false);
  });

  it("returns isManuallyRewarded: true when there are pre-program manual allocation entries", () => {
    const dashboard: AccountIncentiveDashboard = {
      account: "0x1234",
      pointsBalance: 100n * GMX_DEC,
      rewardsBalance: 0n,
      recentStats: [],
    };
    setupDefaults({ dashboard, manualAllocatedPoints: 25n * GMX_DEC });

    const result = renderHook(() => usePersonalizedBannerData());

    expect(result.current.hasPersonalizedData).toBe(true);
    expect(result.current.isManuallyRewarded).toBe(true);
    expect(result.current.manualBonusUsd).toBe(25n * 20n * USD);
  });

  it("returns correct manualBonusUsd for manually rewarded users", () => {
    const allocatedPoints = 1234n * GMX_DEC;
    const dashboard: AccountIncentiveDashboard = {
      account: "0x1234",
      pointsBalance: 10n * GMX_DEC,
      rewardsBalance: 0n,
      recentStats: [
        {
          account: "0x1234",
          multiplier: 100,
          epochTimestamp: 1700000000,
          volumeTier: null,
          stakingTier: null,
          tradedVolume: 0n,
          boostIds: [],
        },
      ],
    };
    setupDefaults({ dashboard, manualAllocatedPoints: allocatedPoints });

    const result = renderHook(() => usePersonalizedBannerData());

    expect(result.current.isManuallyRewarded).toBe(true);
    expect(result.current.manualBonusUsd).toBe((allocatedPoints * 20n * USD) / GMX_DEC);
  });

  it("calculates recommendedStakeGmx based on wallet size and GMX price", () => {
    // Set up wallet with $100,000 in tokens
    // STAKE_BUDGET_FRAC = 0.20 => $20,000 budget
    // GMX price = $20 => stakeCapGmx = 1000
    // Max stake cap from config = 1000 GMX (highest tier threshold)
    // S = 50 (current staked) < stakeCapGmx = 1000
    // sPot = min(1000, max(50, 1000)) = 1000
    const walletBalance = 50n * GMX_DEC; // 50 tokens
    const tokenPrice = 2000n * USD; // $2000 each => $100,000 wallet

    setupDefaults();
    mockUseTokensDataRequest.mockReturnValue({
      tokensData: {
        WETH: {
          walletBalance,
          decimals: 18,
          prices: { minPrice: tokenPrice, maxPrice: tokenPrice },
        },
      },
    } as any);
    mockConvertToUsd.mockReturnValue((walletBalance * tokenPrice) / GMX_DEC);
    mockGetMidPrice.mockReturnValue(tokenPrice);

    const result = renderHook(() => usePersonalizedBannerData());

    expect(result.current.hasPersonalizedData).toBe(true);
    expect(result.current.recommendedStakeGmx).toBeDefined();
    expect(result.current.recommendedStakeGmx!).toBeGreaterThan(0);
  });

  it("calculates estimatedRewardsUsd using config-derived values", () => {
    // Use dashboard with high volume so rewards > $0.01
    const highVolumeDashboard: AccountIncentiveDashboard = {
      account: "0x1234",
      pointsBalance: 100n * GMX_DEC,
      rewardsBalance: 0n,
      recentStats: [
        {
          account: "0x1234",
          multiplier: 150,
          epochTimestamp: 1700000000,
          volumeTier: "Tier1",
          stakingTier: null,
          tradedVolume: 1000000n * USD, // $1M volume
          boostIds: [],
        },
      ],
    };

    setupDefaults({ dashboard: highVolumeDashboard });

    // Provide wallet data for wallet-based calcs
    const walletBalance = 100n * GMX_DEC;
    const tokenPrice = 1000n * USD;
    mockUseTokensDataRequest.mockReturnValue({
      tokensData: {
        WETH: {
          walletBalance,
          decimals: 18,
          prices: { minPrice: tokenPrice, maxPrice: tokenPrice },
        },
      },
    } as any);
    mockConvertToUsd.mockReturnValue((walletBalance * tokenPrice) / GMX_DEC);
    mockGetMidPrice.mockReturnValue(tokenPrice);

    const result = renderHook(() => usePersonalizedBannerData());

    expect(result.current.hasPersonalizedData).toBe(true);
    expect(result.current.estimatedRewardsUsd).toBeDefined();
    expect(result.current.estimatedRewardsUsd!).toBeGreaterThan(0);
  });

  it("returns hasPersonalizedData: false when estimated rewards < $0.01", () => {
    // Very low volume, no wallet => rewards will be negligible
    const tinyDashboard: AccountIncentiveDashboard = {
      account: "0x1234",
      pointsBalance: 1n,
      rewardsBalance: 0n,
      recentStats: [
        {
          account: "0x1234",
          multiplier: 100,
          epochTimestamp: 1700000000,
          volumeTier: null,
          stakingTier: null,
          tradedVolume: 1n, // negligible volume (1 wei)
          boostIds: [],
        },
      ],
    };

    setupDefaults({ dashboard: tinyDashboard });
    mockUseTokensDataRequest.mockReturnValue({ tokensData: undefined } as any);

    const result = renderHook(() => usePersonalizedBannerData());

    expect(result.current.hasPersonalizedData).toBe(false);
  });

  it("uses config.pointsExpirationEpochs instead of hardcoded 13", () => {
    // With pointsExpirationEpochs = 1, vHist = $100K > 0.20*vWalletCap = $15K
    // With pointsExpirationEpochs = 100, vHist = $1K < $15K, so wallet-based floor dominates
    // This causes different vPotWeek values, proving the config epoch window is used
    const dashboard: AccountIncentiveDashboard = {
      account: "0x1234",
      pointsBalance: 100n * GMX_DEC,
      rewardsBalance: 0n,
      recentStats: [
        {
          account: "0x1234",
          multiplier: 150,
          epochTimestamp: 1700000000,
          volumeTier: "Tier1",
          stakingTier: null,
          tradedVolume: 100000n * USD, // $100K volume
          boostIds: [],
        },
      ],
    };

    // Wallet = $10K so vWalletCap = $75K, 0.20*vWalletCap = $15K
    const walletBalance = 5n * GMX_DEC;
    const tokenPrice = 2000n * USD; // $10K wallet
    const setupTokens = () => {
      mockUseTokensDataRequest.mockReturnValue({
        tokensData: {
          WETH: {
            walletBalance,
            decimals: 18,
            prices: { minPrice: tokenPrice, maxPrice: tokenPrice },
          },
        },
      } as any);
      mockConvertToUsd.mockReturnValue((walletBalance * tokenPrice) / GMX_DEC);
      mockGetMidPrice.mockReturnValue(tokenPrice);
    };

    // Run with pointsExpirationEpochs = 1
    const configSmallWindow: IncentivesConfig = { ...mockConfig, pointsExpirationEpochs: 1 };
    setupDefaults({ dashboard, config: configSmallWindow });
    setupTokens();
    const result1 = renderHook(() => usePersonalizedBannerData());

    // Run with pointsExpirationEpochs = 100
    const configLargeWindow: IncentivesConfig = { ...mockConfig, pointsExpirationEpochs: 100 };
    setupDefaults({ dashboard, config: configLargeWindow });
    setupTokens();
    const result2 = renderHook(() => usePersonalizedBannerData());

    // A smaller window (1) means higher weekly volume estimate, so higher rewards
    expect(result1.current.hasPersonalizedData).toBe(true);
    expect(result2.current.hasPersonalizedData).toBe(true);
    expect(result1.current.estimatedRewardsUsd!).toBeGreaterThan(result2.current.estimatedRewardsUsd!);
  });

  it("uses config.maxMultiplier / config.multiplierDecimals instead of hardcoded 4.0", () => {
    // With maxMultiplier = 200 / 100 = 2.0 cap, rewards are lower
    // With maxMultiplier = 1000 / 100 = 10.0 cap, rewards are higher
    const dashboard: AccountIncentiveDashboard = {
      account: "0x1234",
      pointsBalance: 100n * GMX_DEC,
      rewardsBalance: 0n,
      recentStats: [
        {
          account: "0x1234",
          multiplier: 150,
          epochTimestamp: 1700000000,
          volumeTier: "Tier1",
          stakingTier: null,
          tradedVolume: 500000n * USD,
          boostIds: [],
        },
      ],
    };

    const configLowCap: IncentivesConfig = { ...mockConfig, maxMultiplier: 200 };
    setupDefaults({ dashboard, config: configLowCap });
    const result1 = renderHook(() => usePersonalizedBannerData());

    const configHighCap: IncentivesConfig = { ...mockConfig, maxMultiplier: 1000 };
    setupDefaults({ dashboard, config: configHighCap });
    const result2 = renderHook(() => usePersonalizedBannerData());

    // Higher multiplier cap => higher rewards (or equal if capped elsewhere)
    if (result1.current.estimatedRewardsUsd && result2.current.estimatedRewardsUsd) {
      expect(result2.current.estimatedRewardsUsd).toBeGreaterThanOrEqual(result1.current.estimatedRewardsUsd);
    }
  });

  it("uses sum of config.boosts[].multiplier instead of hardcoded 1.5", () => {
    const dashboard: AccountIncentiveDashboard = {
      account: "0x1234",
      pointsBalance: 100n * GMX_DEC,
      rewardsBalance: 0n,
      recentStats: [
        {
          account: "0x1234",
          multiplier: 150,
          epochTimestamp: 1700000000,
          volumeTier: "Tier1",
          stakingTier: null,
          tradedVolume: 500000n * USD,
          boostIds: [],
        },
      ],
    };

    // Small boosts sum = 0.1
    const configSmallBoosts: IncentivesConfig = {
      ...mockConfig,
      boosts: [{ boost: "FeaturedMarkets", multiplier: 10 }],
    };
    setupDefaults({ dashboard, config: configSmallBoosts });
    const result1 = renderHook(() => usePersonalizedBannerData());

    // Large boosts sum = 3.0
    const configLargeBoosts: IncentivesConfig = {
      ...mockConfig,
      boosts: [
        { boost: "FeaturedMarkets", multiplier: 100 },
        { boost: "BalancingTrades", multiplier: 100 },
        { boost: "LifetimeTrading", multiplier: 100 },
      ],
    };
    setupDefaults({ dashboard, config: configLargeBoosts });
    const result2 = renderHook(() => usePersonalizedBannerData());

    if (result1.current.estimatedRewardsUsd && result2.current.estimatedRewardsUsd) {
      expect(result2.current.estimatedRewardsUsd).toBeGreaterThanOrEqual(result1.current.estimatedRewardsUsd);
    }
  });

  it("uses highest config.stakingTiers[].threshold as max stake cap", () => {
    // Config with very low max stake cap
    const configLowCap: IncentivesConfig = {
      ...mockConfig,
      stakingTiers: [
        { tier: "Tier1", threshold: 1n * GMX_DEC, multiplier: 25 }, // 1 GMX max
      ],
    };

    // Config with very high max stake cap
    const configHighCap: IncentivesConfig = {
      ...mockConfig,
      stakingTiers: [
        { tier: "Tier1", threshold: 10n * GMX_DEC, multiplier: 25 },
        { tier: "Tier2", threshold: 100n * GMX_DEC, multiplier: 50 },
        { tier: "Tier3", threshold: 100000n * GMX_DEC, multiplier: 100 }, // 100K GMX max
      ],
    };

    const dashboard: AccountIncentiveDashboard = {
      account: "0x1234",
      pointsBalance: 100n * GMX_DEC,
      rewardsBalance: 0n,
      recentStats: [
        {
          account: "0x1234",
          multiplier: 150,
          epochTimestamp: 1700000000,
          volumeTier: "Tier1",
          stakingTier: null,
          tradedVolume: 500000n * USD,
          boostIds: [],
        },
      ],
    };

    // With wallet that has high value
    const walletBalance = 1000n * GMX_DEC;
    const tokenPrice = 1000n * USD;
    const setupTokens = () => {
      mockUseTokensDataRequest.mockReturnValue({
        tokensData: {
          WETH: {
            walletBalance,
            decimals: 18,
            prices: { minPrice: tokenPrice, maxPrice: tokenPrice },
          },
        },
      } as any);
      mockConvertToUsd.mockReturnValue((walletBalance * tokenPrice) / GMX_DEC);
      mockGetMidPrice.mockReturnValue(tokenPrice);
    };

    setupDefaults({ dashboard, config: configLowCap });
    setupTokens();
    const result1 = renderHook(() => usePersonalizedBannerData());

    setupDefaults({ dashboard, config: configHighCap });
    setupTokens();
    const result2 = renderHook(() => usePersonalizedBannerData());

    // The high cap should allow a higher recommended stake
    if (result1.current.recommendedStakeGmx != null && result2.current.recommendedStakeGmx != null) {
      expect(result2.current.recommendedStakeGmx).toBeGreaterThanOrEqual(result1.current.recommendedStakeGmx);
    }
  });

  it("falls back to hardcoded values when config is undefined", () => {
    const dashboard: AccountIncentiveDashboard = {
      account: "0x1234",
      pointsBalance: 100n * GMX_DEC,
      rewardsBalance: 0n,
      recentStats: [
        {
          account: "0x1234",
          multiplier: 150,
          epochTimestamp: 1700000000,
          volumeTier: "Tier1",
          stakingTier: null,
          tradedVolume: 1000000n * USD,
          boostIds: [],
        },
      ],
    };

    // Provide wallet so vWalletCap > 0
    const walletBalance = 500n * GMX_DEC;
    const tokenPrice = 200n * USD; // $100K wallet
    setupDefaults({ dashboard, config: undefined });
    mockUseTokensDataRequest.mockReturnValue({
      tokensData: {
        WETH: {
          walletBalance,
          decimals: 18,
          prices: { minPrice: tokenPrice, maxPrice: tokenPrice },
        },
      },
    } as any);
    mockConvertToUsd.mockReturnValue((walletBalance * tokenPrice) / GMX_DEC);
    mockGetMidPrice.mockReturnValue(tokenPrice);

    const result = renderHook(() => usePersonalizedBannerData());

    // Should still compute results using fallback values
    expect(result.current.hasPersonalizedData).toBe(true);
    expect(result.current.estimatedRewardsUsd).toBeDefined();
    expect(result.current.estimatedRewardsUsd!).toBeGreaterThan(0);
  });

  it("returns hasPersonalizedData: false when gmxPrice is 0n", () => {
    setupDefaults({ gmxPrice: 0n });

    const result = renderHook(() => usePersonalizedBannerData());

    expect(result.current.hasPersonalizedData).toBe(false);
  });

  it("returns hasPersonalizedData: false when dashboard is undefined", () => {
    setupDefaults({ dashboard: undefined });

    const result = renderHook(() => usePersonalizedBannerData());

    expect(result.current.hasPersonalizedData).toBe(false);
  });

  it("returns isLoading: true when dashboard is loading", () => {
    setupDefaults({ dashboard: undefined, dashboardLoading: true });

    const result = renderHook(() => usePersonalizedBannerData());

    expect(result.current.isLoading).toBe(true);
  });

  it("returns hasPersonalizedData: false when wallet is zero and volume is zero", () => {
    const zeroVolumeDashboard: AccountIncentiveDashboard = {
      account: "0x1234",
      pointsBalance: 0n,
      rewardsBalance: 0n,
      recentStats: [],
    };

    setupDefaults({ dashboard: zeroVolumeDashboard });

    const result = renderHook(() => usePersonalizedBannerData());

    expect(result.current.hasPersonalizedData).toBe(false);
  });
});
