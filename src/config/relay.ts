import { getIsGelatoRelayerForced, readPersistedUiFlags } from "domain/synthetics/uiFlags/useUiFlagsRequest";

import { getIsFlagEnabled } from "./ab";
import { ARBITRUM, AVALANCHE, ContractsChainId, MEGAETH } from "./chains";

export type RelayProvider = "gelato" | "gmx";

// `ab` splits the chain between both relays by the `gmxRelay` flag; a provider name pins every
// user on that chain to it.
export type RelayRollout = RelayProvider | "ab";

const ENV_RELAY_PROVIDER = import.meta.env.VITE_APP_RELAY_PROVIDER as RelayProvider | undefined;

// Per-chain rollout of GMX Relay. `ab` splits by the `gmxRelay` flag; rolling a chain back is a
// config change here, and `forceGelatoRelayer` ends an incident without a deploy at all.
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
  // the point of the switch is to end an incident in seconds, so it outranks every other input,
  // including a chain pinned to `gmx` and the build-time override used for debugging
  if (getIsGelatoRelayerForced(readPersistedUiFlags(chainId))) {
    return "gelato";
  }

  return ENV_RELAY_PROVIDER ?? resolveRelayProvider(RELAY_ROLLOUT[chainId], getIsFlagEnabled("gmxRelay"));
}
