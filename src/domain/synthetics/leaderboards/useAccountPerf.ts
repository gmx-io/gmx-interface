import useSWR from "swr";
import { BigNumber } from "ethers";
import { PerfPeriod, AccountPerf, AccountPerfJson, PerfByAccount, RemoteData } from "./types";
import { queryAccountPerf } from "./queries";
import { getLeaderboardsGraphClient } from "lib/subgraph/clients";
import { getAddress } from "ethers/lib/utils";
import { useMemo } from "react";
import { useChainId } from "lib/chains";
import { expandDecimals } from "lib/numbers";
import { USD_DECIMALS } from "lib/legacy";

const daysAgo = (days: number) => (
  new Date(Date.now() - 1000 * 60 * 60 * 24 * days).setHours(0, 0, 0, 0) / 1000
);

const filtersByPeriod = {
  [PerfPeriod.DAY]: { period: "hourly", since: daysAgo(1) },
  [PerfPeriod.WEEK]: { period: "daily", since: daysAgo(7) },
  [PerfPeriod.MONTH]: { period: "daily", since: daysAgo(30) },
  [PerfPeriod.TOTAL]: { period: "total" },
};

const fetchAccountPerfs = async (
  chainId: number,
  period: PerfPeriod,
  first: number,
  skip: number,
  orderBy: string = "totalPnl",
  orderDirection: "asc" | "desc" = "desc",
): Promise<AccountPerfJson[]> => {
  if (!(period in filtersByPeriod)) {
    throw new Error(`Invalid period "${period}"`);
  }

  const graph = getLeaderboardsGraphClient(chainId);
  if (!graph) {
    throw new Error(`Leaderboards Account Performance graph error: Unsupported chain id ${chainId}`);
  }

  const res = await graph.query<{ accountPerfs: AccountPerfJson[] }>({
    query: queryAccountPerf,
    variables: {
      first,
      skip,
      orderBy,
      orderDirection,
      volumeGte: expandDecimals(1000, USD_DECIMALS).toString(),
      ...filtersByPeriod[period]
    }
  });

  return res.data.accountPerfs;
};

const sumPerfByAccount = (
  accountPerfs: AccountPerfJson[],
  period: PerfPeriod,
): PerfByAccount => {
  const aggregation = {};

  for (const perfJson of accountPerfs) {
    const account = getAddress(perfJson.account);
    const wins = BigNumber.from(perfJson.wins);
    const losses = BigNumber.from(perfJson.losses);
    const totalPnl = BigNumber.from(perfJson.totalPnl);
    const totalCollateral = BigNumber.from(perfJson.totalCollateral);
    const maxCollateral = BigNumber.from(perfJson.maxCollateral);
    const cumsumSize = BigNumber.from(perfJson.cumsumSize);
    const cumsumCollateral = BigNumber.from(perfJson.cumsumCollateral);
    const sumMaxSize = BigNumber.from(perfJson.sumMaxSize);
    const closedCount = BigNumber.from(perfJson.closedCount);
    const borrowingFeeUsd = BigNumber.from(perfJson.borrowingFeeUsd);
    const fundingFeeUsd = BigNumber.from(perfJson.fundingFeeUsd);
    const positionFeeUsd = BigNumber.from(perfJson.positionFeeUsd);
    const priceImpactUsd = BigNumber.from(perfJson.priceImpactUsd);

    if (!aggregation[account]) {
      aggregation[account] = {
        id: account,
        account,
        period,
        timestamp: perfJson.timestamp,
        wins: BigNumber.from(0),
        losses: BigNumber.from(0),
        totalPnl: BigNumber.from(0),
        totalCollateral: BigNumber.from(0),
        maxCollateral: BigNumber.from(0),
        cumsumSize: BigNumber.from(0),
        cumsumCollateral: BigNumber.from(0),
        sumMaxSize: BigNumber.from(0),
        closedCount: BigNumber.from(0),
        borrowingFeeUsd: BigNumber.from(0),
        fundingFeeUsd: BigNumber.from(0),
        positionFeeUsd: BigNumber.from(0),
        priceImpactUsd: BigNumber.from(0),
      };
    } else {
      // eslint-disable-next-line no-console
      console.warn(`multiple account total perf entities detected for account ${account}`, {
        account,
        requestedPeriod: period,
        returnedPeriod: perfJson.period,
        returnedTs: new Date(perfJson.timestamp * 1000).toISOString(),
      });
    }

    const perf = aggregation[account];

    perf.wins = perf.wins.add(wins);
    perf.losses = perf.losses.add(losses);
    perf.totalPnl = perf.totalPnl.add(totalPnl);
    perf.totalCollateral = perf.totalCollateral.add(totalCollateral);
    perf.maxCollateral = perf.maxCollateral.lt(maxCollateral) ? maxCollateral : perf.maxCollateral;
    perf.cumsumSize = perf.cumsumSize.add(cumsumSize);
    perf.cumsumCollateral = perf.cumsumCollateral.add(cumsumCollateral);
    perf.sumMaxSize = perf.sumMaxSize.add(sumMaxSize);
    perf.closedCount = perf.closedCount.add(closedCount);
    perf.borrowingFeeUsd = perf.borrowingFeeUsd.add(borrowingFeeUsd);
    perf.fundingFeeUsd = perf.fundingFeeUsd.add(fundingFeeUsd);
    perf.positionFeeUsd = perf.positionFeeUsd.add(positionFeeUsd);
    perf.priceImpactUsd = perf.priceImpactUsd.add(priceImpactUsd);
  }

  return aggregation;
};

export function useAccountPerf(period: PerfPeriod) {
  const { chainId } = useChainId();
  const accounts = useSWR([
    "leaderboards/accounts",
    period,
    chainId,
  ], async () => {
    const pageSize = 10000;
    let data: AccountPerfJson[] = [];
    let skip = 0;

    while (true) {
      const pageData = await fetchAccountPerfs(chainId, period, pageSize, skip);
      if (!pageData || !pageData.length) {
        break;
      }
      data = data.concat(pageData);
      if (pageData.length < pageSize) {
        break;
      }
      skip += pageSize;
    }

    return data;
  });

  const key = (accounts.data || []).map(p => p.account).join("-");
  const data = useMemo(() => {
    if (accounts.data) {
      return Object.values(sumPerfByAccount(accounts.data, period));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chainId, key, period]);

  return {
    isLoading: !data && !accounts.error,
    data: data,
    error: accounts.error || null,
  } as RemoteData<AccountPerf>;
};
