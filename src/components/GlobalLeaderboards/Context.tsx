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
  useOpenPositions,
} from "domain/synthetics/leaderboards";

export const LeaderboardContext = createContext<LeaderboardContextType>({
  positions: { isLoading: false, data: [], error: null },
  accounts: { isLoading: false, data: [], error: null },
  period: PerfPeriod.DAY,
  setPeriod: () => {},
});

export const useLeaderboardContext = () => useContext(LeaderboardContext);

export const LeaderboardContextProvider = ({ children }: PropsWithChildren) => {
  const [period, setPeriod] = useState<PerfPeriod>(PerfPeriod.TOTAL);
  const positions = useOpenPositions();
  const accounts = useTopAccounts(period);
  const context = { period, setPeriod, accounts, positions };

  return <LeaderboardContext.Provider value={ context }>{ children }</LeaderboardContext.Provider>;
};
