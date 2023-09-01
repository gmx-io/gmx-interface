import useSWR from "swr";
import { BigNumber, utils } from "ethers";
import { getAddress } from "ethers/lib/utils";
import { queryAccountOpenPositions } from "./queries"
import { arbitrumGoerliLeaderboardsClient as graph } from "lib/subgraph/clients";
import { AccountOpenPositionJson, AccountOpenPosition } from "./types";
import { ContractMarketPrices, getContractMarketPrices, useMarketsInfo } from "../markets";
import { convertToUsd } from "../tokens";
// import { useChainId } from "lib/chains";
import { usePositionsInfo } from "./usePositionsInfo";
import { PositionsInfoData, getPositionKey } from "../positions";
import { useEffect, useState } from "react";
import { expandDecimals } from "lib/numbers";
import { USD_DECIMALS } from "lib/legacy";
import { AVALANCHE } from "config/chains";
// import { useEnsBatchLookup } from "./useEnsBatchLookup";

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
  positionsByKey: PositionsInfoData,
  ensNames: Record<string, string>,
  avatarUrls: Record<string, string>,
): AccountOpenPosition[] => {
  const positions: AccountOpenPosition[] = [];

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

    const currSuzeInUsd = convertToUsd(
      BigNumber.from(p.sizeInTokens),
      positionInfo.indexToken.decimals,
      positionInfo.indexToken.prices[p.isLong ? "minPrice" : "maxPrice"],
    )!;

    const prevSizeInUsd = BigNumber.from(p.sizeInUsd);
    const unrealizedPnl = p.isLong
      ? currSuzeInUsd.sub(prevSizeInUsd)
      : prevSizeInUsd.sub(currSuzeInUsd);

    const liquidationPrice = positionInfo.liquidationPrice;
    const markPrice = positionInfo.markPrice;
    const liquidationPriceDelta = liquidationPrice && liquidationPrice.sub(markPrice);
    const liquidationPriceDeltaRel = liquidationPrice && liquidationPriceDelta && (
      liquidationPriceDelta
        .mul(expandDecimals(1, USD_DECIMALS))
        .mul(BigNumber.from(100))
        .div(markPrice)
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
      entryPrice: positionInfo.entryPrice!, // BigNumber.from(p.entryPrice),
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
    });
  }

  return positions;
};

const fetchAccountOpenPositions = async () => {
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
};

export function useAccountOpenPositions() {
  // const { chainId } = useChainId();
  const chainId = AVALANCHE; // FIXME: usechainid as soon as the graph deployed to all networks
  const { tokensData, marketsInfoData, pricesUpdatedAt } = useMarketsInfo(chainId);
  const positions = useSWR(['/leaderboards/positions', chainId], fetchAccountOpenPositions);
  // const { ensNames, avatarUrls } = useEnsBatchLookup((positions.data || []).map((p) => p.account));
  const ensNames = {};
  const avatarUrls = {};
  const [positionsHash, setPositionsHash] = useState<string>("");
  const [keys, setKeys] = useState<string[]>([]);
  const [prices, setPrices] = useState<ContractMarketPrices[]>([]);
  const [data, setData] = useState<AccountOpenPosition[]>([]);

  let positionKeys: number[] = [];

  for (const { id } of positions.data || []) {
    for (const c of id) {
      positionKeys.push(c.charCodeAt(0));
    }
  }

  const hash: string = utils.sha256(positionKeys);

  if (hash !== positionsHash) {
    setPositionsHash(hash);
  }

  useEffect(() => {
    if (!marketsInfoData || !tokensData) {
      return;
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
    setKeys(keys);
    setPrices(prices);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pricesUpdatedAt, chainId, positionsHash]);

  const positionsInfo = usePositionsInfo(chainId, positionsHash, keys, prices);
  const error = positions.error || positionsInfo.error;
  const isLoading = !error && !(
    tokensData &&
    positions.data &&
    marketsInfoData &&
    positionsInfo.data &&
    positions.data.length === Object.keys(positionsInfo.data).length
  );

  const ensNamesLength = Object.keys(ensNames).length;
  const avatarUrlsLength = Object.keys(avatarUrls).length;
  useEffect(() => {
    if (!isLoading && !error) {
      setData(
        parseAccountOpenPositions(positions.data!, positionsInfo.data, ensNames, avatarUrls)
      );
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

  return { isLoading, error, data };
};
