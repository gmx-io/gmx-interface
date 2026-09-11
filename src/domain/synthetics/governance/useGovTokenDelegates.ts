import useSWR, { type SWRConfiguration } from "swr";

import { getContract } from "config/contracts";
import { contractFetcher } from "lib/contracts";
import { PLACEHOLDER_ACCOUNT } from "lib/legacy";
import type { SWRGCMiddlewareConfig } from "lib/swrMiddlewares";
import useWallet from "lib/wallets/useWallet";
import type { ContractsChainId } from "sdk/configs/chains";

export function useGovTokenDelegates(
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

  const { data: govTokenDelegate } = useSWR(
    enabled &&
      govTokenAddress && [
        `GovTokenDelegates:${chainId}:${requestKey}`,
        chainId,
        govTokenAddress,
        "delegates",
        account ?? PLACEHOLDER_ACCOUNT,
      ],
    swrConfig
  );

  return govTokenDelegate;
}
