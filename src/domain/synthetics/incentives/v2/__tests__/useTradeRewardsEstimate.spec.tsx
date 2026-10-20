import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "config/chains";
import { useIncentivesV2State } from "context/IncentivesV2Context/IncentivesV2Context";
import { useAccount, useUserReferralInfo } from "context/SyntheticsStateContext/hooks/globalsHooks";
import type { SyntheticsState } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useMinAffiliateRewardFactor } from "domain/synthetics/referrals/useMinAffiliateRewardFactor";
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
vi.mock("domain/synthetics/referrals/useMinAffiliateRewardFactor", () => ({
  useMinAffiliateRewardFactor: vi.fn(),
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
const SAME_ACCOUNT_DIFFERENT_CASE = "0x52908400098527886e0f7030069857d2e4169ee7";
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
    featuredMarketTokens: [],
    downgradingFactors: [],
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

const discountedFees = { ...fees, feeDiscountUsd: usd(5n) };

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
const mockUseMinAffiliateRewardFactor = vi.mocked(useMinAffiliateRewardFactor);

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
    mockUseMinAffiliateRewardFactor.mockReturnValue({ data: undefined } as ReturnType<
      typeof useMinAffiliateRewardFactor
    >);
    mockUseChainId.mockReturnValue({
      chainId: ARBITRUM,
      networkId: ARBITRUM,
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

  it("waits for the affiliate minimum when a pro discount overrides the referral discount", () => {
    mockUseUserReferralInfo.mockReturnValue({
      tierId: 0,
      totalRebateFactor: PRECISION / 5n,
      discountFactor: PRECISION / 2n,
    } as ReturnType<typeof useUserReferralInfo>);
    const view = render(<Harness {...defaultParams} fees={discountedFees} />);

    expect(mockUseMinAffiliateRewardFactor).toHaveBeenCalledWith(ARBITRUM, 0);
    expect(latestResult.estimatedRewards).toBeUndefined();

    mockUseMinAffiliateRewardFactor.mockReturnValue({ data: PRECISION / 20n } as ReturnType<
      typeof useMinAffiliateRewardFactor
    >);
    view.rerender(<Harness {...defaultParams} fees={discountedFees} />);

    expect(latestResult.estimatedRewards?.eligibleFeeUsd).toBe(usd(45n) / 10n);
    expect(latestResult.estimatedRewards?.rewardsUsd).toBe(usd(45n) / 20n);

    mockUseMinAffiliateRewardFactor.mockReturnValue({
      data: PRECISION / 20n,
      error: new Error("RPC unavailable"),
    } as ReturnType<typeof useMinAffiliateRewardFactor>);
    view.rerender(<Harness {...defaultParams} fees={discountedFees} />);
    expect(latestResult.estimatedRewards).toBeUndefined();
  });

  it.each([
    {
      name: "withholds the estimate when account status belongs to a previous epoch",
      account: ACCOUNT,
      status: makeStatus({ epochTimestamp: 1_784_073_599 }),
      expected: {
        enabled: true,
        hasKnownMultiplier: false,
        multiplier: undefined,
        rewardsUsd: undefined,
        gtPriceEnabled: true,
      },
    },
    {
      name: "uses status for the same account when checksum casing differs",
      account: SAME_ACCOUNT_DIFFERENT_CASE,
      expected: { enabled: true, hasKnownMultiplier: true, multiplier: 50n, rewardsUsd: usd(5n), gtPriceEnabled: true },
    },
    {
      name: "does not expose an estimate or enable account requests while disconnected",
      account: undefined,
      expected: {
        enabled: false,
        hasKnownMultiplier: false,
        multiplier: undefined,
        rewardsUsd: undefined,
        gtPriceEnabled: false,
      },
    },
    {
      name: "keeps the multiplier but withholds an amount when TWAP estimation is disabled",
      account: ACCOUNT,
      shouldEstimate: false,
      expected: {
        enabled: true,
        hasKnownMultiplier: true,
        multiplier: 50n,
        rewardsUsd: undefined,
        gtPriceEnabled: false,
      },
    },
  ])("$name", ({ account, status, shouldEstimate, expected }) => {
    mockUseAccount.mockReturnValue(account);
    if (status) setStatus(status);

    render(<Harness {...defaultParams} shouldEstimate={shouldEstimate} />);

    expect(mockUseAccountIncentiveStatus).toHaveBeenLastCalledWith(ARBITRUM, { account, enabled: expected.enabled });
    expect(mockUseLatestGtPrice).toHaveBeenLastCalledWith(ARBITRUM, { enabled: expected.gtPriceEnabled });
    expect(latestResult.enabled).toBe(expected.enabled);
    expect(latestResult.hasKnownMultiplier).toBe(expected.hasKnownMultiplier);
    expect(latestResult.multiplier).toBe(expected.multiplier);
    expect(latestResult.estimatedRewards?.rewardsUsd).toBe(expected.rewardsUsd);
  });
});
