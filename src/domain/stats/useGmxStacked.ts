import useSWR from "swr";
import { zeroAddress } from "viem";

import { getContract } from "config/contracts";
import { contractFetcher } from "lib/contracts";
import type { ContractsChainId } from "sdk/configs/chains";

export function useGmxStaked(chainId: ContractsChainId) {
  const stakedGmxTrackerAddress = getContract(chainId, "StakedGmxTracker");
  const gmxAddress = getContract(chainId, "GMX");

  const { data: stakedGmxSupply } = useSWR<bigint>(
    gmxAddress !== zeroAddress && [
      `StakeV2:stakedGmxSupply:${chainId}`,
      chainId,
      gmxAddress,
      "balanceOf",
      stakedGmxTrackerAddress,
    ],
    {
      fetcher: contractFetcher<bigint>(undefined, "Token"),
    }
  );

  return stakedGmxSupply;
}
