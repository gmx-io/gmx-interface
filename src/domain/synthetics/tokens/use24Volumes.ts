import { gql } from "@apollo/client";
import useSWR from "swr";
import type { Address } from "viem";

import { selectChainId, selectMarketsInfoData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getByKey } from "sdk/utils/objects";

import { NATIVE_TOKEN_ADDRESS, convertTokenAddress } from "sdk/configs/tokens";
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

  const { data } = useSWR<
    | {
        byIndexToken: PositionVolumeInfosResponse;
        byMarketToken: PositionVolumeInfosResponse;
      }
    | undefined
  >(
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

      const byIndexToken: PositionVolumeInfosResponse = {};
      const byMarketToken: PositionVolumeInfosResponse = {};

      response.data?.positionsVolume.forEach(
        (entry) => {
          const marketInfo = getByKey(marketsInfoData, entry.market);

          if (!marketInfo) {
            return;
          }

          byMarketToken[entry.market] = BigInt(entry.volume);

          const indexTokenAddress = marketInfo?.indexTokenAddress;

          if (!indexTokenAddress) {
            return;
          }

          byIndexToken[indexTokenAddress] =
            (byIndexToken[indexTokenAddress] === undefined ? 0n : byIndexToken[indexTokenAddress]) +
            BigInt(entry.volume);

          if (indexTokenAddress === convertTokenAddress(chainId, NATIVE_TOKEN_ADDRESS, "wrapped")) {
            byIndexToken[NATIVE_TOKEN_ADDRESS] = byIndexToken[indexTokenAddress];
          }
        },
        {} as Record<Address, bigint>
      );

      return {
        byIndexToken,
        byMarketToken,
      };
    },
    {
      refreshInterval: 60_000,
    }
  );

  return data;
}
