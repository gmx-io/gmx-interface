import { getServerUrl } from "config/backend";
import { ARBITRUM, AVALANCHE } from "config/chains";
import { arrayURLFetcher } from "lib/fetcher";
import { getTotalVolumeSum } from "lib/legacy";
import { useSWRWithFreshness } from "lib/useSWRWithFreshness";

const ACTIVE_CHAIN_IDS = [ARBITRUM, AVALANCHE];

type TotalVolumeByChain = Record<number | "total", bigint>;

export function useTotalVolume() {
  return useSWRWithFreshness(
    ACTIVE_CHAIN_IDS.map((chain) => getServerUrl(chain, "/total_volume")),
    async (urls: string[]): Promise<TotalVolumeByChain> => {
      const volumes = await arrayURLFetcher(urls);

      return ACTIVE_CHAIN_IDS.reduce(
        (acc, chainId, index) => {
          const sum = getTotalVolumeSum(volumes[index])!;
          acc[chainId] = sum;
          acc.total = acc.total + sum;
          return acc;
        },
        { total: 0n } as TotalVolumeByChain
      );
    }
  );
}
