import { gql } from "@apollo/client";
import useSWR from "swr";
import type { Address } from "viem";

import { selectChainId, selectMarketsInfoData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getByKey } from "sdk/utils/objects";

import { getSubsquidGraphClient } from "lib/subgraph/clients";
import { useMemo } from "react";
import { NATIVE_TOKEN_ADDRESS, convertTokenAddress } from "sdk/configs/tokens";

type PositionVolumeInfosResponse = Record<Address, bigint>;

const MARKET_VOLUMES_QUERY = gql`
  query MarketVolumesInfoResolver($timestamp: Float!) {
    positionsVolume(where: { timestamp: $timestamp }) {
      volume
      market
    }
  }
`;

export function use24hVolumes() {
  const chainId = useSelector(selectChainId);
  const marketsInfoData = useSelector(selectMarketsInfoData);

  const LAST_DAY_UNIX_TIMESTAMP = Math.floor(Date.now() / 1000) - 24 * 60 * 60;
  const timestamp = LAST_DAY_UNIX_TIMESTAMP;

  const variables = {
    timestamp: timestamp,
  };

  const { data } = useSWR<PositionVolumeInfosResponse | undefined>(
    [chainId, "24hVolume"],
    async () => {
      const client = getSubsquidGraphClient(chainId);

      if (!client) {
        return;
      }

      const response = await client.query<{ positionsVolume: { volume: string; market: Address }[] }>({
        query: MARKET_VOLUMES_QUERY,
        variables,
      });

      return response.data?.positionsVolume.reduce(
        (acc, entry) => {
          acc[entry.market] = BigInt(entry.volume);

          return acc;
        },
        {} as Record<Address, bigint>
      );
    },
    {
      refreshInterval: 60_000,
    }
  );

  return useMemo(() => {
    if (!data) {
      return {
        byIndexToken: {},
        byMarketToken: {},
      };
    }

    if (!marketsInfoData) {
      return {
        byIndexToken: {},
        byMarketToken: data,
      };
    }

    const byIndexToken: PositionVolumeInfosResponse = {};

    Object.entries(data).forEach(([market, volume]) => {
      const marketInfo = getByKey(marketsInfoData, market);

      if (!marketInfo) {
        return;
      }

      const indexTokenAddress = marketInfo?.indexTokenAddress;

      if (!indexTokenAddress) {
        return;
      }

      byIndexToken[indexTokenAddress] =
        (byIndexToken[indexTokenAddress] === undefined ? 0n : byIndexToken[indexTokenAddress]) + BigInt(volume);

      if (indexTokenAddress === convertTokenAddress(chainId, NATIVE_TOKEN_ADDRESS, "wrapped")) {
        byIndexToken[NATIVE_TOKEN_ADDRESS] = byIndexToken[indexTokenAddress];
      }
    });

    return {
      byIndexToken,
      byMarketToken: data,
    };
  }, [data, marketsInfoData, chainId]);
}
