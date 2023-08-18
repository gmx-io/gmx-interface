import { gql } from "@apollo/client";
import { BigNumber } from "ethers";
import { getSyntheticsGraphClient } from "lib/subgraph";
import useSWR from "swr";

const query = gql`
  query volume24h($lastTimestamp: Int!) {
    volumeInfos(where: { id_gte: $lastTimestamp, period: "1h" }) {
      period
      volumeUsd
      id
    }
  }
`;
export default function use24HVolume(chains: number[]) {
  const currentTimePeriod = Math.floor(Date.now() / 1000 / 3600) * 3600;
  const lastPeriodForTheDay = currentTimePeriod - 3600 * 24;
  const { data: volumes } = useSWR("24hVolume", {
    fetcher: async () => {
      return chains.reduce(async (acc, chain) => {
        const client = getSyntheticsGraphClient(chain);
        const { data } = await client!.query({
          query,
          variables: {
            lastTimestamp: lastPeriodForTheDay,
          },
          fetchPolicy: "no-cache",
        });
        const totalVolume = await data.volumeInfos.reduce(
          (acc, { volumeUsd }) => acc.add(volumeUsd),
          BigNumber.from(0)
        );
        acc[chain] = totalVolume;
        return acc;
      }, {});
    },
  });
  return volumes;
}
