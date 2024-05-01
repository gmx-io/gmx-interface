import useSWR from "swr";
import { getTotalVolumeSum } from "lib/legacy";
import { ARBITRUM, AVALANCHE } from "config/chains";
import { getServerUrl } from "config/backend";
import { bigNumberify } from "lib/numbers";
import { arrayURLFetcher } from "lib/fetcher";
const ACTIVE_CHAIN_IDS = [ARBITRUM, AVALANCHE];

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
        acc.total = acc.total.add(sum);
        return acc;
      },
      { total: 0n! }
    );
  }
}
