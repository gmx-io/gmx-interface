import { SELECTED_NETWORK_LOCAL_STORAGE_KEY } from "config/localStorage";
import { DEFAULT_CHAIN_ID, SUPPORTED_CHAIN_IDS } from "config/chains";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useContext } from "react";
import { DynamicWalletContext } from "store/dynamicwalletprovider";

export function useDynamicChainId() {
  const { primaryWallet } = useDynamicContext();
  const walletContext = useContext(DynamicWalletContext);
  
  if (primaryWallet && primaryWallet.connected && walletContext.chainId) {
    return { chainId: walletContext.chainId };
  }

  let chainId;
  const chainIdFromLocalStorage = localStorage.getItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY);
  if (chainIdFromLocalStorage) {
    chainId = parseInt(chainIdFromLocalStorage);
    if (!chainId) {
      // localstorage value is invalid
      localStorage.removeItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY);
    }
  }

  if (!chainId || !SUPPORTED_CHAIN_IDS.includes(chainId)) {
    chainId = DEFAULT_CHAIN_ID;
  }
  return { chainId };
}

export function useChainId() {
  let { chainId } = useDynamicChainId();
  //console.log("web 3 chain id", chainId);

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
