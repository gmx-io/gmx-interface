import { useChainId } from "lib/chains";
import { RawIncentivesStats, useOracleKeeperFetcher } from "../tokens";
import { useEffect, useState } from "react";

export default function useIncentiveStats() {
  const { chainId } = useChainId();
  const oracleKeeperFetcher = useOracleKeeperFetcher(chainId);
  const [incentiveStats, setIncentiveStats] = useState<RawIncentivesStats | null>(null);

  useEffect(() => {
    if (!oracleKeeperFetcher) {
      return;
    }
    async function load() {
      const res = await oracleKeeperFetcher.fetchIncentivesRewards();
      if (res) {
        setIncentiveStats(res);
      }
    }
    load();
  }, [oracleKeeperFetcher]);

  return incentiveStats;
}
