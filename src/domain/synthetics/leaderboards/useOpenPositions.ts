import useSWR from "swr";
import { BigNumber } from "ethers";
import { getAddress } from "ethers/lib/utils";
import { queryOpenPositions } from "./queries"
import { getLeaderboardsGraphClient } from "lib/subgraph/clients";
import { OpenPositionJson, OpenPosition } from "./types";
import { ContractMarketPrices, getContractMarketPrices, useMarketsInfo } from "../markets";
import { convertToUsd } from "../tokens";
import { usePositionsInfo } from "./usePositionsInfo";
import { PositionsInfoData, getPositionKey } from "../positions";
import { useEffect, useMemo, useState } from "react";
import { BASIS_POINTS_DIVISOR } from "config/factors";
import { useChainId } from "lib/chains";

const fetchOpenPositionsPage = async (
  chainId: number,
  first: number,
  skip: number,
  orderBy: string = "sizeInUsd",
  orderDirection: "asc" | "desc" = "desc",
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
    },
  });

  return res.data.accountOpenPositions;
};

const parseOpenPositions = (
  positionsData: OpenPositionJson[],
  positionsByKey: PositionsInfoData,
  ensNames: Record<string, string>,
  avatarUrls: Record<string, string>,
): OpenPosition[] => {
  const positions: OpenPosition[] = [];

  for (const p of positionsData) {
    const accountAddress = getAddress(p.account);
    const ensName = ensNames[p.account];
    const avatarUrl = avatarUrls[p.account];
    const key = getPositionKey(
      accountAddress,
      getAddress(p.market),
      getAddress(p.collateralToken),
      p.isLong
    );

    const positionInfo = positionsByKey[key];
    const collateralAmount = BigNumber.from(p.collateralAmount);
    const collateralAmountUsd = convertToUsd(
      collateralAmount,
      positionInfo.collateralToken.decimals,
      positionInfo.collateralToken.prices.minPrice,
    )!;

    const currSuzeInUsd = positionInfo.sizeInUsd; // convertToUsd(
    //   BigNumber.from(p.sizeInTokens),
    //   positionInfo.indexToken.decimals,
    //   positionInfo.indexToken.prices[p.isLong ? "minPrice" : "maxPrice"],
    // )!;

    // if (!currSuzeInUsd.eq(positionInfo.sizeInUsd)) {
    //   console.log({
    //     diff: formatUsd(currSuzeInUsd.sub(positionInfo.sizeInUsd))
    //     // "currSuzeInUsd": currSuzeInUsd.toString(),
    //     // "positionInfo.sizeInUsd": positionInfo.sizeInUsd.toString(),
    //   });
    // }

    const prevSizeInUsd = BigNumber.from(p.sizeInUsd);
    const unrealizedPnl = p.isLong
      ? currSuzeInUsd.sub(prevSizeInUsd)
      : prevSizeInUsd.sub(currSuzeInUsd);

    const liquidationPrice = positionInfo.liquidationPrice;
    const markPrice = positionInfo.markPrice;
    const liquidationPriceDelta = liquidationPrice && liquidationPrice.sub(markPrice);
    const liquidationPriceDeltaRel = liquidationPrice && liquidationPriceDelta && (
      liquidationPriceDelta.mul(BASIS_POINTS_DIVISOR).div(markPrice)
    );

    positions.push({
      key,
      account: accountAddress,
      ensName,
      avatarUrl,
      isLong: p.isLong,
      marketInfo: positionInfo.marketInfo,
      markPrice,
      collateralToken: positionInfo.collateralToken,
      entryPrice: positionInfo.entryPrice!,
      sizeInUsd: currSuzeInUsd,
      collateralAmount,
      collateralAmountUsd,
      maxSize: BigNumber.from(p.maxSize),
      priceImpactUsd: BigNumber.from(p.priceImpactUsd),
      collectedBorrowingFeesUsd: BigNumber.from(p.borrowingFeeUsd),
      collectedFundingFeesUsd: BigNumber.from(p.fundingFeeUsd),
      collectedPositionFeesUsd: BigNumber.from(p.positionFeeUsd),
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
  const pageSize = 1000;
  let data: OpenPositionJson[] = [];
  let skip = 0;

  while (true) {
    const page = await fetchOpenPositionsPage(chainId, pageSize, skip);
    if (!page || !page.length) {
      break;
    }
    data = data.concat(page);
    skip += pageSize;
  }

  return data;
};

export function useOpenPositions() {
  const { chainId } = useChainId();
  const ensNames = {}; // FIXME: use useEnsBatchLookup instead
  const avatarUrls = {}; // FIXME: use useEnsBatchLookup instead

  const { tokensData, marketsInfoData, pricesUpdatedAt } = useMarketsInfo(chainId);
  const positions = useSWR(['/leaderboards/positions', chainId], fetchOpenPositions(chainId));
  const positionsHash = (positions.data || []).map(p => p.id).join("-");
  const { keys, prices } =  useMemo((): { keys: string[], prices: ContractMarketPrices[] } => {
    if (!marketsInfoData || !tokensData) {
      return { keys: [], prices: [] };
    }

    const keys: string[] = [];
    const prices: ContractMarketPrices[] = [];
    for (const p of positions.data || []) {
      const marketData = marketsInfoData[getAddress(p.market)];
      const contractMarketPrices = getContractMarketPrices(tokensData, marketData);
      if (contractMarketPrices) {
        keys.push(p.id);
        prices.push(contractMarketPrices);
      }
    }

    return { keys, prices };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pricesUpdatedAt, chainId, positionsHash]);

  const positionsInfo = usePositionsInfo(positionsHash, keys, prices);
  const error = positions.error || positionsInfo.error;
  const isLoading = !error && (
    !positions.data ||
    !positionsInfo.data ||
    positions.data.length !== Object.keys(positionsInfo.data).length
  );

  const ensNamesLength = Object.keys(ensNames).length;
  const avatarUrlsLength = Object.keys(avatarUrls).length;
  const [data, setData] = useState<OpenPosition[]>();
  useEffect(() => {
    if(!isLoading && !error) {
      setData(parseOpenPositions(
        positions.data || [],
        positionsInfo.data,
        ensNames,
        avatarUrls
      ));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isLoading,
    error,
    pricesUpdatedAt,
    chainId,
    positionsHash,
    ensNamesLength,
    avatarUrlsLength,
  ]);

  return { isLoading: !data, error, data: data || [] };
};
