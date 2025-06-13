import useSWR from "swr";

import { getContract } from "config/contracts";
import { contractFetcher } from "lib/contracts";
import type { UiContractsChain } from "sdk/configs/chains";

export function useGmxStaked(chainId: UiContractsChain) {
  const stakedGmxTrackerAddress = getContract(chainId, "StakedGmxTracker");
  const { data: stakedGmxSupply } = useSWR<bigint>(
    [`StakeV2:stakedGmxSupply:${chainId}`, chainId, getContract(chainId, "GMX"), "balanceOf", stakedGmxTrackerAddress],
    {
      fetcher: contractFetcher<bigint>(undefined, "Token"),
    }
  );

  return stakedGmxSupply;
}
