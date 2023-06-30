import { switchNetwork as switchNetworkWagmi } from "@wagmi/core";
import { SELECTED_NETWORK_LOCAL_STORAGE_KEY } from "config/localStorage";

export type NetworkMetadata = {
  chainId: string;
  chainName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls: string[];
};

export async function switchNetwork(chainId, active) {
  if (active) {
    await switchNetworkWagmi({ chainId });
  } else {
    // chainId in localStorage allows to switch network even if wallet is not connected
    // or there is no wallet at all
    localStorage.setItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY, String(chainId));
    document.location.reload();
    return;
  }
}
