import { watchAccount } from "@wagmi/core";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";

import { DEFAULT_CHAIN_ID, isSupportedChain } from "config/chains";
import { SELECTED_NETWORK_LOCAL_STORAGE_KEY } from "config/localStorage";
import { isSettlementChain, isSourceChain } from "context/GmxAccountContext/config";
import { useGmxAccountSettlementChainId } from "context/GmxAccountContext/hooks";
import { getRainbowKitConfig } from "lib/wallets/rainbowKitConfig";
import type { UiContractsChain, UiSettlementChain, UiSourceChain } from "sdk/configs/chains";

/**
 * This returns default chainId if chainId is not supported or not found
 */
export function useChainId(): {
  chainId: UiContractsChain;
  isConnectedToChainId?: boolean;
  srcChainId?: UiSourceChain;
} {
  let { chainId: unsanitizedChainId } = useAccount();
  const srcChainId =
    unsanitizedChainId && isSourceChain(unsanitizedChainId) && !isSettlementChain(unsanitizedChainId)
      ? unsanitizedChainId
      : undefined;

  const [gmxAccountSettlementChainId] = useGmxAccountSettlementChainId();

  const [displayedChainId, setDisplayedChainId] = useState(unsanitizedChainId ?? DEFAULT_CHAIN_ID);

  const chainIdFromLocalStorage = parseInt(localStorage.getItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY) || "");

  const currentChainIdIsSupported = unsanitizedChainId && isSupportedChain(unsanitizedChainId);
  const currentChainIdIsSettlement = unsanitizedChainId && isSettlementChain(unsanitizedChainId);
  const currentChainIdIsSource = unsanitizedChainId && isSourceChain(unsanitizedChainId);

  const localStorageChainIdIsSupported = chainIdFromLocalStorage && isSupportedChain(chainIdFromLocalStorage);
  const localStorageChainIdIsSettlement = chainIdFromLocalStorage && isSettlementChain(chainIdFromLocalStorage);
  const localStorageChainIdIsSource = chainIdFromLocalStorage && isSourceChain(chainIdFromLocalStorage);

  const mustChangeChainId =
    !unsanitizedChainId || (!currentChainIdIsSource && !currentChainIdIsSettlement && !currentChainIdIsSupported);

  useEffect(() => {
    if (currentChainIdIsSettlement || currentChainIdIsSupported) {
      setDisplayedChainId(unsanitizedChainId);
      return;
    }

    if (currentChainIdIsSource) {
      setDisplayedChainId(gmxAccountSettlementChainId);
      return;
    }

    if (localStorageChainIdIsSettlement || localStorageChainIdIsSupported) {
      setDisplayedChainId(chainIdFromLocalStorage);
      return;
    }

    if (localStorageChainIdIsSource) {
      setDisplayedChainId(gmxAccountSettlementChainId);
      return;
    }

    setDisplayedChainId(DEFAULT_CHAIN_ID);
  }, [
    unsanitizedChainId,
    chainIdFromLocalStorage,
    currentChainIdIsSettlement,
    localStorageChainIdIsSettlement,
    currentChainIdIsSource,
    localStorageChainIdIsSource,
    gmxAccountSettlementChainId,
    currentChainIdIsSupported,
    localStorageChainIdIsSupported,
  ]);

  useEffect(() => {
    if (!mustChangeChainId) {
      return;
    }
    if (localStorageChainIdIsSettlement || localStorageChainIdIsSupported) {
      setDisplayedChainId(chainIdFromLocalStorage);
      return;
    }

    if (localStorageChainIdIsSource) {
      setDisplayedChainId(gmxAccountSettlementChainId);
      return;
    }

    setDisplayedChainId(DEFAULT_CHAIN_ID);
    localStorage.removeItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY);
  }, [
    chainIdFromLocalStorage,
    gmxAccountSettlementChainId,
    localStorageChainIdIsSettlement,
    localStorageChainIdIsSource,
    localStorageChainIdIsSupported,
    mustChangeChainId,
  ]);

  useEffect(() => {
    const unsubscribe = watchAccount(getRainbowKitConfig(), {
      onChange: (account) => {
        if (!account.chainId) {
          return;
        }
        if (
          !isSourceChain(account.chainId) &&
          !isSupportedChain(account.chainId) &&
          !isSettlementChain(account.chainId)
        ) {
          return;
        }

        setDisplayedChainId(account.chainId);
        localStorage.setItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY, account.chainId.toString());
      },
    });

    return unsubscribe;
  }, []);

  if (mustChangeChainId) {
    if (localStorageChainIdIsSettlement || localStorageChainIdIsSupported) {
      return { chainId: chainIdFromLocalStorage as UiSettlementChain, srcChainId };
    }

    if (localStorageChainIdIsSource) {
      return { chainId: gmxAccountSettlementChainId, srcChainId };
    }

    return { chainId: DEFAULT_CHAIN_ID, srcChainId };
  }

  if (currentChainIdIsSettlement || currentChainIdIsSupported) {
    return {
      chainId: displayedChainId as UiContractsChain,
      isConnectedToChainId: displayedChainId === unsanitizedChainId,
      srcChainId,
    };
  }

  if (currentChainIdIsSource) {
    return { chainId: gmxAccountSettlementChainId as UiSettlementChain, isConnectedToChainId: true, srcChainId };
  }

  return { chainId: DEFAULT_CHAIN_ID, isConnectedToChainId: false, srcChainId };
}
