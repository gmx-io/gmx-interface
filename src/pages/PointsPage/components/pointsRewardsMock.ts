import { isDevelopment } from "config/env";

export const POINTS_REWARDS_MOCK_QUERY_PARAM = "mockPointsRewards";
export const POINTS_REWARDS_MOCK_ACCOUNT = "0x0000000000000000000000000000000000000123";

const GMX_DECIMALS = 10n ** 18n;

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

export function waitForPointsRewardsMock(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
