import { watchAccount } from "@wagmi/core";
import { useState, useEffect } from "react";
import { useAccount } from "wagmi";

import {
  type SettlementChainId,
  type ContractsChainId,
  type SourceChainId,
  DEFAULT_CHAIN_ID,
  isSupportedChain,
} from "config/chains";
import { SELECTED_NETWORK_LOCAL_STORAGE_KEY } from "config/localStorage";
import { isSourceChain, isSettlementChain } from "config/multichain";
import { getRainbowKitConfig } from "lib/wallets/rainbowKitConfig";

/**
 * This returns default chainId if chainId is not supported or not found
 */
export function useChainIdImpl(settlementChainId: SettlementChainId): {
  chainId: ContractsChainId;
  isConnectedToChainId?: boolean;
  srcChainId?: SourceChainId;
} {
  let { chainId: unsanitizedChainId } = useAccount();
  const srcChainId =
    unsanitizedChainId && isSourceChain(unsanitizedChainId) && !isSettlementChain(unsanitizedChainId)
      ? unsanitizedChainId
      : undefined;

  const [displayedChainId, setDisplayedChainId] = useState(unsanitizedChainId ?? DEFAULT_CHAIN_ID);

  const chainIdFromLocalStorage = parseInt(localStorage.getItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY) || "");

  const isCurrentChainSupported = unsanitizedChainId && isSupportedChain(unsanitizedChainId);
  const isCurrentChainSettlement = unsanitizedChainId && isSettlementChain(unsanitizedChainId);
  const isCurrentChainSource = unsanitizedChainId && isSourceChain(unsanitizedChainId);

  const isLocalStorageChainSupported = chainIdFromLocalStorage && isSupportedChain(chainIdFromLocalStorage);
  const isLocalStorageChainSettlement = chainIdFromLocalStorage && isSettlementChain(chainIdFromLocalStorage);
  const isLocalStorageChainSource = chainIdFromLocalStorage && isSourceChain(chainIdFromLocalStorage);

  const mustChangeChainId =
    !unsanitizedChainId || (!isCurrentChainSource && !isCurrentChainSettlement && !isCurrentChainSupported);

  useEffect(() => {
    if (isCurrentChainSettlement || isCurrentChainSupported) {
      setDisplayedChainId(unsanitizedChainId);
      return;
    }

    if (isCurrentChainSource) {
      setDisplayedChainId(settlementChainId);
      return;
    }

    if (isLocalStorageChainSettlement || isLocalStorageChainSupported) {
      setDisplayedChainId(chainIdFromLocalStorage);
      return;
    }

    if (isLocalStorageChainSource) {
      setDisplayedChainId(settlementChainId);
      return;
    }

    setDisplayedChainId(DEFAULT_CHAIN_ID);
  }, [
    unsanitizedChainId,
    chainIdFromLocalStorage,
    isCurrentChainSettlement,
    isLocalStorageChainSettlement,
    isCurrentChainSource,
    isLocalStorageChainSource,
    settlementChainId,
    isCurrentChainSupported,
    isLocalStorageChainSupported,
  ]);

  useEffect(() => {
    if (!mustChangeChainId) {
      return;
    }
    if (isLocalStorageChainSettlement || isLocalStorageChainSupported) {
      setDisplayedChainId(chainIdFromLocalStorage);
      return;
    }

    if (isLocalStorageChainSource) {
      setDisplayedChainId(settlementChainId);
      return;
    }

    setDisplayedChainId(DEFAULT_CHAIN_ID);
    localStorage.removeItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY);
  }, [
    chainIdFromLocalStorage,
    settlementChainId,
    isLocalStorageChainSettlement,
    isLocalStorageChainSource,
    isLocalStorageChainSupported,
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
    if (isLocalStorageChainSettlement || isLocalStorageChainSupported) {
      return { chainId: chainIdFromLocalStorage as SettlementChainId, srcChainId };
    }

    if (isLocalStorageChainSource) {
      return { chainId: settlementChainId, srcChainId };
    }

    return { chainId: DEFAULT_CHAIN_ID, srcChainId };
  }

  if (isCurrentChainSettlement || isCurrentChainSupported) {
    return {
      chainId: unsanitizedChainId as ContractsChainId,
      isConnectedToChainId: displayedChainId === unsanitizedChainId,
      srcChainId,
    };
  }

  if (isCurrentChainSource) {
    return { chainId: settlementChainId as SettlementChainId, isConnectedToChainId: true, srcChainId };
  }

  return { chainId: DEFAULT_CHAIN_ID, isConnectedToChainId: false, srcChainId };
}
