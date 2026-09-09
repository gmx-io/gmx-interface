import { gql } from "@apollo/client";
import useSWR from "swr";

import { ARBITRUM, AVALANCHE } from "config/chains";
import { getGmxGraphClient } from "lib/indexers/clients";
import { sumBigInts } from "lib/sumBigInts";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";

const volumeStatsQuery = gql`
  query volumeInfo($lastTimestamp: Int!) {
    volumeStats(where: { period: hourly, id_gte: $lastTimestamp }, orderBy: id, orderDirection: desc, first: 25) {
      margin
      swap
      liquidation
      mint
      burn
    }
  }
`;

type VolumeStatsItem = {
  margin: string;
  swap: string;
  liquidation: string;
  mint: string;
  burn: string;
};

type VolumeStatsData = {
  volumeStats: VolumeStatsItem[];
};

async function fetchDailyVolume(chainId: number) {
  try {
    const client = getGmxGraphClient(chainId);
    const lastTimestamp = Math.floor(Date.now() / 1000 / 3600) * 3600 - 60 * 60 * 24;

    const { data } = await client!.query<VolumeStatsData>({
      query: volumeStatsQuery,
      variables: {
        lastTimestamp,
      },
      fetchPolicy: "no-cache",
    });

    return data.volumeStats.reduce(
      (acc, stat) => acc + sumBigInts(...[stat.margin, stat.swap, stat.liquidation, stat.mint, stat.burn].map(BigInt)),
      0n
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Error fetching V1 volume data for chain ${chainId}:`, error);

    // a chain that failed stays unknown: a zero here would settle its network total as complete
    return undefined;
  }
}

export function useVolumeInfo() {
  const { data } = useSWR(
    "v1VolumeInfo",
    async () => {
      const [arbitrum, avalanche] = await Promise.all([fetchDailyVolume(ARBITRUM), fetchDailyVolume(AVALANCHE)]);

      return {
        [ARBITRUM]: arbitrum,
        [AVALANCHE]: avalanche,
      };
    },
    {
      refreshInterval: CONFIG_UPDATE_INTERVAL,
    }
  );

  return data;
}
