import {
  createContext,
  PropsWithChildren,
  useContext,
  useState,
} from "react";

import {
  PerfPeriod,
  LeaderboardContextType,
  useTopAccounts,
  useTopPositions,
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
  const { data: positions, error: positionsError } = useTopPositions();
  const { data: accounts, error: accountsError } = useTopAccounts(period);

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
