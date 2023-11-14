import useSWR from "swr";
import { RawIncentivesStats, useOracleKeeperFetcher } from "../tokens";
import { useChainId } from "lib/chains";

export default function useIncentiveStats(overrideChainId: number) {
  const { chainId: defaultChainId } = useChainId();
  const chainId = overrideChainId ?? defaultChainId;
  const oracleKeeperFetcher = useOracleKeeperFetcher(chainId);

  return (
    useSWR<RawIncentivesStats | null>(["incentiveStats", chainId], async () => {
      if (!oracleKeeperFetcher) {
        return null;
      }
      const res = await oracleKeeperFetcher.fetchIncentivesRewards();
      return res;
    }).data ?? null
  );
}
