import { useMemo } from "react";
import {
  selectLeaderboardAccountsRanks,
  selectLeaderboardCurrentAccount,
  selectLeaderboardIsCompetition,
  selectLeaderboardIsEndInFuture,
  selectLeaderboardIsStartInFuture,
  selectLeaderboardRankedAccounts,
  selectLeaderboardSetType,
  selectLeaderboardTimeframe,
  selectLeaderboardType,
} from "../selectors/leaderboardSelectors";
import { useSelector } from "../utils";

export const useLeaderboardRankedAccounts = () => useSelector(selectLeaderboardRankedAccounts);
export const useLeaderboardAccountsRanks = () => useSelector(selectLeaderboardAccountsRanks);
export const useLeaderboardCurrentAccount = () => useSelector(selectLeaderboardCurrentAccount);

export const useLeaderboardTypeState = () => {
  return [useSelector(selectLeaderboardType), useSelector(selectLeaderboardSetType)] as const;
};

export const useLeaderboardTiming = () => {
  const timeframe = useSelector(selectLeaderboardTimeframe);
  const isEndInFuture = useSelector(selectLeaderboardIsEndInFuture);
  const isStartInFuture = useSelector(selectLeaderboardIsStartInFuture);

  return useMemo(() => ({ timeframe, isEndInFuture, isStartInFuture }), [timeframe, isEndInFuture, isStartInFuture]);
};

export const useLeaderboardPageKey = () => useSelector((s) => s.leaderboard.leaderboardPageKey);

export const useLeaderboardIsCompetition = () => useSelector(selectLeaderboardIsCompetition);

export const useLeaderboardChainId = () => useSelector((s) => s.leaderboard.chainId);
