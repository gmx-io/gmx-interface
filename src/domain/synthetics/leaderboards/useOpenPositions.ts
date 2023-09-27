import useSWR from "swr";
import { BigNumber } from "ethers";
import { getAddress } from "ethers/lib/utils";
import { queryOpenPositions } from "./queries";
import { getLeaderboardsGraphClient } from "lib/subgraph/clients";
import { OpenPositionJson, OpenPosition } from "./types";
import { ContractMarketPrices, getContractMarketPrices, useMarkets, useMarketsInfo } from "../markets";
import { convertToUsd } from "../tokens";
import { usePositionsInfo } from "./usePositionsInfo";
import { PositionsInfoData, getPositionKey } from "../positions";
import { useMemo } from "react";
import { BASIS_POINTS_DIVISOR } from "config/factors";
import { useChainId } from "lib/chains";
import { floorTimestamp } from "./utils";

const fetchOpenPositionsPage = async (
  chainId: number,
  first: number,
  skip: number,
  orderBy: string = "sizeInUsd",
  orderDirection: "asc" | "desc" = "desc"
): Promise<OpenPositionJson[]> => {
  const graph = getLeaderboardsGraphClient(chainId);
  if (!graph) {
    throw new Error(`Leaderboards Open Positions graph error: Unsupported chain id ${chainId}`);
  }
  const res = await graph.query<{ accountOpenPositions: OpenPositionJson[] }>({
    query: queryOpenPositions,
    variables: {
      first,
      skip,
      orderBy,
      orderDirection,
      // sizeInUsdGte: expandDecimals(10, USD_DECIMALS).toString()
    },
  });

  return res.data.accountOpenPositions;
};

const parseOpenPositions = (positionsData: OpenPositionJson[], positionsByKey: PositionsInfoData): OpenPosition[] => {
  const positions: OpenPosition[] = [];

  for (const p of positionsData) {
    const accountAddress = getAddress(p.account);
    const key = getPositionKey(accountAddress, getAddress(p.market), getAddress(p.collateralToken), p.isLong);

    const positionInfo = positionsByKey[key];
    const collateralAmount = BigNumber.from(p.collateralAmount);
    const collateralAmountUsd = convertToUsd(
      collateralAmount,
      positionInfo.collateralToken.decimals,
      positionInfo.collateralToken.prices.minPrice
    )!;

    const currSuzeInUsd = convertToUsd(
      BigNumber.from(p.sizeInTokens),
      positionInfo.indexToken.decimals,
      positionInfo.indexToken.prices[p.isLong ? "minPrice" : "maxPrice"]
    )!;

    const prevSizeInUsd = BigNumber.from(p.sizeInUsd);
    const unrealizedPnl = p.isLong ? currSuzeInUsd.sub(prevSizeInUsd) : prevSizeInUsd.sub(currSuzeInUsd);

    const liquidationPrice = positionInfo.liquidationPrice;
    const markPrice = positionInfo.markPrice;
    const liquidationPriceDelta = liquidationPrice && liquidationPrice.sub(markPrice);
    const liquidationPriceDeltaRel =
      liquidationPrice && liquidationPriceDelta && liquidationPriceDelta.mul(BASIS_POINTS_DIVISOR).div(markPrice);

    positions.push({
      key,
      account: accountAddress,
      isLong: p.isLong,
      marketInfo: positionInfo.marketInfo,
      markPrice,
      collateralToken: positionInfo.collateralToken,
      entryPrice: positionInfo.entryPrice!,
      sizeInUsd: positionInfo.sizeInUsd,
      collateralAmount,
      collateralAmountUsd,
      maxSize: BigNumber.from(p.maxSize),
      liquidationPrice,
      liquidationPriceDelta,
      liquidationPriceDeltaRel,
      unrealizedPnl,
      unrealizedPnlAfterFees: positionInfo.pnlAfterFees,
      closingFeeUsd: positionInfo.closingFeeUsd,
      pendingFundingFeesUsd: positionInfo.pendingFundingFeesUsd,
      pendingClaimableFundingFeesUsd: positionInfo.pendingClaimableFundingFeesUsd,
      pendingBorrowingFeesUsd: positionInfo.pendingBorrowingFeesUsd,
      leverage: positionInfo.leverage,
    });
  }

  return positions;
};

const fetchOpenPositions = (chainId) => async () => {
  const pageSize = 10000;
  let data: OpenPositionJson[] = [];
  let skip = 0;

  while (true) {
    const page = await fetchOpenPositionsPage(chainId, pageSize, skip);
    if (!page || !page.length) {
      break;
    }
    data = data.concat(page);
    if (page.length < pageSize) {
      break;
    }
    skip += pageSize;
  }

  return data;
};

export function useOpenPositions(addresses: string[]) {
  const { chainId } = useChainId();
  const { marketsData } = useMarkets(chainId);
  const { tokensData, pricesUpdatedAt } = useMarketsInfo(chainId);
  const { data: openPositions } = useSWR(["/leaderboards/positions", chainId], {
    fetcher: fetchOpenPositions(chainId),
    keepPreviousData: true,
    refreshInterval: 10_000,
  });

  const accounts = new Set(addresses);
  const positions = openPositions ? openPositions.filter(({ account }) => accounts.has(account.toLowerCase())) : [];
  const tsRounded = floorTimestamp(pricesUpdatedAt);
  const { keys, prices } = useMemo((): { keys: string[]; prices: ContractMarketPrices[] } => {
    if (!marketsData || !tokensData || !accounts.size) {
      return { keys: [], prices: [] };
    }

    const keys: string[] = [];
    const prices: ContractMarketPrices[] = [];
    for (const p of positions) {
      const market = marketsData[getAddress(p.market)];
      const contractMarketPrices = getContractMarketPrices(tokensData, market);
      if (contractMarketPrices) {
        keys.push(p.id);
        prices.push(contractMarketPrices);
      }
    }

    return { keys, prices };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chainId, positions.length ? tsRounded : 0]);

  const positionsInfo = usePositionsInfo(keys, prices);
  const error = positions.error || positionsInfo.error;
  const positionsInfoKeys = Object.keys(positionsInfo.data || {});
  const isLoading =
    !error && (!positions.length || !positionsInfoKeys.length || positions.length !== positionsInfoKeys.length);

  const { data, updatedAt } = useMemo(
    () =>
      isLoading || error
        ? { data: undefined, updatedAt: 0 }
        : {
            data: parseOpenPositions(positions, positionsInfo.data).sort((a, b) =>
              a.unrealizedPnlAfterFees.gt(b.unrealizedPnlAfterFees) ? -1 : 1
            ),
            updatedAt: Date.now(),
          },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chainId, positionsInfo.updatedAt]
  );

  return { isLoading: !data, error, data: data || [], updatedAt };
}
