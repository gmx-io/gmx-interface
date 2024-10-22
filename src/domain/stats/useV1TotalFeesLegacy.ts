/* 
  This is a legacy way to retrieve V1 total fees data. 
  Should be replaced with useV1FeesInfo after resolving sorce data discrepancy issue.
*/
import { getServerUrl } from "config/backend";
import { ARBITRUM, AVALANCHE } from "config/chains";
import { arrayURLFetcher } from "lib/fetcher";
import useSWR from "swr";

const ACTIVE_CHAIN_IDS = [ARBITRUM, AVALANCHE];

export function useV1TotalFeesLegacy(): {
  data: Partial<{
    [chainId: string]: {
      lastUpdatedAt: number;
      totalFees: number;
    };
  }>;
} {
  const { data: feesSummary } = useSWR(
    ACTIVE_CHAIN_IDS.map((chainId) => getServerUrl(chainId, "/fees_summary")),
    {
      fetcher: arrayURLFetcher,
    }
  );

  const feesSummaryByChain = {};
  for (let i = 0; i < ACTIVE_CHAIN_IDS.length; i++) {
    if (feesSummary && feesSummary.length === ACTIVE_CHAIN_IDS.length) {
      feesSummaryByChain[ACTIVE_CHAIN_IDS[i]] = feesSummary[i];
    } else {
      feesSummaryByChain[ACTIVE_CHAIN_IDS[i]] = {};
    }
  }

  return { data: feesSummaryByChain };
}
