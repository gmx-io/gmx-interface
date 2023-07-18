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
    account: a.account,
    period: period,
    timestamp: a.timestamp,
    wins: BigNumber.from(a.wins),
    losses: BigNumber.from(a.losses),
    totalPnl: BigNumber.from(a.totalPnl),
    totalCollateral: BigNumber.from(a.totalCollateral),
    maxCollateral: BigNumber.from(a.maxCollateral),
    cumsumSize: BigNumber.from(a.cumsumSize),
    cumsumCollateral: BigNumber.from(a.cumsumCollateral),
    sumMaxSize: BigNumber.from(a.sumMaxSize),
    closedCount: BigNumber.from(a.closedCount),
  }));
};

const sumScoresByAccount = (accountPerfs: AccountPerf[], period: PerfPeriod) => {
  const groupBy = {};

  for (const accountData of accountPerfs) {
    if (!groupBy[accountData.account]) {
      groupBy[accountData.account] = {
        id: accountData.account,
        account: accountData.account,
        period: period,
        timestamp: accountData.timestamp,
        wins: BigNumber.from(0),
        losses: BigNumber.from(0),
        totalPnl: BigNumber.from(0),
        totalCollateral: BigNumber.from(0),
        maxCollateral: BigNumber.from(0),
        cumsumSize: BigNumber.from(0),
        cumsumCollateral: BigNumber.from(0),
        sumMaxSize: BigNumber.from(0),
        closedCount: BigNumber.from(0),
      };
    }

    const perf = groupBy[accountData.account];

    perf.wins = perf.wins.add(accountData.wins);
    perf.losses = perf.losses.add(accountData.losses);
    perf.totalPnl = perf.totalPnl.add(accountData.totalPnl);
    perf.totalCollateral = perf.totalCollateral.add(accountData.totalCollateral);
    perf.maxCollateral = perf.maxCollateral.lt(accountData.maxCollateral) ? accountData.maxCollateral : perf.maxCollateral;
    perf.cumsumSize = perf.cumsumSize.add(accountData.cumsumSize);
    perf.cumsumCollateral = perf.cumsumCollateral.add(accountData.cumsumCollateral);
    perf.sumMaxSize = perf.sumMaxSize.add(accountData.sumMaxSize);
    perf.closedCount = perf.closedCount.add(accountData.closedCount);
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
