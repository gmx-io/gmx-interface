import useSWR from "swr";

import { getContract } from "config/contracts";
import { contractFetcher } from "lib/contracts";
import { PLACEHOLDER_ACCOUNT } from "lib/legacy";
import useWallet from "lib/wallets/useWallet";

export function useGovTokenDelegates(chainId: number) {
  let govTokenAddress;

  try {
    govTokenAddress = getContract(chainId, "GovToken");
  } catch (e) {
    govTokenAddress = null;
  }

  const { account } = useWallet();

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
