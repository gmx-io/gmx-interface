import useSWR from "swr";
import { useAccount } from "wagmi";

import { getContract } from "config/contracts";
import { contractFetcher } from "lib/contracts";
import { PLACEHOLDER_ACCOUNT } from "lib/legacy";
import type { UiContractsChain } from "sdk/configs/chains";

export function useGovTokenDelegates(chainId: UiContractsChain) {
  let govTokenAddress;

  try {
    govTokenAddress = getContract(chainId, "GovToken");
  } catch (e) {
    govTokenAddress = null;
  }

  const { address: account } = useAccount();

  const { data: govTokenDelegate } = useSWR(
    govTokenAddress && [
      `GovTokenDelegates:${chainId}`,
      chainId,
      govTokenAddress,
      "delegates",
      account ?? PLACEHOLDER_ACCOUNT,
    ],
    {
      fetcher: contractFetcher(undefined, "GovToken"),
    }
  );

  return govTokenDelegate;
}
