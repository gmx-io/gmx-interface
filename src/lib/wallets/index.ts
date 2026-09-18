import { disconnect, getAccount, switchChain } from "@wagmi/core";

import { isSolanaNetwork } from "config/chains";
import {
  CURRENT_PROVIDER_LOCALSTORAGE_KEY,
  SELECTED_NETWORK_LOCAL_STORAGE_KEY,
  SELECTED_NETWORK_WAS_APP_SELECTED_LOCAL_STORAGE_KEY,
  SHOULD_EAGER_CONNECT_LOCALSTORAGE_KEY,
} from "config/localStorage";
import { extendError } from "lib/errors";
import { SMART_WALLET_CHAIN_UNAVAILABLE_ERROR } from "lib/errors/customErrors";
import { UncheckedJsonRpcSigner } from "lib/rpc/UncheckedJsonRpcSigner";

import { disconnectPrivyWalletsFromWagmi } from "./privyWagmi";
import { getWillChainSwitchChangeAccount } from "./useWalletSessionChains";
import { getWagmiConfig } from "./walletConfig";

export type WalletSigner = UncheckedJsonRpcSigner & {
  address: string;
};

function selectNetworkInApp(chainId: number) {
  localStorage.setItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY, String(chainId));
  localStorage.setItem(SELECTED_NETWORK_WAS_APP_SELECTED_LOCAL_STORAGE_KEY, "true");
  document.dispatchEvent(new CustomEvent("networkChange", { detail: { chainId } }));
}

export async function switchNetwork(
  chainId: number,
  active: boolean,
  options: { fallbackToAppSelectionOnError?: boolean } = {}
): Promise<void> {
  if (isSolanaNetwork(chainId)) {
    localStorage.removeItem(SHOULD_EAGER_CONNECT_LOCALSTORAGE_KEY);
    localStorage.removeItem(CURRENT_PROVIDER_LOCALSTORAGE_KEY);
    await disconnectPrivyWalletsFromWagmi([]);
    await disconnect(getWagmiConfig()).catch(() => undefined);

    // TODO(solana-wallet): connect a Solana wallet after disconnecting the EVM wallet.
    selectNetworkInApp(chainId);
    document.location.reload();
    return;
  }

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
