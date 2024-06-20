import { watchAccount } from "@wagmi/core";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";

import { DEFAULT_CHAIN_ID, isSupportedChain } from "config/chains";
import { SELECTED_NETWORK_LOCAL_STORAGE_KEY } from "config/localStorage";
import { rainbowKitConfig } from "lib/wallets/rainbowKitConfig";

/**
 * This returns default chainId if chainId is not supported or not found
 */
export function useChainId() {
  let { chainId: unsanitizedChainId } = useAccount();

  const [displayedChainId, setDisplayedChainId] = useState(unsanitizedChainId ?? DEFAULT_CHAIN_ID);

  const chainIdFromLocalStorage = parseInt(localStorage.getItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY) || "");

  const currentChainIdIsSupported = unsanitizedChainId && isSupportedChain(unsanitizedChainId);
  const localStorageChainIdIsSupported = chainIdFromLocalStorage && isSupportedChain(chainIdFromLocalStorage);

  const mustChangeChainId = !currentChainIdIsSupported || !unsanitizedChainId;

  useEffect(() => {
    if (currentChainIdIsSupported) {
      setDisplayedChainId(unsanitizedChainId);
      return;
    }
    if (localStorageChainIdIsSupported) {
      setDisplayedChainId(chainIdFromLocalStorage);
      return;
    }

    setDisplayedChainId(DEFAULT_CHAIN_ID);
  }, [unsanitizedChainId, chainIdFromLocalStorage, currentChainIdIsSupported, localStorageChainIdIsSupported]);

  useEffect(() => {
    if (mustChangeChainId) {
      if (localStorageChainIdIsSupported) {
        setDisplayedChainId(chainIdFromLocalStorage);
      } else {
        setDisplayedChainId(DEFAULT_CHAIN_ID);
        localStorage.removeItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY);
      }
    }
  }, [chainIdFromLocalStorage, localStorageChainIdIsSupported, mustChangeChainId]);

  useEffect(() => {
    const unsubscribe = watchAccount(rainbowKitConfig, {
      onChange: (account) => {
        if (!account.chainId) return;
        if (!isSupportedChain(account.chainId)) return;

        setDisplayedChainId(account.chainId);
        localStorage.setItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY, account.chainId.toString());
      },
    });

    return () => {
      unsubscribe();
    };
  }, []);

  if (mustChangeChainId) {
    if (localStorageChainIdIsSupported) {
      return { chainId: chainIdFromLocalStorage };
    }

    return { chainId: DEFAULT_CHAIN_ID };
  }

  return { chainId: displayedChainId, isConnectedToChainId: displayedChainId === unsanitizedChainId };
}
