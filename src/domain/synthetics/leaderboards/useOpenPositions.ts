import useSWR from "swr";
import { BigNumber } from "ethers";
import { queryAccountOpenPositions } from "./queries"
import { arbitrumGoerliLeaderboardsClient as graph } from "lib/subgraph/clients";
import { AccountOpenPositionJson, AccountOpenPosition } from "./types";

const fetchOpenPositions = async (
  first: number,
  skip: number,
  orderBy: string = "sizeInUsd",
  orderDirection: "asc" | "desc" = "desc",
): Promise<Array<AccountOpenPosition>> => {
  const res = await graph.query<{ accountOpenPositions: Array<AccountOpenPositionJson> }>({
    query: queryAccountOpenPositions,
    variables: { first, skip, orderBy, orderDirection },
  });

  return res.data.accountOpenPositions.map((p) => ({
    id: p.id,
    account: p.account,
    market: p.market,
    collateralToken: p.collateralToken,
    isLong: p.isLong,
    sizeInTokens: BigNumber.from(p.sizeInTokens),
    sizeInUsd: BigNumber.from(p.sizeInUsd),
    realizedPnl: BigNumber.from(p.realizedPnl),
    collateralAmount: BigNumber.from(p.collateralAmount),
    entryPrice: BigNumber.from(p.entryPrice),
    maxSize: BigNumber.from(p.maxSize),
  }));
};

export function useOpenPositions() {
  const openPositions = useSWR('/leaderboards/positions', async () => {
    const pageSize = 1000;
    let data: Array<AccountOpenPosition> = [];
    let skip = 0;

    while (true) {
      const page = await fetchOpenPositions(pageSize, skip);
      if (!page || !page.length) {
        break;
      }
      data = data.concat(page);
      skip += pageSize;
    }

    return data;
  });

  return {
    isLoading: !openPositions.data,
    data: openPositions.data || [],
    error: openPositions.error || null,
  };
};
