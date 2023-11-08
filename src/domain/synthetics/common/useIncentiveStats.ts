import useSWR from "swr";
import { RawIncentivesStats, useOracleKeeperFetcher } from "../tokens";

export default function useIncentiveStats(chainId: number) {
  const oracleKeeperFetcher = useOracleKeeperFetcher(chainId);

  return (
    useSWR<RawIncentivesStats | null>(`incentiveStats-${chainId}`, async () => {
      if (!oracleKeeperFetcher) {
        return null;
      }
      const res = await oracleKeeperFetcher.fetchIncentivesRewards();
      return res;
    }).data ?? null
  );
}
