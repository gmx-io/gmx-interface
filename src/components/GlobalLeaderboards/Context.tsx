import { BigNumber } from "ethers";
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

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

  const [period, setPeriod] = useState<PerfPeriod>(PerfPeriod.TOTAL);
  const [accountsOrderBy, setAccountsOrderBy] = useState<keyof TopAccountsRow>("absPnl");
  const [accountsOrderDirection, setAccountsOrderDirection] = useState<number>(1);
  const [positionsOrderBy, setPositionsOrderBy] = useState<keyof TopPositionsRow>("unrealizedPnl");
  const [positionsOrderDirection, setPositionsOrderDirection] = useState<number>(1);
  const { data: positions, error: positionsError } = useTopPositions();
  if (positions.length && p.current && !p.current.positions) {
    p.current("topPositionsUnordered");
    p.current.positions = true;
  }

  const { data: accounts, error: accountsError } = useTopAccounts(period);
  if (accounts?.length && p.current && !p.current.accounts) {
    p.current("topAccountsUnordered");
    p.current.accounts = true;
  }

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
  }, [accountsOrderBy, setAccountsOrderBy, setAccountsOrderDirection]);

  const topPositionsHeaderClick = useCallback((key: keyof TopPositionsRow) => () => {
    if (key === positionsOrderBy) {
      setPositionsOrderDirection((d: number) => -1 * d);
    } else {
      setPositionsOrderBy(key);
      setPositionsOrderDirection(1);
    }
  }, [positionsOrderBy, setPositionsOrderBy, setPositionsOrderDirection]);

  const positionsHash = (positions || []).map(p => p[positionsOrderBy]!.toString()).join("-");
  const topPositions = useMemo(() => {
    if (!positions) {
      return [];
    }

    return [...positions].sort((a, b) => {
      const key = positionsOrderBy;
      if (BigNumber.isBigNumber(a[key]) && BigNumber.isBigNumber(b[key])) {
        return positionsOrderDirection * ((a[key] as BigNumber).gt(b[key] as BigNumber) ? -1 : 1);
      } else {
        return 1;
      }
    }).map((p, i) => ({ ...p, rank: i }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positionsHash, positionsOrderBy, positionsOrderDirection]);

  if (topPositions.length && p.current && !p.current.pSorted) {
    p.current("sorted top positions");
    p.current.pSorted = true;
  }

  const accountsHash = (accounts || []).map(a => a[accountsOrderBy]!.toString()).join(":");
  const topAccounts = useMemo(() => {
    if (!accounts) {
      return [];
    }

    return [...accounts].sort((a, b) => {
      const key = accountsOrderBy;
      if (BigNumber.isBigNumber(a[key]) && BigNumber.isBigNumber(b[key])) {
        return accountsOrderDirection * ((a[key] as BigNumber).gt(b[key] as BigNumber) ? -1 : 1);
      } else {
        return 1;
      }
    }).map((a, i) => ({ ...a, rank: i }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountsHash, accountsOrderBy, accountsOrderDirection]);

  if (topAccounts.length && p.current && !p.current.aSorted) {
    p.current("sorted top accounts");
    p.current.aSorted = true;
  }

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
    period,
    topAccounts: {
      isLoading: !topAccounts.length,
      error: accountsError,
      data: topAccounts,
    },
    topPositions: {
      isLoading: !topPositions.length,
      error: positionsError,
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
