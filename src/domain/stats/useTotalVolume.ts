import useSWR from "swr";

import { getServerUrl } from "config/backend";
import { ARBITRUM, AVALANCHE } from "config/chains";
import { arrayURLFetcher } from "lib/fetcher";

const ACTIVE_CHAIN_IDS = [ARBITRUM, AVALANCHE];

export function getTotalVolumeSum(volumes: { data: { volume: string } }[] | undefined) {
  if (!volumes || volumes.length === 0) {
    return;
  }

  let volume = 0n;

  for (let i = 0; i < volumes.length; i++) {
    volume = volume + BigInt(volumes[i].data.volume);
  }

  return volume;
}

export function useTotalVolume() {
  const { data: totalVolume } = useSWR<any>(
    ACTIVE_CHAIN_IDS.map((chain) => getServerUrl(chain, "/total_volume")),
    {
      fetcher: arrayURLFetcher,
    }
  );
  if (totalVolume?.length > 0) {
    return ACTIVE_CHAIN_IDS.reduce(
      (acc, chainId, index) => {
        const sum = getTotalVolumeSum(totalVolume[index])!;
        acc[chainId] = sum;
        acc.total = acc.total + sum;
        return acc;
      },
      { total: 0n }
    );
  }
}
