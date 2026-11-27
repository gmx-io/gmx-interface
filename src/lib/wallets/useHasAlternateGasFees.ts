import { isTestnetChain } from "sdk/configs/chains";

import { useWalletChainCapabilities } from "./useWalletChainCapabilities";

export function useHasAlternateGasFees({ chainId, enabled }: { chainId: number; enabled: boolean }): boolean {
  const capabilities = useWalletChainCapabilities({ chainId, enabled });

  return (
    capabilities?.hasAlternateGasFees === true || (!isTestnetChain(chainId) && capabilities?.atomicStatus === "ready")
  );
}
