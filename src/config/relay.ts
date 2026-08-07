import { getIsFlagEnabled } from "./ab";
import { ContractsChainId } from "./chains";

export type RelayProvider = "gelato" | "gmx";

// `ab` splits the chain between both relays by the `gmxRelay` flag; a provider name pins every
// user on that chain to it.
export type RelayRollout = RelayProvider | "ab";

const ENV_RELAY_PROVIDER = import.meta.env.VITE_APP_RELAY_PROVIDER as RelayProvider | undefined;

// Per-chain rollout of GMX Relay. Gelato stays the default until a chain is cut over, so both
// widening the split and rolling back are config changes rather than a deploy of reverted code.
const RELAY_ROLLOUT: Partial<Record<ContractsChainId, RelayRollout>> = {};

export function resolveRelayProvider(rollout: RelayRollout | undefined, isAbEnabled: boolean): RelayProvider {
  if (rollout === "ab") {
    return isAbEnabled ? "gmx" : "gelato";
  }

  return rollout ?? "gelato";
}

export function getRelayProvider(chainId: ContractsChainId): RelayProvider {
  return ENV_RELAY_PROVIDER ?? resolveRelayProvider(RELAY_ROLLOUT[chainId], getIsFlagEnabled("gmxRelay"));
}
