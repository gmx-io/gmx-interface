import useSWR from "swr";
import { zeroAddress } from "viem";

import { getContract } from "config/contracts";
import { contractFetcher } from "lib/contracts";
import { PLACEHOLDER_ACCOUNT } from "lib/legacy";
import type { ContractsChainId } from "sdk/configs/chains";

export function useSbfGmxBalance(chainId: ContractsChainId, account: string | undefined) {
  const feeGmxTrackerAddress = getContract(chainId, "FeeGmxTracker");

  const { data } = useSWR<bigint>(
    feeGmxTrackerAddress !== zeroAddress
      ? [
          `EarnPortfolio:sbfGmxBalance:${account ?? PLACEHOLDER_ACCOUNT}`,
          chainId,
          feeGmxTrackerAddress,
          "balanceOf",
          account ?? PLACEHOLDER_ACCOUNT,
        ]
      : null,
    { fetcher: contractFetcher(undefined, "Token") as any }
  );

  return data;
}
