import { useAccount } from "wagmi";

import { DEFAULT_CHAIN_ID, SUPPORTED_CHAIN_IDS } from "config/chains";
import { SELECTED_NETWORK_LOCAL_STORAGE_KEY } from "config/localStorage";

/**
 * This returns default chainId if chainId is not supported or not found
 */
export function useChainId() {
  let { chainId } = useAccount();

  if (!chainId) {
    const chainIdFromLocalStorage = localStorage.getItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY);
    if (chainIdFromLocalStorage) {
      chainId = parseInt(chainIdFromLocalStorage);
      if (!chainId) {
        // localstorage value is invalid
        localStorage.removeItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY);
      }
    }
  }

  if (!chainId || !SUPPORTED_CHAIN_IDS.includes(chainId)) {
    chainId = DEFAULT_CHAIN_ID;
  }

  return { chainId };
}
