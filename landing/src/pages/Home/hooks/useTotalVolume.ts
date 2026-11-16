import { gql } from "@apollo/client";

import { getServerUrl } from "config/backend";
import { getSubsquidGraphClient } from "lib/indexers";
import { getTotalVolumeSum } from "lib/legacy";
import { useSWRWithFreshness } from "lib/useSWRWithFreshness";
import { ARBITRUM, AVALANCHE } from "sdk/configs/chainIds";

const query = {
  query: gql`
    query VolumeInfos {
      volumeInfos(where: { period_eq: "total" }, limit: 1) {
        volumeUsd
      }
    }
  `,
};

type TotalVolumeByChain = Record<number | "total", bigint>;

export function useTotalVolume() {
  const clientArbitum = getSubsquidGraphClient(ARBITRUM)!;
  const clientAvalanche = getSubsquidGraphClient(AVALANCHE)!;
  return useSWRWithFreshness(["volumeInfos"], async (): Promise<TotalVolumeByChain> => {
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
    const arbitrum = totalArbitumFromApi + syntheticsArbitum;
    const avalanche = totalAvalancheFromApi + syntheticsAvalanche;
    return { [ARBITRUM]: arbitrum, [AVALANCHE]: avalanche, total: arbitrum + avalanche };
  });
}

function fetchTotalVolumeByChainId(chainId: number) {
  const url = getServerUrl(chainId, "/total_volume");
  return fetch(url).then((res) => res.json());
}
