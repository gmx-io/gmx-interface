import useSWR, { type SWRConfiguration } from "swr";

import { getContract } from "config/contracts";
import { contractFetcher } from "lib/contracts";
import { PLACEHOLDER_ACCOUNT } from "lib/legacy";
import type { SWRGCMiddlewareConfig } from "lib/swrMiddlewares";
import useWallet from "lib/wallets/useWallet";
import type { ContractsChainId } from "sdk/configs/chains";

export function useGovTokenAmount(
  chainId: ContractsChainId,
  { enabled = true, requestKey = "default" }: { enabled?: boolean; requestKey?: string } = {}
) {
  let govTokenAddress;

  try {
    govTokenAddress = getContract(chainId, "GovToken");
  } catch (e) {
    govTokenAddress = null;
  }

  const { account } = useWallet();
  const swrConfig: SWRConfiguration & SWRGCMiddlewareConfig = {
    fetcher: contractFetcher(undefined, "GovToken"),
    clearUnusedKeys: true,
  };

  const {
    data: govTokenAmount,
    error,
    isLoading,
  } = useSWR(
    enabled &&
      govTokenAddress && [
        `GovTokenAmount:${chainId}:${requestKey}`,
        chainId,
        govTokenAddress,
        "balanceOf",
        account ?? PLACEHOLDER_ACCOUNT,
      ],
    swrConfig
  );

  if (error) {
    return undefined;
  }

  return !isLoading && !govTokenAmount ? 0n : govTokenAmount;
}
