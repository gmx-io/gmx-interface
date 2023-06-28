import useSWR from "swr";
import { BigNumber } from "ethers";
import { AccountFilterPeriod, AccountPerfJson } from "./types";
import { queryAccountPerformance } from "./queries";
import { arbitrumGoerliLeaderboardsClient as graph } from "lib/subgraph/clients";
import { formatAmount } from "lib/numbers";
import { USD_DECIMALS } from "lib/legacy";

const daysAgo = x => (
  new Date(Date.now() - 1000 * 60 * 60 * 24 * x).setHours(0, 0, 0, 0) / 1000
);

const filtersByPeriod = {
  [AccountFilterPeriod.DAY]: { period: "hourly", since: daysAgo(1) },
  [AccountFilterPeriod.WEEK]: { period: "daily", since: daysAgo(7) },
  [AccountFilterPeriod.MONTH]: { period: "daily", since: daysAgo(30) },
  [AccountFilterPeriod.TOTAL]: { period: "daily" },
};

export function useTopAccounts(period: AccountFilterPeriod) {
  const topAccounts = useSWR(`leaderboards/accounts/${period}`, async () => {
    if (!(period in filtersByPeriod)) {
      throw new Error(`Invalid period "${period}"`);
    }

    const res = await graph.query<{ accountPerfs: Array<AccountPerfJson> }>({
      query: queryAccountPerformance,
      variables: {
        pageSize: 1000,
        offset: 0,
        orderBy: "totalPnl",
        orderDirection: "desc",
        ...filtersByPeriod[period],
      }
    });

    return res.data.accountPerfs.map(a => ({
      id: a.id,
      account: a.account,
      absPnl: formatAmount(a.totalPnl, USD_DECIMALS + 18, 0, true),
      relPnl: BigNumber.from(0).toString(), // TODO: calculate relative pnl on subgraph side
      sizeLev: `${formatAmount(a.volume, USD_DECIMALS, 0, true)} (0)`, // TODO: return avg. leverage from subgraph
      perf: `${a.wins}/${a.losses}`,
    }));
  });

  return {
    isLoading: !topAccounts.data,
    data: topAccounts.data || [],
    error: topAccounts.error || null,
  }; // TODO: update to swr v1 and above
}