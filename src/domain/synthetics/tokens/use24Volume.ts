import { useMemo } from "react";
import useSWR from "swr";

import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { selectTradeboxMarketInfo } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";

import { TIMEZONE_OFFSET_SEC } from "domain/prices";

import { getSubgraphUrl } from "config/subgraph";
import graphqlFetcher from "lib/graphqlFetcher";

type PositionVolumeInfosResponse = {
  marketPositionVolumeInfos: {
    volumeUsd: number;
  }[];
};

const POSITIONS_VOLUME_INFOS_QUERY = `
query GetMarketPositionVolumeInfos($marketToken: String!, $timestamp: Int!) {
  marketPositionVolumeInfos(
    where: { period_eq: "1h", marketAddress_eq: $marketToken, timestampGroup_gt: $timestamp }
  ) {
    id
    volumeUsd
    timestampGroup
  }
}`;

export function use24hVolume() {
  const chainId = useSelector(selectChainId);
  const marketInfo = useSelector(selectTradeboxMarketInfo);

  const endpoint = getSubgraphUrl(chainId, "subsquid");

  const LAST_DAY_UNIX_TIMESTAMP = Math.floor(Date.now() / 1000) - 24 * 60 * 60;
  const timestamp = LAST_DAY_UNIX_TIMESTAMP + TIMEZONE_OFFSET_SEC;

  const marketTokenAddress = marketInfo?.marketTokenAddress;

  const variables = {
    marketToken: marketTokenAddress,
    timestamp: timestamp,
  };

  const { data } = useSWR<PositionVolumeInfosResponse | undefined>(
    variables.marketToken ? `24hVolume-${marketTokenAddress}` : null,
    async () => {
      if (!endpoint || !variables.marketToken) {
        return;
      }

      return await graphqlFetcher<PositionVolumeInfosResponse>(endpoint, POSITIONS_VOLUME_INFOS_QUERY, variables);
    },
    {
      refreshInterval: 60_000,
    }
  );

  return useMemo(() => {
    return data?.marketPositionVolumeInfos.reduce((acc, { volumeUsd }) => acc + BigInt(volumeUsd), 0n);
  }, [data]);
}
