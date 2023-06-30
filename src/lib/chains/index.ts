import { useNetwork } from "wagmi";
import { SELECTED_NETWORK_LOCAL_STORAGE_KEY } from "config/localStorage";
import { DEFAULT_CHAIN_ID, SUPPORTED_CHAIN_IDS } from "config/chains";

export function useChainId() {
  const { chain } = useNetwork();
  let chainId = chain?.id;

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
