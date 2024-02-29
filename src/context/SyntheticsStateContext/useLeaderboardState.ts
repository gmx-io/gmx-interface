import { useLeaderboardAccounts, useLeaderboardPositions } from "domain/synthetics/leaderboard";
import { COMPETITIONS_TIMEFRAMES } from "domain/synthetics/leaderboard/constants";
import { useChainId } from "lib/chains";
import { useMemo, useState } from "react";
import { SyntheticsPageType } from "./SyntheticsStateContextProvider";

type TimeframeName = keyof typeof COMPETITIONS_TIMEFRAMES;

export const useLeaderboardState = (account: string | undefined, pageType: SyntheticsPageType) => {
  const { chainId } = useChainId();
  const [competitionsActiveTimeframe, setCompetitionsActiveTimeframe] = useState<TimeframeName>("test4");

  const isLeaderboard = pageType === "leaderboard";
  const isCompetitions = pageType === "competitions";
  const enabled = isLeaderboard || isCompetitions;

  // @ts-ignore
  window.setTimeframe = setCompetitionsActiveTimeframe;
  const competitionsTimeframe = COMPETITIONS_TIMEFRAMES[competitionsActiveTimeframe];
  const timeframe = isCompetitions ? competitionsTimeframe : COMPETITIONS_TIMEFRAMES.all;
  const { data: currentAccountArr, error: currentAccountError } = useLeaderboardAccounts(true, chainId, {
    account,
    from: timeframe.from,
    to: timeframe.to,
  });
  const { data: accounts, error: accountsError } = useLeaderboardAccounts(enabled, chainId, {
    account: undefined,
    from: timeframe.from,
    to: timeframe.to,
  });

  const isEndInFuture = timeframe.to === undefined || timeframe.to > Date.now() / 1000;
  // console.table({
  //   isEndInFuture,
  //   from: new Date(timeframe.from * 1000).toISOString(),
  //   to: timeframe.to ? new Date(timeframe.to * 1000).toISOString() : "undefined",
  // });
  const positionSnapshotTimestamp = isEndInFuture ? undefined : timeframe.to;
  const { data: positions, error: positionsError } = useLeaderboardPositions(
    enabled,
    chainId,
    positionSnapshotTimestamp
  );

  return useMemo(
    () => ({
      currentAccount: currentAccountArr?.[0],
      currentAccountError,
      accounts,
      accountsError,
      positions,
      positionsError,
    }),
    [accounts, accountsError, currentAccountArr, currentAccountError, positions, positionsError]
  );
};
