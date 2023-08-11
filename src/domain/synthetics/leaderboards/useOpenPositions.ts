import useSWR from "swr";
import { BigNumber, utils } from "ethers";
import { queryAccountOpenPositions } from "./queries"
import { arbitrumGoerliLeaderboardsClient as graph } from "lib/subgraph/clients";
import { AccountOpenPositionJson, AccountOpenPosition } from "./types";
import { MarketsData, getContractMarketPrices, useMarkets, useMarketsInfo } from "../markets";
import { TokensData } from "../tokens";

const fetchAccountOpenPositionsPage = async (
  first: number,
  skip: number,
  orderBy: string = "sizeInUsd",
  orderDirection: "asc" | "desc" = "desc",
): Promise<Array<AccountOpenPositionJson>> => {
  const res = await graph.query<{ accountOpenPositions: Array<AccountOpenPositionJson> }>({
    query: queryAccountOpenPositions,
    variables: {
      first,
      skip,
      orderBy,
      orderDirection,
    },
  });

  return res.data.accountOpenPositions;
};

const parseAccountOpenPositions = (
  positionsData: AccountOpenPositionJson[],
  marketsData: MarketsData,
  tokensData: TokensData
): AccountOpenPosition[] => {
  const positions: AccountOpenPosition[] = [];

  for (const p of positionsData) {
    const marketData = marketsData[utils.getAddress(p.market)];
    const contractMarketPrices = getContractMarketPrices(tokensData, marketData)!;

    positions.push({
      id: p.id,
      account: p.account,
      market: p.market,
      marketData,
      contractMarketPrices,
      collateralToken: p.collateralToken,
      isLong: p.isLong,
      sizeInTokens: BigNumber.from(p.sizeInTokens),
      sizeInUsd: BigNumber.from(p.sizeInUsd),
      realizedPnl: BigNumber.from(p.realizedPnl),
      collateralAmount: BigNumber.from(p.collateralAmount),
      entryPrice: BigNumber.from(p.entryPrice),
      maxSize: BigNumber.from(p.maxSize),
      borrowingFeeUsd: BigNumber.from(p.borrowingFeeUsd),
      fundingFeeUsd: BigNumber.from(p.fundingFeeUsd),
      positionFeeUsd: BigNumber.from(p.positionFeeUsd),
      priceImpactUsd: BigNumber.from(p.priceImpactUsd),
    });
  }

  return positions;
};

export function useAccountOpenPositions(chainId: number) {
  const { marketsData } = useMarkets(chainId);
  const { tokensData } = useMarketsInfo(chainId);
  const { data: positionsData, error } = useSWR('/leaderboards/positions', async () => {
    const pageSize = 1000;
    let data: Array<AccountOpenPositionJson> = [];
    let skip = 0;

    while (true) {
      const page = await fetchAccountOpenPositionsPage(pageSize, skip);
      if (!page || !page.length) {
        break;
      }
      data = data.concat(page);
      skip += pageSize;
    }

    return data;
  });

  if (error) {
    return { isLoading: false, error, data: [] };
  }

  const isLoading = !(marketsData && tokensData && positionsData);
  const data = isLoading ? [] : parseAccountOpenPositions(
    positionsData,
    marketsData,
    tokensData
  );

  return { isLoading, error: null, data };
};
