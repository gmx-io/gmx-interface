import { switchChain } from "@wagmi/core";
import { ethers } from "ethers";
import { useEnsName } from "wagmi";

import { getExplorerUrl, SOURCE_ETHEREUM_MAINNET } from "config/chains";
import { SELECTED_NETWORK_LOCAL_STORAGE_KEY } from "config/localStorage";
import { UncheckedJsonRpcSigner } from "lib/rpc/UncheckedJsonRpcSigner";

import { getRainbowKitConfig } from "./rainbowKitConfig";

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

export type WalletSigner = UncheckedJsonRpcSigner & {
  address: string;
};

export async function switchNetwork(chainId: number, active: boolean): Promise<void> {
  if (active) {
    await switchChain(getRainbowKitConfig(), {
      chainId,
    });
    localStorage.setItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY, String(chainId));
    document.dispatchEvent(new CustomEvent("networkChange", { detail: { chainId } }));
  } else {
    // chainId in localStorage allows to switch network even if wallet is not connected
    // or there is no wallet at all
    localStorage.setItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY, String(chainId));
    document.dispatchEvent(new CustomEvent("networkChange", { detail: { chainId } }));
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

export function shortenAddress(address: string, length: number, padStart = 1) {
  if (!length) {
    return "";
  }
  if (!address) {
    return address;
  }
  if (address.length < 10) {
    return address;
  }
  if (length >= address.length) {
    return address;
  }
  let left = Math.floor((length - 3) / 2) + (padStart || 0);
  return address.substring(0, left) + "..." + address.substring(address.length - (length - (left + 3)), address.length);
}

export function isHashZero(value: string | undefined) {
  return value === ethers.ZeroHash;
}

export function isAddressZero(value: string | undefined) {
  return value === ethers.ZeroAddress;
}

export function getAccountUrl(chainId: number, account: string) {
  if (!account) {
    return getExplorerUrl(chainId);
  }
  return getExplorerUrl(chainId) + "address/" + account;
}

export function useENS(address: string | undefined) {
  const { data } = useEnsName({
    address: address as `0x${string}` | undefined,
    chainId: SOURCE_ETHEREUM_MAINNET,
  });
  const ensName = data || undefined;

  return { ensName };
}
