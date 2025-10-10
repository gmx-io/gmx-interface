import { gql } from "@apollo/client";
import useSWR from "swr";

import { getServerUrl } from "config/backend";
import { getTotalVolumeSum } from "lib/legacy";
import { getSyntheticsGraphClient } from "lib/subgraph";
import { ARBITRUM, AVALANCHE } from "sdk/configs/chainIds";
const query = {
  query: gql`
    query VolumeInfos {
      volumeInfos(where: { period: "total" }) {
        volumeUsd
      }
    }
  `,
};
export function useTotalVolume() {
  const clientArbitum = getSyntheticsGraphClient(ARBITRUM)!;
  const clientAvalanche = getSyntheticsGraphClient(AVALANCHE)!;
  return useSWR(["volumeInfos"], async () => {
    const totalArbitumVolumeReq = fetchTotalVolumeByChainId(ARBITRUM);
    const totalAvalancheVolumeReq = fetchTotalVolumeByChainId(AVALANCHE);

    const syntheticsArbitumReq = clientArbitum.query(query);
    const syntheticsAvalancheReq = clientAvalanche.query(query);
    const [totalArbitumVolumeRes, totalAvalancheVolumeRes, syntheticsArbitumRes, syntheticsAvalancheRes] =
      await Promise.all([totalArbitumVolumeReq, totalAvalancheVolumeReq, syntheticsArbitumReq, syntheticsAvalancheReq]);
    const totalArbitumFromApi = getTotalVolumeSum(totalArbitumVolumeRes) ?? 0n;
    const totalAvalancheFromApi = getTotalVolumeSum(totalAvalancheVolumeRes) ?? 0n;
    const syntheticsArbitum = BigInt(syntheticsArbitumRes.data?.volumeInfos[0].volumeUsd ?? 0n);
    const syntheticsAvalanche = BigInt(syntheticsAvalancheRes.data?.volumeInfos[0].volumeUsd ?? 0n);
    return totalArbitumFromApi + totalAvalancheFromApi + syntheticsArbitum + syntheticsAvalanche;
  });
}

function fetchTotalVolumeByChainId(chainId: number) {
  const url = getServerUrl(chainId, "/total_volume");
  return fetch(url).then((res) => res.json());
}
