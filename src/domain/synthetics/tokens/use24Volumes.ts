import { gql } from "@apollo/client";
import useSWR from "swr";
import type { Address } from "viem";

import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";

import { NATIVE_TOKEN_ADDRESS, convertTokenAddress } from "config/tokens";
import { TIMEZONE_OFFSET_SEC } from "domain/prices";
import { getSubsquidGraphClient } from "lib/subgraph/clients";

type PositionVolumeInfosResponse = Record<Address, bigint>;

const MARKET_VOLUMES_QUERY = gql`
  query MarketVolumesInfoResolver($indexTokenAddresses: [String!]!, $timestamp: Float!) {
    positionsVolume24hByIndexTokens(where: { timestamp: $timestamp, indexTokenAddresses: $indexTokenAddresses }) {
      volume
      indexTokenAddress
    }
  }
`;

export function use24hVolumes(indexTokenAddresses: (Address | undefined)[]) {
  const chainId = useSelector(selectChainId);

  const LAST_DAY_UNIX_TIMESTAMP = Math.floor(Date.now() / 1000) - 24 * 60 * 60;
  const timestamp = LAST_DAY_UNIX_TIMESTAMP + TIMEZONE_OFFSET_SEC;

  const variables = {
    indexTokenAddresses: indexTokenAddresses
      .filter((address): address is Address => Boolean(address))
      .map((address) => convertTokenAddress(chainId, address, "wrapped")),
    timestamp: timestamp,
  };

  const { data } = useSWR<PositionVolumeInfosResponse | undefined>(
    variables.indexTokenAddresses.length > 0 ? [chainId, "24hVolume", variables.indexTokenAddresses] : null,
    async () => {
      const client = getSubsquidGraphClient(chainId);

      if (!client) {
        return;
      }

      const response = await client.query({
        query: MARKET_VOLUMES_QUERY,
        variables,
      });

      return Object.fromEntries(
        response.data?.positionsVolume24hByIndexTokens.flatMap(({ volume, indexTokenAddress }) => {
          if (indexTokenAddress === convertTokenAddress(chainId, NATIVE_TOKEN_ADDRESS, "wrapped")) {
            return [
              [NATIVE_TOKEN_ADDRESS, BigInt(volume)],
              [indexTokenAddress, BigInt(volume)],
            ];
          }

          return [[indexTokenAddress, BigInt(volume)]];
        })
      );
    },
    {
      refreshInterval: 60_000,
    }
  );

  return data;
}
