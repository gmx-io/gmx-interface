import { BigNumber, utils } from "ethers";
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useRef,
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
  Profiler,
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

type ProfilerRef = ReturnType<typeof Profiler> & {
  positions?: boolean;
  accounts?: boolean;
  pSorted?: boolean;
  aSorted?: boolean;
  pReturned?: boolean;
  aReturned?: boolean;
  reported?: boolean;
}

export const useLeaderboardContext = () => useContext(LeaderboardContext);

export const LeaderboardContextProvider = ({ children }: PropsWithChildren) => {
  const p = useRef<ProfilerRef>();
  if (!p.current) {
    p.current = Profiler();
  }
  const { chainId } = useChainId();
  const [period, setPeriod] = useState<PerfPeriod>(PerfPeriod.TOTAL);
  const [accountsOrderBy, setAccountsOrderBy] = useState<keyof TopAccountsRow>("absPnl");
  const [accountsOrderDirection, setAccountsOrderDirection] = useState<number>(1);
  const [positionsOrderBy, setPositionsOrderBy] = useState<keyof TopPositionsRow>("unrealizedPnl");
  const [positionsOrderDirection, setPositionsOrderDirection] = useState<number>(1);
  const topPositionsUnordered = useTopPositions();
  if (
    topPositionsUnordered &&
    topPositionsUnordered.data &&
    topPositionsUnordered.data.length &&
    p.current && !p.current.positions
  ) {
    p.current("topPositionsUnordered");
    p.current.positions = true;
  }
  const topAccountsUnordered = useTopAccounts(period);
  if (
    topAccountsUnordered &&
    topAccountsUnordered.data &&
    topAccountsUnordered.data.length &&
    p.current && !p.current.accounts
  ) {
    p.current("topAccountsUnordered");
    p.current.accounts = true;
  }
  const [topPositions, setTopPositions] = useState<TopPositionsRow[]>([]);
  const [topAccounts, setTopAccounts] = useState<TopAccountsRow[]>([]);
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
    if (p.current && !p.current.pSorted) {
      p.current("sorted top positions");
      p.current.pSorted = true;
    }
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
    if (p.current && !p.current.aSorted) {
      p.current("sorted top accounts");
      p.current.aSorted = true;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountsHash, accountsOrderBy, accountsOrderDirection]);

  if (topAccounts && topAccounts.length && !p.current.aReturned) {
    p.current("returning top accounts");
    p.current.aReturned = true;
  }

  if (topPositions && topPositions.length && !p.current.pReturned) {
    p.current("returning top accounts");
    p.current.pReturned = true;
  }

  if (topAccounts && topAccounts.length && topPositions && topPositions.length &&!p.current.reported) {
    p.current("returning all data");
    p.current.report();
    p.current.reported = true;
  }
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
