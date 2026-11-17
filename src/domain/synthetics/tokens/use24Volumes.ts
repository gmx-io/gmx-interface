import { gql } from "@apollo/client";
import { useMemo } from "react";
import useSWR from "swr";
import type { Address } from "viem";

import { isSolanaNetwork } from "config/chains";
import { selectChartDataProvider } from "context/SyntheticsStateContext/selectors/chartDataSelectors";
import { selectChainId, selectMarketsInfoData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useChainId } from "lib/chains";
import { getSubsquidGraphClient } from "lib/indexers/clients";
import { NATIVE_TOKEN_ADDRESS, convertTokenAddress } from "sdk/configs/tokens";
import { getByKey } from "sdk/utils/objects";

type PositionVolumeInfosResponse = Record<Address, bigint>;

const MARKET_VOLUMES_QUERY = gql`
  {
    positionsVolume(where: { period: "1d" }) {
      volume
      market
    }
  }
`;

export function use24hVolumes() {
  const chainId = useSelector(selectChainId);
  const marketsInfoData = useSelector(selectMarketsInfoData);
  const chartDataProvider = useSelector(selectChartDataProvider);
  const { networkId } = useChainId();
  // On Solana chainId stays Arbitrum; its indexer has no Solana markets, so volumes come from the Solana host.
  const isSolana = isSolanaNetwork(networkId);

  const { data } = useSWR<PositionVolumeInfosResponse | undefined>(
    isSolana && !chartDataProvider ? null : [isSolana ? networkId : chainId, "24hVolume"],
    async () => {
      if (isSolana) {
        return chartDataProvider!.fetch24hVolumes();
      }

      const client = getSubsquidGraphClient(chainId);

      if (!client) {
        return;
      }

      const response = await client.query<{ positionsVolume: { volume: string; market: Address }[] }>({
        query: MARKET_VOLUMES_QUERY,
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
