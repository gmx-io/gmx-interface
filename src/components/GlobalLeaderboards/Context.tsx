import {
  createContext,
  FC,
  PropsWithChildren,
  useContext,
  useState
} from "react";

import { useChainId } from "lib/chains";
import {
  AccountFilterPeriod,
  LeaderboardContextType,
  useTopAccounts,
  useTopPositions,
} from "domain/synthetics/leaderboards";

export const LeaderboardContext = createContext<LeaderboardContextType>({
  chainId: 0,
  topPositions: { isLoading: false, data: [], error: null },
  topAccounts: { isLoading: false, data: [], error: null },
  period: AccountFilterPeriod.DAY,
  setPeriod: () => {},
});

export const useLeaderboardContext = () => useContext(LeaderboardContext);

export const LeaderboardContextProvider: FC<PropsWithChildren> = ({ children }) => {
  const { chainId } = useChainId();
  const [period, setPeriod] = useState<AccountFilterPeriod>(AccountFilterPeriod.DAY);
  const topPositions = useTopPositions();
  const topAccounts = useTopAccounts(period);
  const context = {
    chainId,
    topPositions,
    period,
    setPeriod,
    topAccounts,
  };

  console.log({context});

  return <LeaderboardContext.Provider value={context}>{children}</LeaderboardContext.Provider>;
};
