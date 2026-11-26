import useSWR from "swr";

import type { AnyChainId } from "config/chains";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";
import { getPublicClientWithRpc } from "lib/wallets/walletConfig";

const STARGATE_STATUS_ABI = [
  { type: "function", name: "status", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
] as const;

const STARGATE_PAUSED_STATUS = 3;

// A pool-wide pause reverts only sendToken and the receive: the quotes still answer, so they can't show it on either end
export function useIsStargatePoolPaused({
  chainId,
  stargateAddress,
}: {
  chainId: AnyChainId | undefined;
  stargateAddress: string | undefined;
}): { isPaused: boolean; isLoading: boolean } {
  const { data, isLoading } = useSWR<boolean>(
    chainId !== undefined && stargateAddress !== undefined ? ["stargatePoolStatus", chainId, stargateAddress] : null,
    {
      fetcher: async () => {
        const status = await getPublicClientWithRpc(chainId!).readContract({
          address: stargateAddress!,
          abi: STARGATE_STATUS_ABI,
          functionName: "status",
        });

        return status === STARGATE_PAUSED_STATUS;
      },
      refreshInterval: CONFIG_UPDATE_INTERVAL,
    }
  );

  return { isPaused: data === true, isLoading };
}
