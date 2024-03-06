import {
  LeaderboardPageKey,
  LeaderboardTimeframe,
  LeaderboardType,
  useLeaderboardData,
} from "domain/synthetics/leaderboard";
import { LEADERBOARD_TIMEFRAMES } from "domain/synthetics/leaderboard/constants";
import { useChainId } from "lib/chains";
import { mustNeverExist } from "lib/types";
import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { SyntheticsPageType } from "./SyntheticsStateContextProvider";

export type LeaderboardState = ReturnType<typeof useLeaderboardState>;

export const useLeaderboardState = (account: string | undefined, pageType: SyntheticsPageType) => {
  const { chainId } = useChainId();
  const [leaderboardType, setLeaderboardType] = useState<LeaderboardType>("all");
  const { leaderboardPageKey: leaderboardPageKeyRaw } = useParams<{ leaderboardPageKey?: LeaderboardPageKey }>();

  const isLeaderboard = pageType === "leaderboard";
  const isCompetitions = pageType === "competitions";
  const enabled = isLeaderboard || isCompetitions;
  const leaderboardPageKey = leaderboardPageKeyRaw ?? "leaderboard";

  const timeframe = useLeaderboardTimeframe(pageType, leaderboardType, leaderboardPageKey);
  const isEndInFuture = timeframe.to === undefined || timeframe.to > Date.now() / 1000;
  const isStartInFuture = timeframe.from > Date.now() / 1000;
  const positionsSnapshotTimestamp = isEndInFuture ? undefined : timeframe.to;

  const { data, error: leaderboardDataError } = useLeaderboardData(enabled, chainId, {
    account,
    from: timeframe.from,
    to: timeframe.to,
    positionsSnapshotTimestamp,
    isLeaderboard,
  });

  return useMemo(
    () => ({
      accounts: data?.accounts,
      leaderboardDataError,
      positions: data?.positions,
      leaderboardType,
      setLeaderboardType,
      isStartInFuture,
      isEndInFuture,
      timeframe,
      leaderboardPageKey,
    }),
    [
      data?.accounts,
      data?.positions,
      isEndInFuture,
      isStartInFuture,
      leaderboardDataError,
      leaderboardPageKey,
      leaderboardType,
      timeframe,
    ]
  );
};

function serializeTimeframe(timeframe: LeaderboardTimeframe) {
  if (!timeframe.to) {
    return `${timeframe.from}`;
  }

  return `${timeframe.from}-${timeframe.to}`;
}

function deserializeTimeframe(timeframeStr: string): LeaderboardTimeframe {
  const [fromStr, toStr] = timeframeStr.split("-");
  return {
    from: parseInt(fromStr),
    to: toStr ? parseInt(toStr) : undefined,
  };
}

function useLeaderboardTimeframe(
  pageType: SyntheticsPageType,
  leaderboardType: LeaderboardType,
  pageKey: LeaderboardPageKey | undefined
): LeaderboardTimeframe {
  const isCompetitions = pageType === "competitions";
  const competitionsDefaultTimeframe: LeaderboardTimeframe = useMemo(() => {
    switch (pageKey) {
      case "leaderboard":
        return LEADERBOARD_TIMEFRAMES.all;

      case "march24abspnl":
        return LEADERBOARD_TIMEFRAMES.march24abspnl;

      case "march24relpnl":
        return LEADERBOARD_TIMEFRAMES.march24relpnl;

      case "test":
        return LEADERBOARD_TIMEFRAMES.test;

      case "test2":
        return LEADERBOARD_TIMEFRAMES.test2;

      default:
        if (pageKey) {
          throw mustNeverExist(pageKey);
        } else {
          return LEADERBOARD_TIMEFRAMES.all;
        }
    }
  }, [pageKey]);

  const leaderboardDefaultTimeframe: LeaderboardTimeframe = useMemo(() => {
    if (leaderboardType === "all") {
      return LEADERBOARD_TIMEFRAMES.all;
    } else if (leaderboardType === "30days") {
      return {
        from: Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60,
        to: undefined,
      };
    } else if (leaderboardType === "7days") {
      return {
        from: Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60,
        to: undefined,
      };
    } else {
      throw mustNeverExist(leaderboardType);
    }
  }, [leaderboardType]);
  const defaultTimeframe = isCompetitions ? competitionsDefaultTimeframe : leaderboardDefaultTimeframe;
  const defaultTimeframeStr = useMemo(() => serializeTimeframe(defaultTimeframe), [defaultTimeframe]);

  const timeframeStr = defaultTimeframeStr;
  const timeframe = useMemo(() => deserializeTimeframe(timeframeStr), [timeframeStr]);

  return timeframe;
}
