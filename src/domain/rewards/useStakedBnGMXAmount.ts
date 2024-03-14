import useSWR from "swr";

import { contractFetcher } from "lib/contracts";
import { getContract } from "config/contracts";
import Token from "abis/Token.json";

export function useStakedBnGMXAmount(chainId: number) {
  const bnGmxAddress = getContract(chainId, "BN_GMX");
  const feeGmxTrackerAddress = getContract(chainId, "FeeGmxTracker");

  const { data: stakedBnGMXAmount } = useSWR(
    [`stakedBnGMXAmount:${chainId}`, chainId, bnGmxAddress, "balanceOf", feeGmxTrackerAddress],
    {
      fetcher: contractFetcher(undefined, Token),
    }
  );

  return stakedBnGMXAmount;
}
