import { watchAccount } from "@wagmi/core";
import { useEffect, useRef, useState } from "react";
import { useAccount } from "wagmi";

import {
  type ContractsChainId,
  type SettlementChainId,
  type SourceChainId,
  ARBITRUM,
  ARBITRUM_SEPOLIA,
  isSupportedChain,
} from "config/chains";
import { isDevelopment } from "config/env";
import { SELECTED_NETWORK_LOCAL_STORAGE_KEY } from "config/localStorage";
import { isContractsChain, isSettlementChain, isSourceChain } from "config/multichain";
import { getRainbowKitConfig } from "lib/wallets/rainbowKitConfig";

const IS_DEVELOPMENT = isDevelopment();

let INITIAL_CHAIN_ID: ContractsChainId;
if (IS_DEVELOPMENT) {
  INITIAL_CHAIN_ID = ARBITRUM_SEPOLIA;
} else {
  INITIAL_CHAIN_ID = ARBITRUM;
}

/**
 * This returns default chainId if chainId is not supported or not found
 */
export function useChainIdImpl(settlementChainId: SettlementChainId): {
  chainId: ContractsChainId;
  isConnectedToChainId?: boolean;
  srcChainId?: SourceChainId;
} {
  let { chainId: connectedChainId } = useAccount();

  const [displayedChainId, setDisplayedChainId] = useState(connectedChainId ?? INITIAL_CHAIN_ID);
  const rawChainIdFromLocalStorage = localStorage.getItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY);
  const chainIdFromLocalStorage = rawChainIdFromLocalStorage ? parseInt(rawChainIdFromLocalStorage) : undefined;

  const possibleSrcChainId = connectedChainId ?? chainIdFromLocalStorage;
  let srcChainId: SourceChainId | undefined = undefined;
  if (possibleSrcChainId && isSourceChain(possibleSrcChainId) && !isSettlementChain(possibleSrcChainId)) {
    srcChainId = possibleSrcChainId;
  }

  const isCurrentChainSupported = connectedChainId && isSupportedChain(connectedChainId, IS_DEVELOPMENT);
  const isCurrentChainSource = connectedChainId && isSourceChain(connectedChainId);

  const isLocalStorageChainSupported =
    chainIdFromLocalStorage && isSupportedChain(chainIdFromLocalStorage, IS_DEVELOPMENT);
  const isLocalStorageChainSource = chainIdFromLocalStorage && isSourceChain(chainIdFromLocalStorage);

  const mustChangeChainId = !connectedChainId || (!isCurrentChainSource && !isCurrentChainSupported);

  const connectedRef = useRef(false);
  useEffect(() => {
    if (chainIdFromLocalStorage || connectedRef.current) {
      return;
    }

    connectedRef.current = true;

    const connectHandler = (connectInfo: { chainId: string }) => {
      const rawChainId = parseInt(connectInfo.chainId);
      if (isContractsChain(rawChainId) || isSourceChain(rawChainId)) {
        setDisplayedChainId(rawChainId);
        localStorage.setItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY, rawChainId.toString());
      }
    };

    window.ethereum?.on("connect", connectHandler);
    return () => {
      window.ethereum?.removeListener("connect", connectHandler);
    };
  }, [chainIdFromLocalStorage]);

  useEffect(() => {
    if (isCurrentChainSupported) {
      setDisplayedChainId(connectedChainId);
      return;
    }

    if (isCurrentChainSource) {
      setDisplayedChainId(settlementChainId);
      return;
    }

    if (isLocalStorageChainSupported) {
      setDisplayedChainId(chainIdFromLocalStorage);
      return;
    }

    if (isLocalStorageChainSource) {
      setDisplayedChainId(settlementChainId);
      return;
    }

    setDisplayedChainId(INITIAL_CHAIN_ID);
  }, [
    chainIdFromLocalStorage,
    isCurrentChainSource,
    isCurrentChainSupported,
    isLocalStorageChainSource,
    isLocalStorageChainSupported,
    settlementChainId,
    connectedChainId,
  ]);

  useEffect(() => {
    if (!mustChangeChainId) {
      return;
    }
    if (isLocalStorageChainSupported) {
      setDisplayedChainId(chainIdFromLocalStorage);
      return;
    }

    if (isLocalStorageChainSource) {
      setDisplayedChainId(settlementChainId);
      return;
    }

    setDisplayedChainId(INITIAL_CHAIN_ID);
    localStorage.removeItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY);
  }, [
    chainIdFromLocalStorage,
    settlementChainId,
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
          !isSupportedChain(account.chainId, IS_DEVELOPMENT) &&
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
    if (isLocalStorageChainSupported) {
      return { chainId: chainIdFromLocalStorage as SettlementChainId, srcChainId };
    }

    if (isLocalStorageChainSource) {
      return { chainId: settlementChainId, srcChainId };
    }

    return { chainId: INITIAL_CHAIN_ID, srcChainId };
  }

  if (isCurrentChainSupported) {
    return {
      chainId: connectedChainId as ContractsChainId,
      isConnectedToChainId: displayedChainId === connectedChainId,
      srcChainId,
    };
  }

  if (isCurrentChainSource) {
    return {
      chainId: settlementChainId as SettlementChainId,
      isConnectedToChainId: true,
      srcChainId,
    };
  }

  return { chainId: INITIAL_CHAIN_ID, isConnectedToChainId: false, srcChainId };
}
