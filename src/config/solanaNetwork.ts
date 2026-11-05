import { getIsSolanaNetworkEnabled } from "./ab";
import { SELECTED_SOLANA_NETWORK_LOCAL_STORAGE_KEY } from "./localStorage";

// localStorage is shared between tabs, so it only seeds this tab once. Reading it on every call would let
// another tab's selection pause this tab's EVM clients while its UI is still on an EVM chain.
let isSolanaNetworkSelectedInTab: boolean | undefined;

// chainId stays the settlement chain while Solana is selected, so EVM clients have to read this themselves.
export function getIsSolanaNetworkSelected() {
  if (isSolanaNetworkSelectedInTab === undefined) {
    isSolanaNetworkSelectedInTab = localStorage.getItem(SELECTED_SOLANA_NETWORK_LOCAL_STORAGE_KEY) === "true";
  }

  return getIsSolanaNetworkEnabled() && isSolanaNetworkSelectedInTab;
}

export function setIsSolanaNetworkSelected(isSelected: boolean) {
  isSolanaNetworkSelectedInTab = isSelected;

  if (isSelected) {
    localStorage.setItem(SELECTED_SOLANA_NETWORK_LOCAL_STORAGE_KEY, "true");
  } else {
    localStorage.removeItem(SELECTED_SOLANA_NETWORK_LOCAL_STORAGE_KEY);
  }
}
