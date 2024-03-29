import {
  LeaderboardPageKey,
  LeaderboardTimeframe,
  LeaderboardTimeframeType,
  LeaderboardDataType,
  useLeaderboardData,
} from "domain/synthetics/leaderboard";
import { LEADERBOARD_PAGES } from "domain/synthetics/leaderboard/constants";
import { useChainId } from "lib/chains";
import { getTimestampByDaysAgo } from "lib/dates";
import { mustNeverExist } from "lib/types";
import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";

export type LeaderboardState = ReturnType<typeof useLeaderboardState>;

export const useLeaderboardState = (account: string | undefined, enabled: boolean) => {
  const [leaderboardTimeframeType, setLeaderboardTimeframeType] = useState<LeaderboardTimeframeType>("all");
  const [leaderboardDataType, setLeaderboardDataType] = useState<LeaderboardDataType>("accounts");
  const { leaderboardPageKey: leaderboardPageKeyRaw } = useParams<{ leaderboardPageKey?: LeaderboardPageKey }>();
  const leaderboardPageKey = leaderboardPageKeyRaw ?? "leaderboard";
  const timeframe = useLeaderboardTimeframe(leaderboardTimeframeType, leaderboardPageKey, leaderboardDataType);
  const isEndInFuture = timeframe.to === undefined || timeframe.to > Date.now() / 1000;
  const isStartInFuture = timeframe.from > Date.now() / 1000;
  const positionsSnapshotTimestamp = isEndInFuture ? undefined : timeframe.to;
  const { chainId: activeChainId } = useChainId();
  const competitionChainId = useMemo(() => {
    const page = LEADERBOARD_PAGES[leaderboardPageKey];
    if (!page.isCompetition) return;
    return page.chainId;
  }, [leaderboardPageKey]);
  const chainId = competitionChainId ?? activeChainId;

  const {
    data,
    error: leaderboardDataError,
    isLoading,
  } = useLeaderboardData(enabled, chainId, {
    account,
    from: timeframe.from,
    to: timeframe.to,
    positionsSnapshotTimestamp,
    leaderboardDataType: leaderboardPageKey === "leaderboard" ? leaderboardDataType : undefined,
  });

  return useMemo(
    () => ({
      accounts: data?.accounts,
      leaderboardDataError,
      positions: data?.positions,
      leaderboardTimeframeType,
      setLeaderboardTimeframeType,
      leaderboardDataType,
      setLeaderboardDataType,
      isStartInFuture,
      isEndInFuture,
      timeframe,
      leaderboardPageKey,
      chainId,
      isLoading,
    }),
    [
      data?.accounts,
      data?.positions,
      leaderboardDataError,
      leaderboardTimeframeType,
      leaderboardDataType,
      isStartInFuture,
      isEndInFuture,
      timeframe,
      leaderboardPageKey,
      chainId,
      isLoading,
    ]
  );
};

function useLeaderboardTimeframe(
  leaderboardTimeframeType: LeaderboardTimeframeType,
  pageKey: LeaderboardPageKey | undefined,
  leaderboardDataType: LeaderboardDataType
): LeaderboardTimeframe {
  const isCompetitions = pageKey !== "leaderboard";
  const competitionsTimeframe: LeaderboardTimeframe = useMemo(() => {
    return LEADERBOARD_PAGES[pageKey ?? "leaderboard"].timeframe;
  }, [pageKey]);

  const leaderboardTimeframe: LeaderboardTimeframe = useMemo(() => {
    if (leaderboardDataType === "positions") {
      return LEADERBOARD_PAGES.leaderboard.timeframe;
    }

    if (leaderboardTimeframeType === "all") {
      return LEADERBOARD_PAGES.leaderboard.timeframe;
    } else if (leaderboardTimeframeType === "30days") {
      return {
        from: getTimestampByDaysAgo(30),
        to: undefined,
      };
    } else if (leaderboardTimeframeType === "7days") {
      return {
        from: getTimestampByDaysAgo(7),
        to: undefined,
      };
    } else {
      throw mustNeverExist(leaderboardTimeframeType);
    }
  }, [leaderboardDataType, leaderboardTimeframeType]);

  return isCompetitions ? competitionsTimeframe : leaderboardTimeframe;
}
