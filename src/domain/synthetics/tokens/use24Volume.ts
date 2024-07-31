import { useMemo } from "react";
import useSWR from "swr";

import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { selectTradeboxMarketInfo } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";

import { TIMEZONE_OFFSET_SEC } from "domain/prices";

import { getSubgraphUrl } from "config/subgraph";
import graphqlFetcher from "lib/graphqlFetcher";

type PositionVolumeInfosResponse = {
  positionVolumeInfos: {
    volumeUsd: number;
  }[];
};

const POSITIONS_VOLUME_INFOS_QUERY = `
query GetPositionVolumeInfos($indexToken: String!, $timestamp: Int!) {
  positionVolumeInfos(
    orderBy: timestamp
    orderDirection: desc
    where: { period: "1h", indexToken: $indexToken, timestamp_gt: $timestamp }
  ) {
    id
    volumeUsd
    timestamp
    __typename
  }
}`;

export function use24hVolume() {
  const chainId = useSelector(selectChainId);
  const marketInfo = useSelector(selectTradeboxMarketInfo);

  const endpoint = getSubgraphUrl(chainId, "syntheticsStats");

  const LAST_DAY_UNIX_TIMESTAMP = Math.floor(Date.now() / 1000) - 24 * 60 * 60;
  const timestamp = LAST_DAY_UNIX_TIMESTAMP + TIMEZONE_OFFSET_SEC;

  const variables = {
    indexToken: marketInfo?.indexTokenAddress.toLocaleLowerCase(),
    timestamp: timestamp,
  };

  const { data } = useSWR<PositionVolumeInfosResponse | undefined>(
    variables.indexToken ? "24hVolume" : null,
    async () => {
      if (!endpoint || !variables.indexToken) {
        return;
      }

      return await graphqlFetcher<PositionVolumeInfosResponse>(endpoint, POSITIONS_VOLUME_INFOS_QUERY, variables);
    },
    {
      refreshInterval: 60_000,
    }
  );

  return useMemo(() => {
    return data?.positionVolumeInfos.reduce((acc, { volumeUsd }) => acc + BigInt(volumeUsd), 0n);
  }, [data]);
}
