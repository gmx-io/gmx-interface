import { BigNumber } from "ethers";
import {
  createContext,
  FC,
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import { useChainId } from "lib/chains";
import {
  PerfPeriod,
  LeaderboardContextType,
  useTopAccounts,
  useTopPositions,
  AccountOpenPosition,
  TopAccountsRow,
} from "domain/synthetics/leaderboards";

export const LeaderboardContext = createContext<LeaderboardContextType>({
  chainId: 0,
  topPositions: { isLoading: false, data: [], error: null },
  topAccounts: { isLoading: false, data: [], error: null },
  period: PerfPeriod.DAY,
  setPeriod: () => {},
  setAccountsOrderBy: () => {},
  setAccountsOrderDirection: () => {},
  setPositionsOrderBy: () => {},
  setPositionsOrderDirection: () => {},
  topAccountsHeaderClick: () => () => {},
  topPositionsHeaderClick: () => () => {},
});

export const useLeaderboardContext = () => useContext(LeaderboardContext);

export const LeaderboardContextProvider: FC<PropsWithChildren> = ({ children }) => {
  const { chainId } = useChainId();
  const [period, setPeriod] = useState<PerfPeriod>(PerfPeriod.TOTAL);
  const [accountsOrderBy, setAccountsOrderBy] = useState<keyof TopAccountsRow>("absPnl");
  const [accountsOrderDirection, setAccountsOrderDirection] = useState<number>(1);
  const [positionsOrderBy, setPositionsOrderBy] = useState<keyof AccountOpenPosition>("unrealizedPnl");
  const [positionsOrderDirection, setPositionsOrderDirection] = useState<number>(1);
  const topPositions = useTopPositions();
  const topAccounts = useTopAccounts(period);
  const topAccountsHeaderClick = useCallback((key: string) => () => {
    if (key === "wins") {
      setAccountsOrderBy(accountsOrderBy === "wins" ? "losses" : "wins");
      setAccountsOrderDirection(1);
    } else if (key === accountsOrderBy) {
      setAccountsOrderDirection((d: number) => -1 * d);
    } else {
      setAccountsOrderBy(key as keyof TopAccountsRow);
      setAccountsOrderDirection(1);
    }
  }, [accountsOrderBy]);

  const topPositionsHeaderClick = useCallback((key: string) => () => {
    if (key === accountsOrderBy) {
      setPositionsOrderDirection((d: number) => -1 * d);
    } else {
      setPositionsOrderBy(key as keyof AccountOpenPosition);
      setPositionsOrderDirection(1);
    }
  }, [accountsOrderBy]);

  const positionsKey = topPositions.data && topPositions.data
    .map(a => a.unrealizedPnlAfterFees.toString())
    .sort((a, b) => a < b ? -1 : 1)
    .join("-");

  useMemo(() => {
    if (!topPositions.data) {
      return;
    }

    topPositions.data.sort((a, b) => {
      const key = positionsOrderBy;
      if (a[key] instanceof BigNumber && b[key] instanceof BigNumber) {
        return positionsOrderDirection * ((a[key] as BigNumber).gt(b[key] as BigNumber) ? -1 : 1);
      } else {
        return 1;
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positionsKey, positionsOrderBy, positionsOrderDirection]);

  const accountsKey = topAccounts.data && topAccounts.data
    .map(a => a.absPnl.toString())
    .sort((a, b) => a < b ? -1 : 1)
    .join("-");

  useMemo(() => {
    if (!topAccounts.data) {
      return;
    }

    topAccounts.data.sort((a, b) => {
      const key = accountsOrderBy;
      if (a[key] instanceof BigNumber && b[key] instanceof BigNumber) {
        return accountsOrderDirection * ((a[key] as BigNumber).gt(b[key] as BigNumber) ? -1 : 1);
      } else {
        return 1;
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountsKey, accountsOrderBy, accountsOrderDirection]);

  const context = {
    chainId,
    period,
    topAccounts,
    topPositions,
    setPeriod,
    setAccountsOrderBy,
    setAccountsOrderDirection,
    setPositionsOrderBy,
    setPositionsOrderDirection,
    topAccountsHeaderClick,
    topPositionsHeaderClick,
  };

  return <LeaderboardContext.Provider value={ context }>{ children }</LeaderboardContext.Provider>;
};
