import { BigNumber, utils } from "ethers";
import {
  createContext,
  FC,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { useChainId } from "lib/chains";
import {
  PerfPeriod,
  LeaderboardContextType,
  useTopAccounts,
  useTopPositions,
  TopAccountsRow,
  TopPositionsRow,
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
  const [positionsOrderBy, setPositionsOrderBy] = useState<keyof TopPositionsRow>("unrealizedPnl");
  const [positionsOrderDirection, setPositionsOrderDirection] = useState<number>(1);
  const topPositionsUnordered = useTopPositions();
  const topAccountsUnordered = useTopAccounts(period);
  const [topPositions, setTopPositions] = useState<Array<TopPositionsRow>>([]);
  const [topAccounts, setTopAccounts] = useState<Array<TopAccountsRow>>([]);
  const [positionsHash, setPositionsHash] = useState<string>();
  const [accountsHash, setAccountHash] = useState<string>();
  const topAccountsHeaderClick = useCallback((key: keyof TopAccountsRow) => () => {
    if (key === "wins") {
      setAccountsOrderBy(accountsOrderBy === "wins" ? "losses" : "wins");
      setAccountsOrderDirection(1);
    } else if (key === accountsOrderBy) {
      setAccountsOrderDirection((d: number) => -1 * d);
    } else {
      setAccountsOrderBy(key);
      setAccountsOrderDirection(1);
    }
  }, [accountsOrderBy]);

  const topPositionsHeaderClick = useCallback((key: keyof TopPositionsRow) => () => {
    if (key === positionsOrderBy) {
      setPositionsOrderDirection((d: number) => -1 * d);
    } else {
      setPositionsOrderBy(key);
      setPositionsOrderDirection(1);
    }
  }, [positionsOrderBy]);

  const nextPositionsHash = utils.sha256(topPositionsUnordered.data ? topPositionsUnordered.data.map(a => (
    a[positionsOrderBy]!.toString().split("").map((c: string) => c.charCodeAt(0))
  )).flat() : []);

  if (positionsHash !== nextPositionsHash) {
    setPositionsHash(nextPositionsHash);
  }

  useEffect(() => {
    if (!topPositionsUnordered.data) {
      return;
    }

    const data = [...topPositionsUnordered.data].sort((a, b) => {
      const key = positionsOrderBy;
      if (a[key] instanceof BigNumber && b[key] instanceof BigNumber) {
        return positionsOrderDirection * ((a[key] as BigNumber).gt(b[key] as BigNumber) ? -1 : 1);
      } else {
        // TODO: remove log
        // eslint-disable-next-line no-console
        console.warn("Not a BigNumber", { key, a, b });
        return 1;
      }
    }).map((p, i) => ({ ...p, rank: i }));

    setTopPositions(data);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positionsHash, positionsOrderBy, positionsOrderDirection]);

  const nextAccountsHash = utils.sha256(topAccountsUnordered.data ? topAccountsUnordered.data.map(a => (
    a[accountsOrderBy]!.toString().split("").map((c: string) => c.charCodeAt(0))
  )).flat() : []);

  if (accountsHash !== nextAccountsHash) {
    setAccountHash(nextAccountsHash);
  }

  useEffect(() => {
    if (!topAccountsUnordered.data) {
      return;
    }

    const data = [...topAccountsUnordered.data];
    data.sort((a, b) => {
      const key = accountsOrderBy;
      if (a[key] instanceof BigNumber && b[key] instanceof BigNumber) {
        return accountsOrderDirection * ((a[key] as BigNumber).gt(b[key] as BigNumber) ? -1 : 1);
      } else {
        // TODO: remove log
        // eslint-disable-next-line no-console
        console.warn("Not a BigNumber", {key, a, b});
        return 1;
      }
    });

    data.forEach((a, i) => a.rank = i);

    setTopAccounts(data);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountsHash, accountsOrderBy, accountsOrderDirection]);

  const context = {
    chainId,
    period,
    topAccounts: {
      isLoading: !topAccounts.length,
      error: topAccountsUnordered.error,
      data: topAccounts,
    },
    topPositions: {
      isLoading: !topPositions.length,
      error: topPositionsUnordered.error,
      data: topPositions,
    },
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
