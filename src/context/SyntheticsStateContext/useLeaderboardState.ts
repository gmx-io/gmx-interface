import { LeaderboardTimeframe, useLeaderboardData } from "domain/synthetics/leaderboard";
import { LEADERBOARD_TIMEFRAMES } from "domain/synthetics/leaderboard/constants";
import { useChainId } from "lib/chains";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { useMemo } from "react";
import { SyntheticsPageType } from "./SyntheticsStateContextProvider";

export const useLeaderboardState = (account: string | undefined, pageType: SyntheticsPageType) => {
  const { chainId } = useChainId();

  const isLeaderboard = pageType === "leaderboard";
  const isCompetitions = pageType === "competitions";
  const enabled = isLeaderboard || isCompetitions;

  const timeframe = useLeaderboardTimeframe(pageType);
  const isEndInFuture = timeframe.to === undefined || timeframe.to > Date.now() / 1000;
  const positionsSnapshotTimestamp = isEndInFuture ? undefined : timeframe.to;

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
    }),
    [data?.accounts, data?.positions, leaderboardDataError]
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

function useLeaderboardTimeframe(pageType: SyntheticsPageType): LeaderboardTimeframe {
  const isCompetitions = pageType === "competitions";
  const defaultTimeframe = isCompetitions ? LEADERBOARD_TIMEFRAMES.test3 : LEADERBOARD_TIMEFRAMES.all;
  const defaultTimeframeStr = useMemo(() => serializeTimeframe(defaultTimeframe), [defaultTimeframe]);
  const [overrideTimeframeStr, setOverrideTimeframeStr] = useLocalStorageSerializeKey<string>(
    `${pageType}/leaderboardTimeframe`,
    ""
  );
  const timeframeStr = overrideTimeframeStr || defaultTimeframeStr;
  const timeframe = useMemo(() => deserializeTimeframe(timeframeStr), [timeframeStr]);

  // @ts-ignore
  window.overrideLeaderboardTimeframe = (from: number, to: number | undefined) => {
    if (from in LEADERBOARD_TIMEFRAMES) {
      setOverrideTimeframeStr(serializeTimeframe(LEADERBOARD_TIMEFRAMES[from]));
      return;
    }

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
