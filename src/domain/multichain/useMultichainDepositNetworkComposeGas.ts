import useSWR from "swr";
import { useAccount, usePublicClient } from "wagmi";

import { type SourceChainId } from "config/chains";
import { tryGetContract } from "config/contracts";
import { CHAIN_ID_PREFERRED_DEPOSIT_TOKEN, getStargatePoolAddress } from "config/multichain";
import { useGmxAccountDepositViewChain } from "context/GmxAccountContext/hooks";
import { useChainId } from "lib/chains";

import { MultichainAction } from "./codecs/CodecUiHelper";
import { estimateMultichainDepositNetworkComposeGas } from "./estimateMultichainDepositNetworkComposeGas";

const MULTICHAIN_DEPOSIT_NETWORK_COMPOSE_GAS_REFRESH_INTERVAL = 5000;

export function useMultichainDepositNetworkComposeGas(opts?: {
  enabled?: boolean;
  action?: MultichainAction;
  tokenAddress?: string;
}): {
  composeGas: bigint | undefined;
  isLoading: boolean;
} {
  const { chainId } = useChainId();
  const [depositViewChain] = useGmxAccountDepositViewChain();

  const tokenAddress: string | undefined = opts?.tokenAddress ?? CHAIN_ID_PREFERRED_DEPOSIT_TOKEN[chainId];

  const { address: account } = useAccount();
  const settlementChainPublicClient = usePublicClient({ chainId });

  const composeGasQueryCondition =
    settlementChainPublicClient &&
    account &&
    depositViewChain &&
    tokenAddress !== undefined &&
    getStargatePoolAddress(chainId, tokenAddress) !== undefined &&
    tryGetContract(chainId, "LayerZeroProvider") !== undefined &&
    depositViewChain !== (chainId as SourceChainId) &&
    opts?.enabled !== false;

  const composeGasQuery = useSWR<bigint | undefined>(
    composeGasQueryCondition ? ["composeGas", account, chainId, depositViewChain, tokenAddress] : null,
    {
      fetcher: async () => {
        if (!composeGasQueryCondition) {
          return undefined;
        }

        return estimateMultichainDepositNetworkComposeGas({
          action: opts?.action,
          chainId,
          account,
          srcChainId: depositViewChain,
          tokenAddress,
          settlementChainPublicClient,
        });
      },
      refreshInterval: MULTICHAIN_DEPOSIT_NETWORK_COMPOSE_GAS_REFRESH_INTERVAL,
    }
  );
  const composeGas = composeGasQuery.data;

  return {
    composeGas,
    isLoading: composeGasQuery.isLoading,
  };
}
