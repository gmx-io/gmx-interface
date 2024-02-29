import { useLeaderboardAccounts, useLeaderboardPositions } from "domain/synthetics/leaderboard";
import { COMPETITIONS_TIMEFRAMES_SECS } from "domain/synthetics/leaderboard/constants";
import { useChainId } from "lib/chains";
import { useMemo, useState } from "react";

type TimeframeName = keyof typeof COMPETITIONS_TIMEFRAMES_SECS;

export const useLeaderboardState = (account: string | undefined, enabled: boolean) => {
  const { chainId } = useChainId();
  const [activeTimeframe, setActiveTimeframe] = useState<TimeframeName>("test1");

  // @ts-ignore
  window.setActiveTimeframe = setActiveTimeframe;
  const timeframe = COMPETITIONS_TIMEFRAMES_SECS[activeTimeframe];
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
  const { data: positions, error: positionsError } = useLeaderboardPositions(enabled, chainId, account);
  const { data: snapshotPositions, error: snapshotsError } = useLeaderboardPositions(
    enabled,
    chainId,
    account,
    true,
    "snapshotTimestamp_DESC"
  );

  return useMemo(
    () => ({
      currentAccount: currentAccountArr?.[0],
      currentAccountError,
      accounts,
      accountsError,
      positions,
      positionsError,
      snapshotPositions,
      snapshotsError,
    }),
    [
      accounts,
      accountsError,
      currentAccountArr,
      currentAccountError,
      positions,
      positionsError,
      snapshotPositions,
      snapshotsError,
    ]
  );
};
