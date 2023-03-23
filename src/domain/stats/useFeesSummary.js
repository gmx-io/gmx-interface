import useSWR from "swr";
import { ARBITRUM, AVALANCHE, AVALANCHE_FUJI } from "config/chains";
import { getServerUrl } from "config/backend";
import { arrayURLFetcher } from "lib/fetcher";
const ACTIVE_CHAIN_IDS = [ARBITRUM, AVALANCHE, AVALANCHE_FUJI];

export function useFeesSummary() {
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
