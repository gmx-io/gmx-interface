import { getAccount, switchChain } from "@wagmi/core";

import { SOLANA_NETWORK_ID } from "config/chains";
import {
  SELECTED_NETWORK_LOCAL_STORAGE_KEY,
  SELECTED_NETWORK_WAS_APP_SELECTED_LOCAL_STORAGE_KEY,
  SELECTED_SOLANA_NETWORK_LOCAL_STORAGE_KEY,
} from "config/localStorage";
import { getIsSolanaNetworkSelected } from "lib/chains/solana";
import { extendError } from "lib/errors";
import { SMART_WALLET_CHAIN_UNAVAILABLE_ERROR } from "lib/errors/customErrors";
import { UncheckedJsonRpcSigner } from "lib/rpc/UncheckedJsonRpcSigner";

import { getWillChainSwitchChangeAccount } from "./useWalletSessionChains";
import { getWagmiConfig } from "./walletConfig";

export type WalletSigner = UncheckedJsonRpcSigner & {
  address: string;
};

function selectNetworkInApp(chainId: number) {
  localStorage.setItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY, String(chainId));
  localStorage.setItem(SELECTED_NETWORK_WAS_APP_SELECTED_LOCAL_STORAGE_KEY, "true");
  localStorage.removeItem(SELECTED_SOLANA_NETWORK_LOCAL_STORAGE_KEY);
  document.dispatchEvent(new CustomEvent("networkChange", { detail: { chainId } }));
}

export function selectSolanaNetworkInApp() {
  localStorage.setItem(SELECTED_SOLANA_NETWORK_LOCAL_STORAGE_KEY, "true");
  document.dispatchEvent(new CustomEvent("networkChange", { detail: { chainId: SOLANA_NETWORK_ID } }));
}

export async function switchNetwork(
  chainId: number,
  active: boolean,
  options: { fallbackToAppSelectionOnError?: boolean } = {}
): Promise<void> {
  // Leaving Solana reloads the page, since Solana is fixed for the page lifetime
  const wasSolanaNetwork = getIsSolanaNetworkSelected();

  if (active) {
    const config = getWagmiConfig();
    const address = getAccount(config).address;

    const willChainSwitchChangeAccount = address
      ? await getWillChainSwitchChangeAccount(address, chainId).catch(() => false)
      : false;

    if (willChainSwitchChangeAccount) {
      throw extendError(new Error(SMART_WALLET_CHAIN_UNAVAILABLE_ERROR), { data: { chainId, address } });
    }

    try {
      await switchChain(config, {
        chainId,
      });
    } catch (error) {
      if (!options.fallbackToAppSelectionOnError) {
        throw error;
      }
    }

    selectNetworkInApp(chainId);
    if (wasSolanaNetwork) {
      document.location.reload();
    }
  } else {
    // chainId in localStorage allows to switch network even if wallet is not connected
    // or there is no wallet at all
    selectNetworkInApp(chainId);
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
