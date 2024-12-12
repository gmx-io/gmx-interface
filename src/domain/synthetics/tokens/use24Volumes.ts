import { gql } from "@apollo/client";
import useSWR from "swr";
import type { Address } from "viem";

import { selectChainId, selectMarketsInfoData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getByKey } from "sdk/utils/objects";

import { NATIVE_TOKEN_ADDRESS, convertTokenAddress } from "config/tokens";
import { TIMEZONE_OFFSET_SEC } from "domain/prices/constants";
import { getSubsquidGraphClient } from "lib/subgraph/clients";

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
  const timestamp = LAST_DAY_UNIX_TIMESTAMP + TIMEZONE_OFFSET_SEC;

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
        (acc, cur) => {
          const marketInfo = getByKey(marketsInfoData, cur.market);

          if (!marketInfo) {
            return acc;
          }

          const indexTokenAddress = marketInfo?.indexTokenAddress;

          if (!indexTokenAddress) {
            return acc;
          }

          acc[indexTokenAddress] = (acc[indexTokenAddress] || 0n) + BigInt(cur.volume);
          if (indexTokenAddress === convertTokenAddress(chainId, NATIVE_TOKEN_ADDRESS, "wrapped")) {
            acc[NATIVE_TOKEN_ADDRESS] = acc[indexTokenAddress];
          }

          return acc;
        },
        {} as Record<Address, bigint>
      );
    },
    {
      refreshInterval: 60_000,
    }
  );

  return data;
}
