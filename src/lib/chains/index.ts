import { watchAccount } from "@wagmi/core";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";

import { DEFAULT_CHAIN_ID, SUPPORTED_CHAIN_IDS } from "config/chains";
import { SELECTED_NETWORK_LOCAL_STORAGE_KEY } from "config/localStorage";
import { rainbowKitConfig } from "lib/wallets/rainbowKitConfig";

/**
 * This returns default chainId if chainId is not supported or not found
 */
export function useChainId() {
  let { chainId } = useAccount();

  const [fakeChainId, setFakeChainId] = useState(chainId ?? DEFAULT_CHAIN_ID);

  const chainIdFromLocalStorage = parseInt(localStorage.getItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY) || "");

  const currentChainIdIsSupported = chainId && SUPPORTED_CHAIN_IDS.includes(chainId);
  const localStorageChainIdIsSupported =
    chainIdFromLocalStorage && SUPPORTED_CHAIN_IDS.includes(chainIdFromLocalStorage);

  const mustChangeChainId = !currentChainIdIsSupported || !chainId;

  useEffect(() => {
    if (currentChainIdIsSupported) {
      setFakeChainId(chainId);
      return;
    }
    if (localStorageChainIdIsSupported) {
      setFakeChainId(chainIdFromLocalStorage);
      return;
    }

    setFakeChainId(DEFAULT_CHAIN_ID);
  }, [chainId, chainIdFromLocalStorage, currentChainIdIsSupported, localStorageChainIdIsSupported]);

  useEffect(() => {
    if (mustChangeChainId) {
      if (localStorageChainIdIsSupported) {
        setFakeChainId(chainIdFromLocalStorage);
      } else {
        setFakeChainId(DEFAULT_CHAIN_ID);
        localStorage.removeItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY);
      }
    }
  }, [chainIdFromLocalStorage, localStorageChainIdIsSupported, mustChangeChainId]);

  useEffect(() => {
    const unsubscribe = watchAccount(rainbowKitConfig, {
      onChange: (account) => {
        if (!account.chainId) return;
        if (!SUPPORTED_CHAIN_IDS.includes(account.chainId)) return;

        setFakeChainId(account.chainId);
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

  return { chainId: fakeChainId };
}
