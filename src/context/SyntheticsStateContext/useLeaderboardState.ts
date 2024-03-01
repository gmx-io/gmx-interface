import { useLeaderboardData } from "domain/synthetics/leaderboard";
import { COMPETITIONS_TIMEFRAMES } from "domain/synthetics/leaderboard/constants";
import { useChainId } from "lib/chains";
import { useMemo, useState } from "react";
import { SyntheticsPageType } from "./SyntheticsStateContextProvider";

type TimeframeName = keyof typeof COMPETITIONS_TIMEFRAMES;

export const useLeaderboardState = (account: string | undefined, pageType: SyntheticsPageType) => {
  const { chainId } = useChainId();
  const [competitionsActiveTimeframe, setCompetitionsActiveTimeframe] = useState<TimeframeName>("test4");
  // @ts-ignore
  window.setTimeframe = setCompetitionsActiveTimeframe;

  const isLeaderboard = pageType === "leaderboard";
  const isCompetitions = pageType === "competitions";
  const enabled = isLeaderboard || isCompetitions;

  const competitionsTimeframe = COMPETITIONS_TIMEFRAMES[competitionsActiveTimeframe];
  const timeframe = isCompetitions ? competitionsTimeframe : COMPETITIONS_TIMEFRAMES.all;
  const isEndInFuture = timeframe.to === undefined || timeframe.to > Date.now() / 1000;
  const positionsSnapshotTimestamp = isEndInFuture ? undefined : timeframe.to;

  const { data: currentAccountData, error: currentAccountError } = useLeaderboardData(true, chainId, {
    account,
    from: timeframe.from,
    to: timeframe.to,
    positionsSnapshotTimestamp,
  });
  const { data, error: leaderboardDataError } = useLeaderboardData(enabled, chainId, {
    account: undefined,
    from: timeframe.from,
    to: timeframe.to,
    positionsSnapshotTimestamp,
  });

  return useMemo(
    () => ({
      currentAccount: currentAccountData?.accounts[0],
      currentAccountError,
      currentAccountPositions: currentAccountData?.positions,
      accounts: data?.accounts,
      leaderboardDataError,
      positions: data?.positions,
    }),
    [
      currentAccountData?.accounts,
      currentAccountData?.positions,
      currentAccountError,
      data?.accounts,
      data?.positions,
      leaderboardDataError,
    ]
  );
};
