import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "config/chains";
import { useIncentivesV2State } from "context/IncentivesV2Context/IncentivesV2Context";
import { useAccount, useUserReferralInfo } from "context/SyntheticsStateContext/hooks/globalsHooks";
import type { SyntheticsState } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import { useSelector } from "context/SyntheticsStateContext/utils";
import type { TradeFees } from "domain/synthetics/trade";
import { useChainId } from "lib/chains";
import { PRECISION } from "lib/numbers";
import { getTokenBySymbolSafe } from "sdk/configs/tokens";
import { getPriceImpactForPosition } from "sdk/utils/fees/priceImpact";
import type { MarketInfo } from "sdk/utils/markets/types";

import type { AccountIncentiveStatus, IncentivesConfig } from "../types";
import { useAccountIncentiveStatus } from "../useAccountIncentiveStatus";
import { useLatestGtPrice } from "../useLatestGtPrice";
import { useTradeRewardsEstimate } from "../useTradeRewardsEstimate";

vi.mock("context/IncentivesV2Context/IncentivesV2Context", () => ({
  useIncentivesV2State: vi.fn(),
}));
vi.mock("context/SyntheticsStateContext/hooks/globalsHooks", () => ({
  useAccount: vi.fn(),
  useUserReferralInfo: vi.fn(),
}));
vi.mock("context/SyntheticsStateContext/selectors/globalSelectors", () => ({
  selectAccountStats: (state: SyntheticsState) => state.globals.accountStats,
  selectTokensData: (state: SyntheticsState) => state.globals.tokensDataResult.tokensData,
}));
vi.mock("context/SyntheticsStateContext/utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("context/SyntheticsStateContext/utils")>()),
  useSelector: vi.fn(),
}));
vi.mock("domain/synthetics/incentives/v2/useAccountIncentiveStatus", () => ({
  useAccountIncentiveStatus: vi.fn(),
}));
vi.mock("domain/synthetics/incentives/v2/useLatestGtPrice", () => ({
  useLatestGtPrice: vi.fn(),
}));
vi.mock("lib/chains", () => ({
  useChainId: vi.fn(),
}));
vi.mock("sdk/configs/tokens", async (importOriginal) => ({
  ...(await importOriginal<typeof import("sdk/configs/tokens")>()),
  getTokenBySymbolSafe: vi.fn(),
}));
vi.mock("sdk/utils/fees/priceImpact", () => ({
  getPriceImpactForPosition: vi.fn(),
}));

const ACCOUNT = "0x52908400098527886E0F7030069857D2E4169EE7";
const GMX_TOKEN = "0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a";
const MARKET_TOKEN = "0xAbC0000000000000000000000000000000000001";
const INDEX_TOKEN = "0xAbC0000000000000000000000000000000000002";

function usd(value: bigint) {
  return value * PRECISION;
}

function makeConfig(overrides: Partial<IncentivesConfig> = {}): IncentivesConfig {
  return {
    epochTimestamp: 1_784_073_600,
    epochStartTimestamp: 1_781_654_400,
    programStartTimestamp: 1_781_654_400,
    epochDuration: 604_800,
    maxMultiplier: 500n,
    multiplierDecimals: 100n,
    volumeTierPersistenceEpochs: 4,
    feeShareFactor: PRECISION,
    esGmxShareFactor: PRECISION,
    gtShareFactor: 0n,
    referralRewardShareFactor: PRECISION / 2n,
    volumeTiers: [{ tier: "Tier1", threshold: 0n, multiplier: 50n }],
    stakingTiers: [],
    boosts: [
      { boost: "FeaturedMarkets", multiplier: 50n },
      { boost: "BalancingTrades", multiplier: 100n },
      { boost: "LifetimeTrading", multiplier: 100n },
      { boost: "ManualAllocation", multiplier: 200n },
    ],
    featuredMarketIndexTokens: [],
    downgradingCoefficients: [],
    balancingTradesThreshold: usd(1_000n),
    lifetimeVolumeThreshold: usd(200_000_000n),
    manualAllocationTiers: [],
    ...overrides,
  };
}

function makeStatus(overrides: Partial<AccountIncentiveStatus> = {}): AccountIncentiveStatus {
  return {
    account: ACCOUNT,
    multiplier: 50n,
    volumeTier: "Tier1",
    stakingTier: null,
    projectedVolumeTier: "Tier1",
    projectedStakingTier: null,
    epochTimestamp: 1_784_073_600,
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
    ...overrides,
  };
}

const marketInfo = {
  marketTokenAddress: MARKET_TOKEN,
  indexTokenAddress: INDEX_TOKEN,
} as MarketInfo;

const fees = {
  positionFee: {
    deltaUsd: -usd(10n),
    bps: 0n,
    precisePercentage: 0n,
  },
} satisfies TradeFees;

const defaultParams: Parameters<typeof useTradeRewardsEstimate>[0] = {
  fees,
  feesType: "increase",
  marketInfo,
  isLong: true,
  sizeDeltaUsd: usd(500n),
};

const mockUseIncentivesV2State = vi.mocked(useIncentivesV2State);
const mockUseAccount = vi.mocked(useAccount);
const mockUseUserReferralInfo = vi.mocked(useUserReferralInfo);
const mockUseSelector = vi.mocked(useSelector);
const mockUseChainId = vi.mocked(useChainId);
const mockGetTokenBySymbolSafe = vi.mocked(getTokenBySymbolSafe);
const mockGetPriceImpactForPosition = vi.mocked(getPriceImpactForPosition);
const mockUseAccountIncentiveStatus = vi.mocked(useAccountIncentiveStatus);
const mockUseLatestGtPrice = vi.mocked(useLatestGtPrice);

let latestResult: ReturnType<typeof useTradeRewardsEstimate>;

function Harness(props: Parameters<typeof useTradeRewardsEstimate>[0]) {
  latestResult = useTradeRewardsEstimate(props);
  return null;
}

function setActiveConfig(config: IncentivesConfig) {
  mockUseIncentivesV2State.mockReturnValue({
    availability: { status: "active", config, isStale: false },
    isActive: true,
    refreshConfig: vi.fn(async () => undefined),
  });
}

function setStatus(data: AccountIncentiveStatus | undefined) {
  mockUseAccountIncentiveStatus.mockReturnValue({
    data,
  } as ReturnType<typeof useAccountIncentiveStatus>);
}

describe("useTradeRewardsEstimate", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    setActiveConfig(makeConfig());
    setStatus(makeStatus());
    mockUseAccount.mockReturnValue(ACCOUNT);
    mockUseUserReferralInfo.mockReturnValue(undefined);
    mockUseChainId.mockReturnValue({
      chainId: ARBITRUM,
      srcChainId: undefined,
      isConnectedToChainId: true,
    });
    mockGetTokenBySymbolSafe.mockReturnValue({
      address: GMX_TOKEN,
    } as ReturnType<typeof getTokenBySymbolSafe>);
    mockUseLatestGtPrice.mockReturnValue({
      data: { priceUsd: PRECISION, timestamp: 1_784_073_600 },
    } as ReturnType<typeof useLatestGtPrice>);
    mockGetPriceImpactForPosition.mockReturnValue({
      priceImpactDeltaUsd: 0n,
      balanceWasImproved: false,
    });

    const selectorState = {
      globals: {
        accountStats: { volume: 0n },
        tokensDataResult: {
          tokensData: {
            [GMX_TOKEN]: {
              prices: { minPrice: PRECISION, maxPrice: PRECISION },
            },
          },
        },
      },
    } as unknown as SyntheticsState;

    mockUseSelector.mockImplementation((selector) => selector(selectorState));
  });

  afterEach(cleanup);

  it("estimates a zero-rebate reward when the account has no referral info", () => {
    render(<Harness {...defaultParams} />);

    expect(mockUseUserReferralInfo).toHaveReturnedWith(undefined);
    expect(latestResult.estimatedRewards?.eligibleFeeUsd).toBe(usd(10n));
    expect(latestResult.estimatedRewards?.effectiveMultiplier).toBe(50n);
    expect(latestResult.estimatedRewards?.rewardsUsd).toBe(usd(5n));
  });

  it("uses the position price-impact result to apply a qualifying balancing-trade boost", () => {
    const sizeDeltaUsd = usd(1_000n);
    setActiveConfig(
      makeConfig({
        volumeTiers: [],
        balancingTradesThreshold: sizeDeltaUsd,
      })
    );
    setStatus(makeStatus({ multiplier: 0n, volumeTier: null, projectedVolumeTier: null }));
    mockGetPriceImpactForPosition.mockReturnValue({
      priceImpactDeltaUsd: 0n,
      balanceWasImproved: true,
    });

    render(<Harness {...defaultParams} sizeDeltaUsd={sizeDeltaUsd} />);

    expect(mockGetPriceImpactForPosition).toHaveBeenCalledWith(marketInfo, sizeDeltaUsd, true, {
      fallbackToZero: true,
    });
    expect(latestResult.estimatedRewards?.effectiveMultiplier).toBe(100n);
    expect(latestResult.estimatedRewards?.rewardsUsd).toBe(usd(10n));
  });

  it("withholds the estimate when account status belongs to a previous epoch", () => {
    setStatus(makeStatus({ epochTimestamp: 1_784_073_599 }));

    render(<Harness {...defaultParams} />);

    expect(latestResult.hasKnownMultiplier).toBe(false);
    expect(latestResult.estimatedRewards).toBeUndefined();
  });

  it("does not expose an estimate or enable account requests while disconnected", () => {
    mockUseAccount.mockReturnValue(undefined);

    render(<Harness {...defaultParams} />);

    expect(mockUseAccountIncentiveStatus).toHaveBeenCalledWith(ARBITRUM, {
      account: undefined,
      enabled: false,
    });
    expect(mockUseLatestGtPrice).toHaveBeenCalledWith(ARBITRUM, { enabled: false });
    expect(latestResult.enabled).toBe(false);
    expect(latestResult.estimatedRewards).toBeUndefined();
  });

  it("keeps the multiplier but withholds an amount when TWAP estimation is disabled", () => {
    render(<Harness {...defaultParams} shouldEstimate={false} />);

    expect(mockUseLatestGtPrice).toHaveBeenCalledWith(ARBITRUM, { enabled: false });
    expect(latestResult.hasKnownMultiplier).toBe(true);
    expect(latestResult.multiplier).toBe(50n);
    expect(latestResult.estimatedRewards).toBeUndefined();
  });
});
