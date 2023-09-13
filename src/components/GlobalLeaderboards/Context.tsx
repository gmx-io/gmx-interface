import {
  createContext,
  PropsWithChildren,
  useContext,
  useRef,
  useState,
} from "react";

import {
  PerfPeriod,
  LeaderboardContextType,
  useTopAccounts,
  useTopPositions,
  createProfiler,
} from "domain/synthetics/leaderboards";

export const LeaderboardContext = createContext<LeaderboardContextType>({
  topPositions: { isLoading: false, data: [], error: null },
  topAccounts: { isLoading: false, data: [], error: null },
  period: PerfPeriod.DAY,
  setPeriod: () => {},
});

export const useLeaderboardContext = () => useContext(LeaderboardContext);

export const LeaderboardContextProvider = ({ children }: PropsWithChildren) => {
  const [period, setPeriod] = useState<PerfPeriod>(PerfPeriod.TOTAL);
  const p = useRef(createProfiler("LeaderboardContextProvider"));
  const { data: positions, error: positionsError } = useTopPositions(p.current);
  const { data: accounts, error: accountsError } = useTopAccounts(period, p.current);

  if (positions && positions.length) {
    p.current(`LeaderboardContextProvider: received ${positions.length} top positions`);
  }

  if (accounts && accounts.length) {
    p.current(`LeaderboardContextProvider: received ${accounts.length} top accounts`);
  }

  if (positions && positions.length && accounts && accounts.length) {
    p.current.report();
    p.current = createProfiler("LeaderboardContextProvider");
  }

  const context = {
    period,
    setPeriod,
    topAccounts: {
      isLoading: !accounts?.length,
      error: accountsError,
      data: accounts || [],
    },
    topPositions: {
      isLoading: !positions.length,
      error: positionsError,
      data: positions,
    },
  };

  return <LeaderboardContext.Provider value={ context }>{ children }</LeaderboardContext.Provider>;
};
