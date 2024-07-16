import { switchChain } from "@wagmi/core";
import { SELECTED_NETWORK_LOCAL_STORAGE_KEY } from "config/localStorage";
import { rainbowKitConfig } from "./rainbowKitConfig";

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

export async function switchNetwork(chainId: number, active: boolean): Promise<void> {
  if (active) {
    await switchChain(rainbowKitConfig, {
      chainId,
    });
    localStorage.setItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY, String(chainId));
  } else {
    // chainId in localStorage allows to switch network even if wallet is not connected
    // or there is no wallet at all
    localStorage.setItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY, String(chainId));
    document.location.reload();
    return;
  }
}

export function shortenAddressOrEns(address: string, length: number) {
  if (!length) {
    return "";
  }
  if (!address) {
    return address;
  }
  if (address.length < 10 || address.length < length) {
    return address;
  }
  let left = address.includes(".") ? address.split(".")[1].length : Math.floor((length - 3) / 2) + 1;
  return address.substring(0, left) + "..." + address.substring(address.length - (length - (left + 3)), address.length);
}
