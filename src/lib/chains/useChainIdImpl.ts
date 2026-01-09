import { watchAccount } from "@wagmi/core";
import { useEffect, useRef, useState } from "react";
import { useAccount } from "wagmi";

import {
  type ContractsChainId,
  type SettlementChainId,
  type SourceChainId,
  ARBITRUM,
  ARBITRUM_SEPOLIA,
  isContractsChain,
} from "config/chains";
import { isDevelopment } from "config/env";
import { SELECTED_NETWORK_LOCAL_STORAGE_KEY } from "config/localStorage";
import { isSettlementChain, isSourceChain } from "config/multichain";
import { areChainsRelated } from "domain/multichain/areChainsRelated";
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
  /**
   * Guaranteed to be related to the settlement chain in `chainId`
   */
  srcChainId?: SourceChainId;
} {
  let { chainId: connectedChainId } = useAccount();

  const [displayedChainId, setDisplayedChainId] = useState(connectedChainId ?? INITIAL_CHAIN_ID);
  const rawChainIdFromLocalStorage = localStorage.getItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY);
  const chainIdFromLocalStorage = rawChainIdFromLocalStorage ? parseInt(rawChainIdFromLocalStorage) : undefined;

  const possibleSrcChainId = connectedChainId ?? chainIdFromLocalStorage;
  let srcChainId: SourceChainId | undefined = undefined;
  if (
    possibleSrcChainId &&
    isSourceChain(possibleSrcChainId) &&
    !isSettlementChain(possibleSrcChainId) &&
    areChainsRelated(settlementChainId, possibleSrcChainId)
  ) {
    srcChainId = possibleSrcChainId;
  }

  const isCurrentChainSupported = connectedChainId && isContractsChain(connectedChainId, IS_DEVELOPMENT);
  const isCurrentChainSource = connectedChainId && isSourceChain(connectedChainId);

  const isLocalStorageChainSupported =
    chainIdFromLocalStorage && isContractsChain(chainIdFromLocalStorage, IS_DEVELOPMENT);
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
      if (isContractsChain(rawChainId, IS_DEVELOPMENT) || isSourceChain(rawChainId)) {
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
          !isContractsChain(account.chainId, IS_DEVELOPMENT) &&
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

  useEffect(() => {
    if (connectedChainId) {
      return;
    }

    const switchNetworkHandler = (switchNetworkInfo: CustomEvent<{ chainId: number }>) => {
      const newChainId = switchNetworkInfo.detail.chainId;
      if (isContractsChain(newChainId, IS_DEVELOPMENT) || isSourceChain(newChainId)) {
        setDisplayedChainId(newChainId);
      }
    };
    document.addEventListener("networkChange", switchNetworkHandler);
    return () => {
      document.removeEventListener("networkChange", switchNetworkHandler);
    };
  }, [connectedChainId]);

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
      chainId: connectedChainId,
      isConnectedToChainId: displayedChainId === connectedChainId,
      srcChainId,
    };
  }

  if (isCurrentChainSource) {
    return {
      chainId: settlementChainId,
      isConnectedToChainId: true,
      srcChainId,
    };
  }

  return { chainId: INITIAL_CHAIN_ID, isConnectedToChainId: false, srcChainId };
}
