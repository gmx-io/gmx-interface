import {
  LeaderboardPageKey,
  LeaderboardTimeframe,
  LeaderboardType,
  useLeaderboardData,
} from "domain/synthetics/leaderboard";
import { LEADERBOARD_PAGES } from "domain/synthetics/leaderboard/constants";
import { useChainId } from "lib/chains";
import { getTimestampByDaysAgo } from "lib/dates";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { mustNeverExist } from "lib/types";
import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";

export type LeaderboardState = ReturnType<typeof useLeaderboardState>;

export const useLeaderboardState = (account: string | undefined, enabled: boolean) => {
  const [leaderboardType, setLeaderboardType] = useState<LeaderboardType>("all");
  const { leaderboardPageKey: leaderboardPageKeyRaw } = useParams<{ leaderboardPageKey?: LeaderboardPageKey }>();
  const leaderboardPageKey = leaderboardPageKeyRaw ?? "leaderboard";
  const timeframe = useLeaderboardTimeframe(leaderboardPageKey, leaderboardType, leaderboardPageKey);
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

  const { data, error: leaderboardDataError } = useLeaderboardData(enabled, chainId, {
    account,
    from: timeframe.from,
    to: timeframe.to,
    positionsSnapshotTimestamp,
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
      chainId,
    }),
    [
      chainId,
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
  pageType: LeaderboardPageKey,
  leaderboardType: LeaderboardType,
  pageKey: LeaderboardPageKey | undefined
): LeaderboardTimeframe {
  const isCompetitions = pageKey !== "leaderboard";
  const competitionsDefaultTimeframe: LeaderboardTimeframe = useMemo(() => {
    return LEADERBOARD_PAGES[pageKey ?? "leaderboard"].timeframe;
  }, [pageKey]);

  const leaderboardDefaultTimeframe: LeaderboardTimeframe = useMemo(() => {
    if (leaderboardType === "all") {
      return LEADERBOARD_PAGES.leaderboard.timeframe;
    } else if (leaderboardType === "30days") {
      return {
        from: getTimestampByDaysAgo(30),
        to: undefined,
      };
    } else if (leaderboardType === "7days") {
      return {
        from: getTimestampByDaysAgo(7),
        to: undefined,
      };
    } else {
      throw mustNeverExist(leaderboardType);
    }
  }, [leaderboardType]);

  const defaultTimeframe = isCompetitions ? competitionsDefaultTimeframe : leaderboardDefaultTimeframe;
  const defaultTimeframeStr = useMemo(() => serializeTimeframe(defaultTimeframe), [defaultTimeframe]);
  const [overrideTimeframeStr, setOverrideTimeframeStr] = useLocalStorageSerializeKey<string>(
    `${pageType}/leaderboardTimeframe`,
    ""
  );
  const timeframeStr = overrideTimeframeStr || defaultTimeframeStr;
  const timeframe = useMemo(() => deserializeTimeframe(timeframeStr), [timeframeStr]);

  // FIXME these functions're leaking memory

  // @ts-ignore
  window.overrideLeaderboardTimeframe = (from: number, to: number | undefined) => {
    setOverrideTimeframeStr(serializeTimeframe({ from, to }));
  };

  //@ts-ignore
  window.getLeaderboardTimeframe = () => {
    return {
      from: timeframe.from,
      to: timeframe.to,
      iso: `${new Date(timeframe.from * 1000).toISOString()} - ${
        timeframe.to && new Date(timeframe.to * 1000).toISOString()
      }`,
      isOverride: overrideTimeframeStr !== "",
    };
  };

  // @ts-ignore
  window.resetLeaderboardTimeframe = () => {
    setOverrideTimeframeStr("");
  };

  return timeframe;
}
