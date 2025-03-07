import useSWR from "swr";

import { getContract } from "config/contracts";
import { contractFetcher } from "lib/contracts";
import { PLACEHOLDER_ACCOUNT } from "lib/legacy";
import useWallet from "lib/wallets/useWallet";

export function useGovTokenAmount(chainId: number) {
  let govTokenAddress;

  try {
    govTokenAddress = getContract(chainId, "GovToken");
  } catch (e) {
    govTokenAddress = null;
  }

  const { account } = useWallet();

  const { data: govTokenAmount, isLoading } = useSWR(
    govTokenAddress && [
      `GovTokenAmount:${chainId}`,
      chainId,
      govTokenAddress,
      "balanceOf",
      account ?? PLACEHOLDER_ACCOUNT,
    ],
    {
      fetcher: contractFetcher(undefined, "GovToken"),
    }
  );

  return !isLoading && !govTokenAmount ? 0n : govTokenAmount;
}
