import useSWR from "swr";

import type { ContractsChainId } from "sdk/configs/chains";

import { fetchGasPaymentTokensOnchainState, type GasPaymentTokensOnchainState } from "./gasPaymentTokenAvailability";

export function useGasPaymentTokensOnchainState(chainId: ContractsChainId): GasPaymentTokensOnchainState | undefined {
  const { data } = useSWR([chainId, "gasPaymentTokensOnchainState"], {
    fetcher: () => fetchGasPaymentTokensOnchainState(chainId),
    refreshInterval: 60_000,
  });

  return data;
}
