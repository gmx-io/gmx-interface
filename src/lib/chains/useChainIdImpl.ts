import { watchAccount } from "@wagmi/core";
import { useEffect, useRef } from "react";
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
import { getWagmiConfig } from "lib/wallets/walletConfig";

import { useWindowEthereumChainId } from "./useWindowEthereumChainId";

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
  const { chainId: connectedChainId } = useAccount();

  const rawChainIdFromLocalStorage = localStorage.getItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY);
  const chainIdFromLocalStorage = rawChainIdFromLocalStorage ? parseInt(rawChainIdFromLocalStorage) : undefined;
  const windowChainId = useWindowEthereumChainId();

  const possibleSrcChainId = connectedChainId ?? chainIdFromLocalStorage;
  let srcChainId: SourceChainId | undefined = undefined;
  if (
    possibleSrcChainId &&
    isSourceChain(possibleSrcChainId, settlementChainId) &&
    !isSettlementChain(possibleSrcChainId) &&
    areChainsRelated(settlementChainId, possibleSrcChainId)
  ) {
    srcChainId = possibleSrcChainId;
  }

  const isCurrentChainSupported = connectedChainId && isContractsChain(connectedChainId, IS_DEVELOPMENT);
  const isCurrentChainSource = connectedChainId && isSourceChain(connectedChainId, settlementChainId);

  const isLocalStorageChainSupported =
    chainIdFromLocalStorage && isContractsChain(chainIdFromLocalStorage, IS_DEVELOPMENT);
  const isLocalStorageChainSource =
    chainIdFromLocalStorage && isSourceChain(chainIdFromLocalStorage, settlementChainId);

  const mustChangeChainId = !connectedChainId || (!isCurrentChainSource && !isCurrentChainSupported);

  const connectedRef = useRef(false);
  useEffect(() => {
    if (chainIdFromLocalStorage || connectedRef.current) {
      return;
    }

    connectedRef.current = true;

    const connectHandler = (connectInfo: { chainId: string }) => {
      const rawChainId = parseInt(connectInfo.chainId);
      if (isContractsChain(rawChainId, IS_DEVELOPMENT) || isSourceChain(rawChainId, settlementChainId)) {
        localStorage.setItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY, rawChainId.toString());
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
        if (
          !isSourceChain(account.chainId, settlementChainId) &&
          !isContractsChain(account.chainId, IS_DEVELOPMENT) &&
          !isSettlementChain(account.chainId)
        ) {
          return;
        }

        localStorage.setItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY, account.chainId.toString());
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
      isConnectedToChainId: windowChainId !== undefined ? connectedChainId === windowChainId : true,
      srcChainId,
    };
  }

  if (isCurrentChainSource) {
    return {
      chainId: settlementChainId as SettlementChainId,
      isConnectedToChainId: windowChainId !== undefined ? connectedChainId === windowChainId : true,
      srcChainId,
    };
  }

  return { chainId: INITIAL_CHAIN_ID, isConnectedToChainId: false, srcChainId };
}
