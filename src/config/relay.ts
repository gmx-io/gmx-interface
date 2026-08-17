import { getIsGelatoFallbackForced, readPersistedUiFlags } from "domain/synthetics/uiFlags/useUiFlagsRequest";

import { getIsFlagEnabled } from "./ab";
import { ARBITRUM, AVALANCHE, ContractsChainId, MEGAETH } from "./chains";

export type RelayProvider = "gelato" | "gmx";

export type RelayRollout = RelayProvider | "ab";

const ENV_RELAY_PROVIDER = import.meta.env.VITE_APP_RELAY_PROVIDER as RelayProvider | undefined;

const RELAY_ROLLOUT: Partial<Record<ContractsChainId, RelayRollout>> = {
  [ARBITRUM]: "ab",
  [AVALANCHE]: "ab",
  [MEGAETH]: "ab",
};

export function resolveRelayProvider(rollout: RelayRollout | undefined, isAbEnabled: boolean): RelayProvider {
  if (rollout === "ab") {
    return isAbEnabled ? "gmx" : "gelato";
  }

  return rollout ?? "gelato";
}

export function getRelayProvider(chainId: ContractsChainId): RelayProvider {
  if (getIsGelatoFallbackForced(readPersistedUiFlags(chainId))) {
    return "gelato";
  }

  return ENV_RELAY_PROVIDER ?? resolveRelayProvider(RELAY_ROLLOUT[chainId], getIsFlagEnabled("gmxRelay"));
}
