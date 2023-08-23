import { BigNumber } from "ethers";
import {
  createContext,
  FC,
  PropsWithChildren,
  useContext,
  useMemo,
  useState
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
});

export const useLeaderboardContext = () => useContext(LeaderboardContext);

const startProfiling = () => {
  const start = new Date();
  const profile: Array<[string, number]> = [];
  let last = start;

  return Object.assign((msg: string) => {
    const now = new Date();
    const time = now.getTime() - last.getTime();
    profile.push([msg, time]);
    last = now;
    return time;
  }, {
    getTime() {
      return last.getTime() - start.getTime();
    },
    report() {
      // eslint-disable-next-line no-console
      console.groupCollapsed("Profiling report");
      // eslint-disable-next-line no-console
      for (const [m, time] of profile) console.info(`  - ${m}: ${time}`);
      // eslint-disable-next-line no-console
      console.info("Total time:", this.getTime());
      // eslint-disable-next-line no-console
      console.groupEnd();
    }
  });
};

export const LeaderboardContextProvider: FC<PropsWithChildren> = ({ children }) => {
  const p = startProfiling();
  const { chainId } = useChainId();
  p("chain id");
  const [period, setPeriod] = useState<PerfPeriod>(PerfPeriod.TOTAL);
  p("period");
  const [accountsOrderBy, setAccountsOrderBy] = useState<keyof TopAccountsRow>("absPnl");
  p("accounts order by");
  const [accountsOrderDirection, setAccountsOrderDirection] = useState<number>(1);
  p("accounts order dir");
  const [positionsOrderBy, setPositionsOrderBy] = useState<keyof AccountOpenPosition>("unrealizedPnl");
  p("positions order by");
  const [positionsOrderDirection, setPositionsOrderDirection] = useState<number>(1);
  p("positions order dir");
  const topPositions = useTopPositions();
  p("top positions");
  const topAccounts = useTopAccounts(period);
  p("top accounts");

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

  p("sort positions");

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

  p("sort accounts");

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
  };

  p("context");
  // p.report();

  return <LeaderboardContext.Provider value={ context }>{ children }</LeaderboardContext.Provider>;
};
