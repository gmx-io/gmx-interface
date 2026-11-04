import useSWR from "swr";

import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";
import type { ContractsChainId } from "sdk/configs/chains";

import { fetchGasPaymentTokensOnchainState, type GasPaymentTokensOnchainState } from "./gasPaymentTokenAvailability";

export function useGasPaymentTokensOnchainState(chainId: ContractsChainId): GasPaymentTokensOnchainState | undefined {
  const { data } = useSWR([chainId, "gasPaymentTokensOnchainState"], {
    fetcher: () => fetchGasPaymentTokensOnchainState(chainId),
    refreshInterval: CONFIG_UPDATE_INTERVAL,
  });

  return data;
}
