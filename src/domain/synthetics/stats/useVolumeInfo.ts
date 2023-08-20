import { gql } from "@apollo/client";
import { BigNumber } from "ethers";
import { getSyntheticsGraphClient } from "lib/subgraph";
import useSWR from "swr";

type VolumeInfo = {
  dailyVolume: BigNumber;
  totalVolume: BigNumber;
};

const query = gql`
  query volumeInfo($lastTimestamp: Int!) {
    hourlyVolumeInfos: volumeInfos(where: { id_gte: $lastTimestamp, period: "1h" }) {
      volumeUsd
      id
    }
    totalVolumeInfos: volumeInfos(where: { period: "total" }) {
      volumeUsd
      period
      id
    }
  }
`;

export default function useVolumeInfo(chains: number[]) {
  const lastPeriodFor24Hours = Math.floor(Date.now() / 1000 / 3600) * 3600 - 60 * 60 * 24;

  async function fetchVolumeData(chain: number) {
    try {
      const client = getSyntheticsGraphClient(chain);
      const { data } = await client!.query({
        query,
        variables: {
          lastTimestamp: lastPeriodFor24Hours,
        },
        fetchPolicy: "no-cache",
      });
      const { hourlyVolumeInfos, totalVolumeInfos } = data;
      const dailyVolume = hourlyVolumeInfos.reduce((acc, { volumeUsd }) => acc.add(volumeUsd), BigNumber.from(0));
      return {
        dailyVolume,
        totalVolume: totalVolumeInfos[0].volumeUsd,
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Error fetching volume data for chain ${chain}:`, error);
      return {
        dailyVolume: BigNumber.from(0),
        totalVolume: BigNumber.from(0),
      };
    }
  }

  async function fetcher() {
    try {
      const promises = chains.map(fetchVolumeData);
      const results = await Promise.allSettled(promises);
      const volumes = results
        .filter((result) => result.status === "fulfilled")
        .reduce((acc, result, index) => {
          const value = (result as PromiseFulfilledResult<VolumeInfo>).value;
          acc[chains[index]] = value;
          return acc;
        }, {});
      return volumes;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error fetching volume data:", error);
      return {};
    }
  }

  const { data: volumes } = useSWR("v2VolumeInfos", fetcher, {
    refreshInterval: 60000,
  });

  return volumes;
}
