import { useMemo } from "react";
import useSWR from "swr";

import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { selectTradeboxMarketInfo } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";

import { TIMEZONE_OFFSET_SEC } from "domain/prices/constants";

import { getSubgraphUrl } from "config/subgraph";
import graphqlFetcher from "lib/graphqlFetcher";

type PositionVolumeInfosResponse = {
  positionsVolume24hByMarket: string;
};

const POSITIONS_VOLUME_INFOS_QUERY = `
query PositionVolumeInfoResolver($marketAddress: String!, $timestamp: Float!) {
  positionsVolume24hByMarket(where: {timestamp: $timestamp, marketAddress: $marketAddress})
}`;

export function use24hVolume() {
  const chainId = useSelector(selectChainId);
  const marketInfo = useSelector(selectTradeboxMarketInfo);

  const endpoint = getSubgraphUrl(chainId, "subsquid");

  const LAST_DAY_UNIX_TIMESTAMP = Math.floor(Date.now() / 1000) - 24 * 60 * 60;
  const timestamp = LAST_DAY_UNIX_TIMESTAMP + TIMEZONE_OFFSET_SEC;

  const marketTokenAddress = marketInfo?.marketTokenAddress;

  const variables = {
    marketAddress: marketTokenAddress,
    timestamp: timestamp,
  };

  const { data } = useSWR<PositionVolumeInfosResponse | undefined>(
    variables.marketAddress ? `24hVolume-${marketTokenAddress}` : null,
    async () => {
      if (!endpoint || !variables.marketAddress) {
        return;
      }

      return await graphqlFetcher<PositionVolumeInfosResponse>(endpoint, POSITIONS_VOLUME_INFOS_QUERY, variables);
    },
    {
      refreshInterval: 60_000,
    }
  );

  return useMemo(() => {
    return data?.positionsVolume24hByMarket ? BigInt(data?.positionsVolume24hByMarket) : undefined;
  }, [data]);
}
