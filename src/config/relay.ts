import { getIsGelatoRelayerForced, readPersistedUiFlags } from "domain/synthetics/uiFlags/useUiFlagsRequest";

import { getIsFlagEnabled } from "./ab";
import { ARBITRUM, ContractsChainId } from "./chains";

export type RelayProvider = "gelato" | "gmx";

// `ab` splits the chain between both relays by the `gmxRelay` flag; a provider name pins every
// user on that chain to it.
export type RelayRollout = RelayProvider | "ab";

const ENV_RELAY_PROVIDER = import.meta.env.VITE_APP_RELAY_PROVIDER as RelayProvider | undefined;

// Per-chain rollout of GMX Relay, so both widening the split and rolling back are config changes
// rather than a deploy of reverted code. Arbitrum is first; `gmxRelay` sits at 0, so nobody moves
// by default and a tester opts in with `?gmxRelay=1`.
const RELAY_ROLLOUT: Partial<Record<ContractsChainId, RelayRollout>> = {
  [ARBITRUM]: "ab",
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
