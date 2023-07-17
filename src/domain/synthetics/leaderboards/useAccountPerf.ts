import useSWR from "swr";
import { BigNumber } from "ethers";
import { PerfPeriod, AccountPerf, AccountPerfJson, PerfByAccount, RemoteData } from "./types";
import { queryAccountPerformance } from "./queries";
import { arbitrumGoerliLeaderboardsClient as graph } from "lib/subgraph/clients";

const daysAgo = (x: number) => (
  new Date(Date.now() - 1000 * 60 * 60 * 24 * x).setHours(0, 0, 0, 0) / 1000
);

const filtersByPeriod = {
  [PerfPeriod.DAY]: { period: "hourly", since: daysAgo(1) },
  [PerfPeriod.WEEK]: { period: "daily", since: daysAgo(7) },
  [PerfPeriod.MONTH]: { period: "daily", since: daysAgo(30) },
  [PerfPeriod.TOTAL]: { period: "daily" },
};

const fetchAccountPerfs = async (
  period: PerfPeriod,
  first: number,
  skip: number,
  orderBy: string = "totalPnl",
  orderDirection: "asc" | "desc" = "desc",
): Promise<Array<AccountPerf>> => {
  if (!(period in filtersByPeriod)) {
    throw new Error(`Invalid period "${period}"`);
  }

  const res = await graph.query<{ accountPerfs: Array<AccountPerfJson> }>({
    query: queryAccountPerformance,
    variables: { first, skip, orderBy, orderDirection, ...filtersByPeriod[period] }
  });

  return res.data.accountPerfs.map(a => ({
    id: a.account,
    period: period,
    account: a.account,
    wins: BigNumber.from(a.wins),
    losses: BigNumber.from(a.losses),
    totalPnl: BigNumber.from(a.totalPnl),
    sumSize: BigNumber.from(a.sumSize),
    sumCollateral: BigNumber.from(a.sumCollateral),
    sumMaxCollateral: BigNumber.from(a.sumMaxCollateral),
    sumMaxSize: BigNumber.from(a.sumMaxSize),
    positionCount: BigNumber.from(a.positionCount),
  }));
};

const sumScoresByAccount = (accountPerfs: AccountPerf[], period: PerfPeriod) => {
  const groupBy = {};

  for (const accountData of accountPerfs) {
    if (!groupBy[accountData.account]) {
      groupBy[accountData.account] = {
        id: accountData.account,
        period: period,
        account: accountData.account,
        wins: BigNumber.from(0),
        losses: BigNumber.from(0),
        totalPnl: BigNumber.from(0),
        sumSize: BigNumber.from(0),
        sumCollateral: BigNumber.from(0),
        sumMaxCollateral: BigNumber.from(0),
        sumMaxSize: BigNumber.from(0),
        positionCount: BigNumber.from(0),
      };
    }

    const perf = groupBy[accountData.account];

    perf.wins = perf.wins.add(accountData.wins);
    perf.losses = perf.losses.add(accountData.losses);
    perf.totalPnl = perf.totalPnl.add(accountData.totalPnl);
    perf.sumSize = perf.sumSize.add(accountData.sumSize);
    perf.sumCollateral = perf.sumCollateral.add(accountData.sumCollateral);
    perf.sumMaxCollateral = perf.sumMaxCollateral.add(accountData.sumMaxCollateral);
    perf.sumMaxSize = perf.sumMaxSize.add(accountData.sumMaxSize);
    perf.positionCount = perf.positionCount.add(accountData.positionCount);
  }

  return groupBy;
};

export function useAccountPerf(period: PerfPeriod) {
  const accounts = useSWR("leaderboards/accounts", async () => {
    const pageSize = 1000;
    let data: Array<AccountPerf> = [];
    let skip = 0;

    while (true) {
      const pageData = await fetchAccountPerfs(period, pageSize, skip);
      if (!pageData || !pageData.length) {
        break;
      }
      data = data.concat(pageData);
      skip += pageSize;
    }

    const perfByAccount: PerfByAccount = sumScoresByAccount(data, period);
    return Object.values(perfByAccount);
  });

  return {
    isLoading: !accounts.data,
    data: accounts.data || [],
    error: accounts.error || null,
  } as RemoteData<AccountPerf>;
};
