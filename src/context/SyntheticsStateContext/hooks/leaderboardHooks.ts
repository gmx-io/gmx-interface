import { useMemo } from "react";
import {
  selectLeaderboardAccountsRanks,
  selectLeaderboardCurrentAccount,
  selectLeaderboardDataType,
  selectLeaderboardIsCompetition,
  selectLeaderboardIsEndInFuture,
  selectLeaderboardIsStartInFuture,
  selectLeaderboardPositions,
  selectLeaderboardRankedAccounts,
  selectLeaderboardSetDataType,
  selectLeaderboardSetTimeframeType,
  selectLeaderboardTimeframe,
  selectLeaderboardTimeframeType,
} from "../selectors/leaderboardSelectors";
import { useSelector } from "../utils";

export const useLeaderboardRankedAccounts = () => useSelector(selectLeaderboardRankedAccounts);
export const useLeaderboardAccountsRanks = () => useSelector(selectLeaderboardAccountsRanks);
export const useLeaderboardCurrentAccount = () => useSelector(selectLeaderboardCurrentAccount);

export const useLeaderboardTimeframeTypeState = () =>
  [useSelector(selectLeaderboardTimeframeType), useSelector(selectLeaderboardSetTimeframeType)] as const;

export const useLeaderboardDataTypeState = () =>
  [useSelector(selectLeaderboardDataType), useSelector(selectLeaderboardSetDataType)] as const;

export const useLeaderboardTiming = () => {
  const timeframe = useSelector(selectLeaderboardTimeframe);
  const isEndInFuture = useSelector(selectLeaderboardIsEndInFuture);
  const isStartInFuture = useSelector(selectLeaderboardIsStartInFuture);

  return useMemo(() => ({ timeframe, isEndInFuture, isStartInFuture }), [timeframe, isEndInFuture, isStartInFuture]);
};

export const useLeaderboardPageKey = () => useSelector((s) => s.leaderboard.leaderboardPageKey);

export const useLeaderboardIsCompetition = () => useSelector(selectLeaderboardIsCompetition);

export const useLeaderboardChainId = () => useSelector((s) => s.leaderboard.chainId);

export const useLeaderboardPositions = () => useSelector(selectLeaderboardPositions);
