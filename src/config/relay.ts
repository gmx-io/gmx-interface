import { ContractsChainId } from "./chains";

export type RelayProvider = "gelato" | "gmx";

const ENV_RELAY_PROVIDER = import.meta.env.VITE_APP_RELAY_PROVIDER as RelayProvider | undefined;

// Per-chain rollout of GMX Relay. Gelato stays the default until a chain is cut over, so a
// rollback is a config change rather than a deploy of reverted code.
const RELAY_PROVIDERS: Partial<Record<ContractsChainId, RelayProvider>> = {};

export function getRelayProvider(chainId: ContractsChainId): RelayProvider {
  return ENV_RELAY_PROVIDER ?? RELAY_PROVIDERS[chainId] ?? "gelato";
}
