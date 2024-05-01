import { gql } from "@apollo/client";
import { MarketInfo, useMarketsInfoRequest } from "domain/synthetics/markets";
import { TokenData } from "domain/synthetics/tokens";
import { getAddress } from "ethers";
import { useChainId } from "lib/chains";
import { getByKey } from "lib/objects";
import { getSyntheticsGraphClient } from "lib/subgraph";
import { useEffect, useState } from "react";
import { useLatest } from "react-use";

type RawRebateGroup = {
  id: string;
  timeKey: string;
  marketAddress: string;
  tokenAddress: string;
  factor: string;
  claimables: {
    account: string;
    value: bigint;
    factor: bigint;
    id: string;
  }[];
};

export type RebateGroup = {
  id: string;
  timeKey: string;
  marketInfo: MarketInfo | undefined;
  tokenData: TokenData | undefined;
  factor: bigint;
  userRebates: UserRebate[];
};

export type UserRebate = {
  account: string;
  value: bigint;
  factor: bigint;
  tokenData: TokenData | undefined;
  marketInfo: MarketInfo | undefined;
  timeKey: string;
  id: string;
};

const pageSize = 1000;

export const usePriceImpactRebateGroups = (
  pageIndex: number,
  inclReviewed: boolean
): [hasMore: boolean, loadedPageIndex: number, data: RebateGroup[]] => {
  const { chainId } = useChainId();
  const { marketsInfoData, tokensData } = useMarketsInfoRequest(chainId);
  const marketsInfoDataLatest = useLatest(marketsInfoData);
  const tokensDataLatest = useLatest(tokensData);
  const [marketsReady, setMarketsReady] = useState(false);
  const [loadedPageIndex, setLoadedPageIndex] = useState(-1);
  const [data, setData] = useState<RebateGroup[]>([]);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    if (!marketsInfoData || !tokensData) return;

    setMarketsReady(true);
  }, [marketsInfoData, tokensData]);
  useEffect(() => {
    setLoadedPageIndex(-1);
  }, [inclReviewed]);

  const client = getSyntheticsGraphClient(chainId);

  useEffect(() => {
    if (!marketsReady) return;

    async function load() {
      if (!client) throw new Error(`Unsupported chain ${chainId}`);
      const query = gql(`{
        claimableCollateralGroups(
          skip: ${pageIndex * pageSize}
          first: ${pageSize}
          orderBy: timeKey
          orderDirection: desc
          where: { ${inclReviewed ? "" : "factor: 0"} }
        ) {
            id
            timeKey
            marketAddress
            tokenAddress
            factor
            claimables {
              id
              account
              value
              factor
           }
      }
    }`);

      const { data } = await client.query({ query, fetchPolicy: "no-cache" });

      const rebateGroups = data.claimableCollateralGroups.map(
        (group: RawRebateGroup): RebateGroup => ({
          factor: BigInt(group.factor),
          id: group.id,
          marketInfo: getByKey(marketsInfoDataLatest.current, getAddress(group.marketAddress)),
          tokenData: getByKey(tokensDataLatest.current, getAddress(group.tokenAddress)),
          timeKey: group.timeKey,
          userRebates: group.claimables.map((userRebate) => ({
            account: userRebate.account,
            value: BigInt(userRebate.value),
            factor: BigInt(userRebate.factor),
            tokenData: getByKey(tokensDataLatest.current, getAddress(group.tokenAddress)),
            marketInfo: getByKey(marketsInfoDataLatest.current, getAddress(group.marketAddress)),
            timeKey: group.timeKey,
            id: userRebate.id,
          })),
        })
      );

      setData(rebateGroups);
      setLoadedPageIndex(pageIndex);
      setHasMore(rebateGroups.length === pageSize);
    }

    load();
  }, [chainId, client, marketsInfoDataLatest, marketsReady, pageIndex, inclReviewed, tokensDataLatest]);

  return [hasMore, loadedPageIndex, data];
};
