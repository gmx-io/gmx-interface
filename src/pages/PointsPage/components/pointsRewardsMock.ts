import { isDevelopment } from "config/env";

// Mock-only scaffolding for ?mockPointsRewards=1; delete this file and its import sites when retiring the flow.
export const POINTS_REWARDS_MOCK_QUERY_PARAM = "mockPointsRewards";
export const POINTS_REWARDS_MOCK_ACCOUNT = "0x0000000000000000000000000000000000000123";

const GMX_DECIMALS = 10n ** 18n;
const POINTS_REWARDS_MOCK_DELAYS_MS = {
  claimOnly: 900,
  claimAndStake: {
    claim: 1000,
    stakePending: 500,
    stake: 10900,
  },
};

type PointsRewardsMockClaimAndStakeCallbacks = {
  onClaimSucceeded: () => void | Promise<void>;
  onStakePending: () => void | Promise<void>;
  onStakeSucceeded: () => void | Promise<void>;
};

export const POINTS_REWARDS_MOCK_DATA = {
  claimableAmount: 12_340_000_000_000_000_000n,
  pointsBalance: 124_500n * GMX_DECIMALS,
  totalEarnedRewards: 42_500_000_000_000_000_000n,
  timeLeft: "3d 4h",
};

function isEnabledParamValue(value: string | null) {
  return value === "" || value === "1" || value === "true";
}

export function isPointsRewardsMockEnabled() {
  if (!isDevelopment()) {
    return false;
  }

  const searchParams = new URLSearchParams(window.location.search);
  if (isEnabledParamValue(searchParams.get(POINTS_REWARDS_MOCK_QUERY_PARAM))) {
    return true;
  }

  const hashQuery = window.location.hash.split("?")[1];
  if (!hashQuery) {
    return false;
  }

  return isEnabledParamValue(new URLSearchParams(hashQuery).get(POINTS_REWARDS_MOCK_QUERY_PARAM));
}

function waitForPointsRewardsMock(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export async function simulatePointsRewardsMockClaim(onClaimSucceeded: () => void | Promise<void>) {
  await waitForPointsRewardsMock(POINTS_REWARDS_MOCK_DELAYS_MS.claimOnly);
  await onClaimSucceeded();
}

export async function simulatePointsRewardsMockClaimAndStake({
  onClaimSucceeded,
  onStakePending,
  onStakeSucceeded,
}: PointsRewardsMockClaimAndStakeCallbacks) {
  await waitForPointsRewardsMock(POINTS_REWARDS_MOCK_DELAYS_MS.claimAndStake.claim);
  await onClaimSucceeded();
  await waitForPointsRewardsMock(POINTS_REWARDS_MOCK_DELAYS_MS.claimAndStake.stakePending);
  await onStakePending();
  await waitForPointsRewardsMock(POINTS_REWARDS_MOCK_DELAYS_MS.claimAndStake.stake);
  await onStakeSucceeded();
}
