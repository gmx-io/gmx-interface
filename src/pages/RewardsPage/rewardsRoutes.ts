export type RewardsTab = "tiers" | "history" | "leaderboard";

export const REWARDS_VESTING_SEARCH_PARAM = "vesting";
export const REWARDS_VESTING_START_ACTION = "start";

export function getRewardsTabFromPathname(pathname: string): RewardsTab | undefined {
  const normalizedPath = pathname.replace(/\/+$/, "") || "/";

  if (normalizedPath === "/rewards" || normalizedPath === "/rewards/tiers") return "tiers";
  if (normalizedPath === "/rewards/history") return "history";
  if (normalizedPath === "/rewards/leaderboard") return "leaderboard";

  return undefined;
}

export function getRewardsPath(tab: RewardsTab) {
  if (tab === "history") return "/rewards/history";
  if (tab === "leaderboard") return "/rewards/leaderboard";
  return "/rewards";
}

export function getStartRewardsVestingPath() {
  return `${getRewardsPath("history")}?${REWARDS_VESTING_SEARCH_PARAM}=${REWARDS_VESTING_START_ACTION}`;
}

export function getRewardsPathFromPointsPath(pathname: string) {
  const normalizedPath = pathname.replace(/\/+$/, "") || "/";

  if (normalizedPath === "/points/history") return "/rewards/history";
  if (normalizedPath === "/points/leaderboard") return "/rewards/leaderboard";
  return "/rewards";
}
