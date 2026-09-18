import { SOLANA } from "./chainIds";
import { type AnyChainId, getChainName } from "./chains";

export { SOLANA };

export type SolanaNetworkId = typeof SOLANA;
export type AppNetworkId = AnyChainId | SolanaNetworkId;

export function isSolanaNetwork(id: number | undefined): id is SolanaNetworkId {
  return id === SOLANA;
}

export function getAppNetworkName(id: number): string {
  if (isSolanaNetwork(id)) {
    return "Solana";
  }

  return getChainName(id);
}
