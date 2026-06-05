import { useConnectOrCreateWallet, usePrivy } from "@privy-io/react-auth";
import { useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from "react";

import type { SettlementChainId } from "config/chains";
import {
  SELECTED_NETWORK_LOCAL_STORAGE_KEY,
  SELECTED_NETWORK_WAS_APP_SELECTED_LOCAL_STORAGE_KEY,
} from "config/localStorage";
import { isSourceChain } from "config/multichain";
import { useGmxAccountSettlementChainId } from "context/GmxAccountContext/hooks";
import { metrics } from "lib/metrics";
import { switchNetwork } from "lib/wallets";

export type ConnectModalControllerProps = {
  requestId: number;
  setConnectModalOpen: Dispatch<SetStateAction<boolean>>;
  setIsConnectModalLoading: Dispatch<SetStateAction<boolean>>;
};

function shouldKeepAppSelectedSourceChain(settlementChainId: SettlementChainId) {
  const rawChainIdFromLocalStorage = localStorage.getItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY);
  const chainIdFromLocalStorage = rawChainIdFromLocalStorage ? parseInt(rawChainIdFromLocalStorage) : undefined;
  const selectedNetworkWasAppSelected =
    localStorage.getItem(SELECTED_NETWORK_WAS_APP_SELECTED_LOCAL_STORAGE_KEY) === "true";

  return selectedNetworkWasAppSelected && isSourceChain(chainIdFromLocalStorage, settlementChainId);
}

export function ConnectModalController({
  requestId,
  setConnectModalOpen,
  setIsConnectModalLoading,
}: ConnectModalControllerProps) {
  const [settlementChainId] = useGmxAccountSettlementChainId();
  const { ready: isPrivyReady } = usePrivy();
  const handledRequestIdRef = useRef(0);
  const pendingRequestIdRef = useRef(0);

  const handleSuccess = useCallback(() => {
    setConnectModalOpen(false);
    setIsConnectModalLoading(false);

    if (shouldKeepAppSelectedSourceChain(settlementChainId)) {
      return;
    }

    void switchNetwork(settlementChainId, true).catch((error) => {
      metrics.pushError(error, "connectModal.switchNetwork");
    });
  }, [setConnectModalOpen, setIsConnectModalLoading, settlementChainId]);

  const handleError = useCallback(() => {
    setConnectModalOpen(false);
    setIsConnectModalLoading(false);
  }, [setConnectModalOpen, setIsConnectModalLoading]);

  const { connectOrCreateWallet } = useConnectOrCreateWallet({
    onSuccess: handleSuccess,
    onError: handleError,
  });

  const openPrivyConnectModal = useCallback(
    (nextRequestId: number) => {
      handledRequestIdRef.current = nextRequestId;
      pendingRequestIdRef.current = 0;
      setConnectModalOpen(true);
      setIsConnectModalLoading(false);

      try {
        connectOrCreateWallet();
      } catch (error) {
        setConnectModalOpen(false);
        setIsConnectModalLoading(false);
        throw error;
      }
    },
    [connectOrCreateWallet, setConnectModalOpen, setIsConnectModalLoading]
  );

  useEffect(() => {
    if (requestId <= handledRequestIdRef.current) {
      return;
    }

    if (!isPrivyReady) {
      pendingRequestIdRef.current = requestId;
      setConnectModalOpen(false);
      setIsConnectModalLoading(true);
      return;
    }

    openPrivyConnectModal(requestId);
  }, [isPrivyReady, openPrivyConnectModal, requestId, setConnectModalOpen, setIsConnectModalLoading]);

  useEffect(() => {
    if (!isPrivyReady) {
      return;
    }

    const pendingRequestId = pendingRequestIdRef.current;

    if (pendingRequestId > handledRequestIdRef.current) {
      openPrivyConnectModal(pendingRequestId);
    }
  }, [isPrivyReady, openPrivyConnectModal]);

  return null;
}
