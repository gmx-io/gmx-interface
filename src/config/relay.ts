import { ARBITRUM, AVALANCHE, ContractsChainId, MEGAETH } from "./chains";

// the express relay: gmx-api in front of the GMX keeper. Gelato, the previous provider, shut down
// on 2026-09-01; chains absent from this set have no express relay at all
const RELAY_CHAINS: ReadonlySet<ContractsChainId> = new Set([ARBITRUM, AVALANCHE, MEGAETH]);

export function getIsRelaySupported(chainId: ContractsChainId): boolean {
  return RELAY_CHAINS.has(chainId);
}
