import { act, render, waitFor } from "@testing-library/react";
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

  it("loads account data only after an Arbitrum config is active", () => {
    render(<Harness chainId={ARBITRUM} account={CHECKSUMMED_ACCOUNT} />);

    expect(mockUseAccountIncentiveStatus).toHaveBeenCalledWith(ARBITRUM, {
      account: CHECKSUMMED_ACCOUNT,
      enabled: true,
    });
    expect(mockUseIncentivesLeaderboard).toHaveBeenCalledWith(ARBITRUM, {
      where: { account: CHECKSUMMED_ACCOUNT },
      isMutable: true,
      limit: 1,
      offset: 0,
      enabled: true,
    });
    expect(latestResult.availability.status).toBe("active");
    expect(latestResult.accountStatus).toBe(accountStatus);
    expect(latestResult.allTimeSummary).toBe(allTimeSummary);
  });

  it("does not start dependent queries while config availability is unresolved", () => {
    setConfigRequest(undefined);

    render(<Harness chainId={ARBITRUM} account={CHECKSUMMED_ACCOUNT} />);

    expect(latestResult.availability.status).toBe("loading");
    expect(latestResult.canLoadAllTimeLeaderboard).toBe(true);
    expect(mockUseAccountIncentiveStatus).toHaveBeenCalledWith(ARBITRUM, {
      account: CHECKSUMMED_ACCOUNT,
      enabled: false,
    });
    expect(mockUseIncentivesLeaderboard).toHaveBeenCalledWith(ARBITRUM, expect.objectContaining({ enabled: false }));
  });

  it("does not load tier account queries on other rewards tabs", () => {
    render(<Harness chainId={ARBITRUM} account={CHECKSUMMED_ACCOUNT} loadTierAccountData={false} />);

    expect(mockUseAccountIncentiveStatus).toHaveBeenCalledWith(ARBITRUM, {
      account: CHECKSUMMED_ACCOUNT,
      enabled: false,
    });
    expect(mockUseIncentivesLeaderboard).toHaveBeenCalledWith(
      ARBITRUM,
      expect.objectContaining({
        where: { account: CHECKSUMMED_ACCOUNT },
        enabled: false,
      })
    );
    expect(latestResult.accountStatus).toBeUndefined();
    expect(latestResult.allTimeSummary).toBeUndefined();
  });

  it("reports unsupported chains without loading config or account data", () => {
    setAvailability({ status: "unsupported-chain" });

    render(<Harness chainId={AVALANCHE} account={CHECKSUMMED_ACCOUNT} />);

    expect(latestResult.availability.status).toBe("unsupported-chain");
    expect(latestResult.canLoadAllTimeLeaderboard).toBe(false);
    expect(mockUseAccountIncentiveStatus).toHaveBeenCalledWith(AVALANCHE, expect.objectContaining({ enabled: false }));
    expect(mockUseIncentivesLeaderboard).toHaveBeenCalledWith(AVALANCHE, expect.objectContaining({ enabled: false }));
  });

  it.each([
    ["inactive", { status: "inactive" } as const],
    ["error", { status: "error", error: new Error("Unavailable") } as const],
  ])("allows config-independent all-time leaderboard queries while config is %s", (_label, availability) => {
    setAvailability(availability);

    render(<Harness chainId={ARBITRUM} account={CHECKSUMMED_ACCOUNT} />);

    expect(latestResult.canLoadAllTimeLeaderboard).toBe(true);
    expect(mockUseAccountIncentiveStatus).toHaveBeenCalledWith(ARBITRUM, expect.objectContaining({ enabled: false }));
  });

  it("preserves a disconnected state without reporting account loading", () => {
    setAccountStatusRequest(accountStatus, true);
    setAllTimeSummaryRequest([allTimeSummary], true);

    render(<Harness chainId={ARBITRUM} />);

    expect(mockUseAccountIncentiveStatus).toHaveBeenCalledWith(ARBITRUM, {
      account: undefined,
      enabled: false,
    });
    expect(mockUseIncentivesLeaderboard).toHaveBeenCalledWith(ARBITRUM, {
      where: undefined,
      isMutable: true,
      limit: 1,
      offset: 0,
      enabled: false,
    });
    expect(latestResult.accountStatus).toBeUndefined();
    expect(latestResult.allTimeSummary).toBeUndefined();
    expect(latestResult.accountStatusLoading).toBe(false);
    expect(latestResult.allTimeSummaryLoading).toBe(false);
  });

  it("withholds account status from a different epoch", () => {
    setAccountStatusRequest({ ...accountStatus, epochTimestamp: config.epochTimestamp - config.epochDuration });

    render(<Harness chainId={ARBITRUM} account={CHECKSUMMED_ACCOUNT} />);

    expect(latestResult.isMixedEpoch).toBe(true);
    expect(latestResult.accountStatus).toBeUndefined();
    expect(latestResult.allTimeSummary).toBe(allTimeSummary);
  });

  it("keeps refreshing the config while epochs are mixed", async () => {
    vi.useFakeTimers();
    try {
      setAccountStatusRequest({ ...accountStatus, epochTimestamp: config.epochTimestamp - config.epochDuration });
      const { rerender } = render(<Harness chainId={ARBITRUM} account={CHECKSUMMED_ACCOUNT} />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(5_000);
      });
      expect(mutateConfig).toHaveBeenCalledTimes(1);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5_000);
      });
      expect(mutateConfig).toHaveBeenCalledTimes(2);

      setAccountStatusRequest(accountStatus);
      rerender(<Harness chainId={ARBITRUM} account={CHECKSUMMED_ACCOUNT} />);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(20_000);
      });
      expect(mutateConfig).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("reports a persistent mixed epoch only after the warning delay", async () => {
    vi.useFakeTimers();
    try {
      const { rerender } = render(<Harness chainId={ARBITRUM} account={CHECKSUMMED_ACCOUNT} />);
      expect(latestResult.isMixedEpochPersistent).toBe(false);

      setAccountStatusRequest({ ...accountStatus, epochTimestamp: config.epochTimestamp - config.epochDuration });
      rerender(<Harness chainId={ARBITRUM} account={CHECKSUMMED_ACCOUNT} />);
      expect(latestResult.isMixedEpoch).toBe(true);
      expect(latestResult.isMixedEpochPersistent).toBe(false);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(30_000);
      });
      expect(latestResult.isMixedEpochPersistent).toBe(true);

      setAccountStatusRequest(accountStatus);
      rerender(<Harness chainId={ARBITRUM} account={CHECKSUMMED_ACCOUNT} />);
      expect(latestResult.isMixedEpoch).toBe(false);
      expect(latestResult.isMixedEpochPersistent).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("applies the warning delay even when mounted into an already mixed state", async () => {
    vi.useFakeTimers();
    try {
      setAccountStatusRequest({ ...accountStatus, epochTimestamp: config.epochTimestamp - config.epochDuration });
      render(<Harness chainId={ARBITRUM} account={CHECKSUMMED_ACCOUNT} />);

      expect(latestResult.isMixedEpoch).toBe(true);
      expect(latestResult.isMixedEpochPersistent).toBe(false);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(30_000);
      });
      expect(latestResult.isMixedEpochPersistent).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("preserves a loaded empty all-time summary when its refresh fails", () => {
    const refreshError = new Error("refresh failed");
    setAllTimeSummaryRequest([], false, refreshError);

    render(<Harness chainId={ARBITRUM} account={CHECKSUMMED_ACCOUNT} />);

    expect(latestResult.allTimeSummary).toBeUndefined();
    expect(latestResult.allTimeSummaryLoaded).toBe(true);
    expect(latestResult.allTimeSummaryError).toBe(refreshError);
  });

  it("retries config and both connected-account queries together", async () => {
    render(<Harness chainId={ARBITRUM} account={CHECKSUMMED_ACCOUNT} />);

    await act(async () => {
      await latestResult.retry();
    });

    expect(mutateConfig).toHaveBeenCalledTimes(1);
    expect(mutateAccountStatus).toHaveBeenCalledTimes(1);
    expect(mutateAllTimeSummary).toHaveBeenCalledTimes(1);
  });

  it("refreshes connected-account data when config advances to a new epoch", async () => {
    const { rerender } = render(<Harness chainId={ARBITRUM} account={CHECKSUMMED_ACCOUNT} />);
    expect(mutateAccountStatus).not.toHaveBeenCalled();
    expect(mutateAllTimeSummary).not.toHaveBeenCalled();

    setConfigRequest({ ...config, epochTimestamp: config.epochTimestamp + config.epochDuration });
    rerender(<Harness chainId={ARBITRUM} account={CHECKSUMMED_ACCOUNT} />);

    await waitFor(() => {
      expect(mutateAccountStatus).toHaveBeenCalledTimes(1);
      expect(mutateAllTimeSummary).toHaveBeenCalledTimes(1);
    });
    expect(latestResult.isMixedEpoch).toBe(true);
    expect(latestResult.accountStatus).toBeUndefined();
  });
});
