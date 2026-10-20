import { act, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM, AVALANCHE } from "config/chains";
import { useIncentivesV2State } from "context/IncentivesV2Context/IncentivesV2Context";
import type { IncentivesAvailability } from "domain/synthetics/incentives/v2/availability";
import type { AccountIncentiveStatus, IncentivesConfig, LeaderboardEntry } from "domain/synthetics/incentives/v2/types";
import { useAccountIncentiveStatus } from "domain/synthetics/incentives/v2/useAccountIncentiveStatus";
import { useIncentivesLeaderboard } from "domain/synthetics/incentives/v2/useIncentivesLeaderboard";

import { useRewardsPageData } from "../useRewardsPageData";

vi.mock("domain/synthetics/incentives/v2/useAccountIncentiveStatus", () => ({
  useAccountIncentiveStatus: vi.fn(),
}));
vi.mock("context/IncentivesV2Context/IncentivesV2Context", () => ({
  useIncentivesV2State: vi.fn(),
}));
vi.mock("domain/synthetics/incentives/v2/useIncentivesLeaderboard", () => ({
  useIncentivesLeaderboard: vi.fn(),
}));

const CHECKSUMMED_ACCOUNT = "0x52908400098527886E0F7030069857D2E4169EE7";

const config = {
  epochTimestamp: 100,
  epochDuration: 50,
} as IncentivesConfig;

const accountStatus = {
  account: CHECKSUMMED_ACCOUNT,
  epochTimestamp: config.epochTimestamp,
} as AccountIncentiveStatus;

const allTimeSummary = {
  address: CHECKSUMMED_ACCOUNT,
  rank: 7,
  multiplier: null,
} as LeaderboardEntry;

const mutateConfig = vi.fn(async () => undefined);
const mutateAccountStatus = vi.fn(async () => undefined);
const mutateAllTimeSummary = vi.fn(async () => undefined);

const mockUseIncentivesV2State = vi.mocked(useIncentivesV2State);
const mockUseAccountIncentiveStatus = vi.mocked(useAccountIncentiveStatus);
const mockUseIncentivesLeaderboard = vi.mocked(useIncentivesLeaderboard);

function setAvailability(availability: IncentivesAvailability) {
  mockUseIncentivesV2State.mockReturnValue({
    availability,
    isActive: availability.status === "active",
    refreshConfig: mutateConfig,
  });
}

function setConfigRequest(data: IncentivesConfig | null | undefined, error?: unknown) {
  if (data && typeof data === "object") {
    setAvailability({ status: "active", config: data, isStale: Boolean(error) });
  } else if (data === null) {
    setAvailability({ status: "inactive" });
  } else if (error) {
    setAvailability({ status: "error", error: error instanceof Error ? error : new Error(String(error)) });
  } else {
    setAvailability({ status: "loading" });
  }
}

function setAccountStatusRequest(data: AccountIncentiveStatus | undefined, loading = false) {
  mockUseAccountIncentiveStatus.mockReturnValue({
    data,
    error: undefined,
    loading,
    isValidating: false,
    mutate: mutateAccountStatus,
    endpoint: "https://example.com/graphql",
  });
}

function setAllTimeSummaryRequest(data: LeaderboardEntry[] | undefined, loading = false, error?: unknown) {
  mockUseIncentivesLeaderboard.mockReturnValue({
    data,
    totalCount: data?.length,
    hasNextPage: false,
    error,
    loading,
    isValidating: false,
    mutate: mutateAllTimeSummary,
    endpoint: "https://example.com/graphql",
  });
}

type HarnessProps = {
  chainId: number;
  account?: string;
  loadTierAccountData?: boolean;
};

let latestResult: ReturnType<typeof useRewardsPageData>;

function Harness({ chainId, account, loadTierAccountData = true }: HarnessProps) {
  latestResult = useRewardsPageData({ chainId, account, loadTierAccountData });
  return null;
}

describe("useRewardsPageData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setConfigRequest(config);
    setAccountStatusRequest(accountStatus);
    setAllTimeSummaryRequest([allTimeSummary]);
  });

  const previousEpochStatus = { ...accountStatus, epochTimestamp: config.epochTimestamp - config.epochDuration };

  it.each([
    { name: "active config", enabled: true, canLoadAllTime: true, hasAccountStatus: true, hasSummary: true },
    {
      name: "unresolved config",
      availability: { status: "loading" } as const,
      enabled: false,
      canLoadAllTime: true,
    },
    { name: "other rewards tab", loadTierAccountData: false, enabled: false, canLoadAllTime: true },
    {
      name: "unsupported chain",
      chainId: AVALANCHE,
      availability: { status: "unsupported-chain" } as const,
      enabled: false,
      canLoadAllTime: false,
    },
    { name: "inactive config", availability: { status: "inactive" } as const, enabled: false, canLoadAllTime: true },
    {
      name: "config error",
      availability: { status: "error", error: new Error("Unavailable") } as const,
      enabled: false,
      canLoadAllTime: true,
    },
    { name: "disconnected account", account: null, loading: true, enabled: false, canLoadAllTime: true },
    {
      name: "account status from a different epoch",
      status: previousEpochStatus,
      enabled: true,
      canLoadAllTime: true,
      hasSummary: true,
      isMixedEpoch: true,
    },
  ])(
    "gates account queries for $name",
    ({
      chainId = ARBITRUM,
      account = CHECKSUMMED_ACCOUNT,
      loadTierAccountData = true,
      availability,
      status = accountStatus,
      loading = false,
      enabled,
      canLoadAllTime,
      hasAccountStatus = false,
      hasSummary = false,
      isMixedEpoch = false,
    }) => {
      if (availability) setAvailability(availability);
      setAccountStatusRequest(status, loading);
      setAllTimeSummaryRequest([allTimeSummary], loading);

      render(<Harness chainId={chainId} account={account ?? undefined} loadTierAccountData={loadTierAccountData} />);

      expect(mockUseAccountIncentiveStatus).toHaveBeenLastCalledWith(chainId, {
        account: account ?? undefined,
        enabled,
      });
      expect(mockUseIncentivesLeaderboard).toHaveBeenLastCalledWith(chainId, {
        where: account ? { account } : undefined,
        isMutable: true,
        limit: 1,
        offset: 0,
        enabled,
      });
      expect(latestResult.canLoadAllTimeLeaderboard).toBe(canLoadAllTime);
      expect(latestResult.accountStatus).toBe(hasAccountStatus ? status : undefined);
      expect(latestResult.allTimeSummary).toBe(hasSummary ? allTimeSummary : undefined);
      expect(latestResult.isMixedEpoch).toBe(isMixedEpoch);
      expect(latestResult.accountStatusLoading).toBe(false);
      expect(latestResult.allTimeSummaryLoading).toBe(false);
    }
  );

  it("refreshes the config while epochs are mixed and warns only after the delay", async () => {
    vi.useFakeTimers();
    try {
      setAccountStatusRequest(previousEpochStatus);
      const { rerender } = render(<Harness chainId={ARBITRUM} account={CHECKSUMMED_ACCOUNT} />);
      expect(latestResult.isMixedEpoch).toBe(true);
      expect(latestResult.isMixedEpochPersistent).toBe(false);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(5_000);
      });
      expect(mutateConfig).toHaveBeenCalledTimes(1);
      expect(latestResult.isMixedEpochPersistent).toBe(false);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(25_000);
      });
      expect(mutateConfig).toHaveBeenCalledTimes(6);
      expect(latestResult.isMixedEpochPersistent).toBe(true);

      setAccountStatusRequest(accountStatus);
      rerender(<Harness chainId={ARBITRUM} account={CHECKSUMMED_ACCOUNT} />);
      expect(latestResult.isMixedEpoch).toBe(false);
      expect(latestResult.isMixedEpochPersistent).toBe(false);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(20_000);
      });
      expect(mutateConfig).toHaveBeenCalledTimes(6);
    } finally {
      vi.useRealTimers();
    }
  });
});
