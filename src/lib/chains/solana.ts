import { type AbFlag, getIsSolanaNetworkEnabled } from "config/ab";
import { DEFAULT_SETTLEMENT_CHAIN_ID, SOLANA_NETWORK_ID, isSolanaNetwork } from "config/chains";
import {
  SELECTED_NETWORK_LOCAL_STORAGE_KEY,
  SELECTED_NETWORK_WAS_APP_SELECTED_LOCAL_STORAGE_KEY,
} from "config/localStorage";

/**
 * Solana is stored as SOLANA_NETWORK_ID in the selected network.
 * With the flag off a stored Solana selection is ignored, so the app falls back to an EVM chain.
 */
export function getIsSolanaNetworkSelected(): boolean {
  return getIsSolanaNetworkEnabled() && getIsSolanaNetworkStored();
}

function getIsSolanaNetworkStored(): boolean {
  const rawNetworkId = localStorage.getItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY);

  return rawNetworkId !== null && isSolanaNetwork(parseInt(rawNetworkId));
}

/** With the flag off, a stored Solana selection is replaced with Arbitrum so it does not come back later. */
export function fallBackFromDisabledSolanaNetwork(): void {
  if (getIsSolanaNetworkEnabled() || !getIsSolanaNetworkStored()) {
    return;
  }

  localStorage.setItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY, String(DEFAULT_SETTLEMENT_CHAIN_ID));
  localStorage.removeItem(SELECTED_NETWORK_WAS_APP_SELECTED_LOCAL_STORAGE_KEY);
}

/** Solana is fixed for the page lifetime, so toggling its flag while Solana is stored enters or leaves it with a reload. */
export function reloadOnSolanaFlagChange(flag: AbFlag): void {
  if (flag === "solanaNetwork" && getIsSolanaNetworkStored()) {
    document.location.reload();
  }
}

/** Switching between Solana and EVM reloads the page, so the selection is read once per page load. */
export function selectSolanaNetwork(): void {
  localStorage.setItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY, String(SOLANA_NETWORK_ID));
  localStorage.removeItem(SELECTED_NETWORK_WAS_APP_SELECTED_LOCAL_STORAGE_KEY);
  document.location.reload();
}
