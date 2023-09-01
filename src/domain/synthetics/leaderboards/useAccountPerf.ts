import useSWR from "swr";
import { BigNumber } from "ethers";
import { PerfPeriod, AccountPerf, AccountPerfJson, PerfByAccount, RemoteData } from "./types";
import { queryAccountPerformance } from "./queries";
import { arbitrumGoerliLeaderboardsClient as graph } from "lib/subgraph/clients";
import { getAddress } from "ethers/lib/utils";
import { useEffect, useState } from "react";
// import { useEnsBatchLookup } from "./useEnsBatchLookup";

const daysAgo = (x: number) => (
  new Date(Date.now() - 1000 * 60 * 60 * 24 * x).setHours(0, 0, 0, 0) / 1000
);

const filtersByPeriod = {
  [PerfPeriod.DAY]: { period: "hourly", since: daysAgo(1) },
  [PerfPeriod.WEEK]: { period: "daily", since: daysAgo(7) },
  [PerfPeriod.MONTH]: { period: "daily", since: daysAgo(30) },
  [PerfPeriod.TOTAL]: { period: "total" },
};

const fetchAccountPerfs = async (
  period: PerfPeriod,
  first: number,
  skip: number,
  orderBy: string = "totalPnl",
  orderDirection: "asc" | "desc" = "desc",
): Promise<Array<AccountPerfJson>> => {
  if (!(period in filtersByPeriod)) {
    throw new Error(`Invalid period "${period}"`);
  }

  const res = await graph.query<{ accountPerfs: Array<AccountPerfJson> }>({
    query: queryAccountPerformance,
    variables: { first, skip, orderBy, orderDirection, ...filtersByPeriod[period] }
  });

  return res.data.accountPerfs;
};

const sumPerfByAccount = (
  accountPerfs: AccountPerfJson[],
  period: PerfPeriod,
  ensNames: Record<string, string>,
  avatarUrls: Record<string, string>,
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

    perf.ensName = ensNames[perfJson.account];
    perf.avatarUrl = avatarUrls[perfJson.account];
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
  const [data, setData] = useState<Array<AccountPerf>>([]);
  const accounts = useSWR([
    "leaderboards/accounts",
    period,
  ], async () => {
    const pageSize = 1000;
    let data: Array<AccountPerfJson> = [];
    let skip = 0;

    while (true) {
      const pageData = await fetchAccountPerfs(period, pageSize, skip);
      if (!pageData || !pageData.length) {
        break;
      }
      data = data.concat(pageData);
      skip += pageSize;
    }

    return data;
  });

  // const addresses = (accounts.data || []).map((a: AccountPerfJson) => a.account);
  // const { ensNames, avatarUrls } = useEnsBatchLookup(addresses);
  const ensNames = {};
  const avatarUrls = {};

  const key = (accounts.data || []).map(p => p.account).join("-");
  const ensNamesLength = Object.keys(ensNames).length;
  const avatarUrlsLength = Object.keys(avatarUrls).length;
  useEffect(() => {
    if (accounts.data) {
      setData(Object.values(sumPerfByAccount(accounts.data, period, ensNames, avatarUrls)));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, period, ensNamesLength, avatarUrlsLength]);

  return {
    isLoading: !data && !accounts.error,
    data: data,
    error: accounts.error || null,
  } as RemoteData<AccountPerf>;
};
