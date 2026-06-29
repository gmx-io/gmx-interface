import { watchAccount } from "@wagmi/core";
import { useEffect, useReducer, useRef } from "react";
import { useAccount } from "wagmi";

import {
  type ContractsChainId,
  type SettlementChainId,
  type SourceChainId,
  DEFAULT_SETTLEMENT_CHAIN_ID,
  isContractsChain,
} from "config/chains";
import { isDevelopment } from "config/env";
import {
  SELECTED_NETWORK_LOCAL_STORAGE_KEY,
  SELECTED_NETWORK_WAS_APP_SELECTED_LOCAL_STORAGE_KEY,
} from "config/localStorage";
import { isSettlementChain, isSourceChain } from "config/multichain";
import { areChainsRelated } from "domain/multichain/areChainsRelated";
import { getWagmiConfig } from "lib/wallets/walletConfig";

const IS_DEVELOPMENT = isDevelopment();

const INITIAL_CHAIN_ID: ContractsChainId = DEFAULT_SETTLEMENT_CHAIN_ID;

export function getSelectedSourceChainId({
  chainIdFromLocalStorage,
  selectedNetworkWasAppSelected,
  settlementChainId,
}: {
  chainIdFromLocalStorage: number | undefined;
  selectedNetworkWasAppSelected: boolean;
  settlementChainId: SettlementChainId;
}): SourceChainId | undefined {
  if (!selectedNetworkWasAppSelected) {
    return undefined;
  }

  if (
    chainIdFromLocalStorage &&
    isSourceChain(chainIdFromLocalStorage, settlementChainId) &&
    !isSettlementChain(chainIdFromLocalStorage) &&
    areChainsRelated(settlementChainId, chainIdFromLocalStorage)
  ) {
    return chainIdFromLocalStorage;
  }

  return undefined;
}

export function canWalletChainUpdateSelectedNetwork(chainId: number) {
  return isContractsChain(chainId, IS_DEVELOPMENT) || isSettlementChain(chainId);
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
  const { chainId: connectedChainId, isConnected } = useAccount();
  const [, rerenderOnNetworkChange] = useReducer((value: number) => value + 1, 0);

  const rawChainIdFromLocalStorage = localStorage.getItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY);
  const chainIdFromLocalStorage = rawChainIdFromLocalStorage ? parseInt(rawChainIdFromLocalStorage) : undefined;
  const selectedNetworkWasAppSelected =
    localStorage.getItem(SELECTED_NETWORK_WAS_APP_SELECTED_LOCAL_STORAGE_KEY) === "true";

  const srcChainId = getSelectedSourceChainId({
    chainIdFromLocalStorage,
    selectedNetworkWasAppSelected,
    settlementChainId,
  });

  const isCurrentChainSupported = connectedChainId && isContractsChain(connectedChainId, IS_DEVELOPMENT);
  const isCurrentChainSource = connectedChainId && srcChainId === connectedChainId;

  const isLocalStorageChainSupported =
    chainIdFromLocalStorage && isContractsChain(chainIdFromLocalStorage, IS_DEVELOPMENT);
  const isLocalStorageChainSource = chainIdFromLocalStorage && srcChainId === chainIdFromLocalStorage;

  const mustChangeChainId = !connectedChainId || (!isCurrentChainSource && !isCurrentChainSupported);

  useEffect(() => {
    const networkChangeHandler = () => {
      rerenderOnNetworkChange();
    };

    document.addEventListener("networkChange", networkChangeHandler);
    return () => {
      document.removeEventListener("networkChange", networkChangeHandler);
    };
  }, []);

  const connectedRef = useRef(false);
  useEffect(() => {
    if (chainIdFromLocalStorage || connectedRef.current) {
      return;
    }

    connectedRef.current = true;

    const connectHandler = (connectInfo: { chainId: string }) => {
      const rawChainId = parseInt(connectInfo.chainId);
      if (canWalletChainUpdateSelectedNetwork(rawChainId)) {
        localStorage.setItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY, rawChainId.toString());
        localStorage.removeItem(SELECTED_NETWORK_WAS_APP_SELECTED_LOCAL_STORAGE_KEY);
      }
    };

    window.ethereum?.on("connect", connectHandler);
    return () => {
      window.ethereum?.removeListener("connect", connectHandler);
    };
  }, [chainIdFromLocalStorage, settlementChainId]);

  useEffect(() => {
    if (!mustChangeChainId) {
      return;
    }
    if (isLocalStorageChainSupported) {
      return;
    }

    if (isLocalStorageChainSource) {
      return;
    }

    localStorage.removeItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY);
    localStorage.removeItem(SELECTED_NETWORK_WAS_APP_SELECTED_LOCAL_STORAGE_KEY);
  }, [
    chainIdFromLocalStorage,
    settlementChainId,
    isLocalStorageChainSource,
    isLocalStorageChainSupported,
    mustChangeChainId,
  ]);

  useEffect(() => {
    const unsubscribe = watchAccount(getWagmiConfig(), {
      onChange: (account) => {
        if (!account.chainId) {
          return;
        }
        if (!canWalletChainUpdateSelectedNetwork(account.chainId)) {
          return;
        }

        localStorage.setItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY, account.chainId.toString());
        localStorage.removeItem(SELECTED_NETWORK_WAS_APP_SELECTED_LOCAL_STORAGE_KEY);
      },
    });

    return unsubscribe;
  }, [settlementChainId]);

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
      isConnectedToChainId: isConnected,
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
