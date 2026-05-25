import { useConnectOrCreateWallet, usePrivy } from "@privy-io/react-auth";
import { useEffect, useRef } from "react";

import { metrics } from "lib/metrics";

import { useConnectModalController } from "./useConnectModal";

export function PrivyConnectModalBridge() {
  const handledRequestId = useRef(0);
  const { ready } = usePrivy();
  const {
    connectRequestId,
    onConnectModalError,
    onConnectModalSuccess,
    setConnectModalOpen,
    setConnectRequestPending,
  } = useConnectModalController();

  const { connectOrCreateWallet } = useConnectOrCreateWallet({
    onSuccess: onConnectModalSuccess,
    onError: onConnectModalError,
  });

  useEffect(
    function openPrivyConnectModal() {
      if (connectRequestId === 0 || connectRequestId === handledRequestId.current) {
        return;
      }

      if (!ready) {
        return;
      }

      handledRequestId.current = connectRequestId;
      setConnectRequestPending(false);
      setConnectModalOpen(true);

      try {
        connectOrCreateWallet();
      } catch (error) {
        onConnectModalError();
        metrics.pushError(error, "connectModal.connectOrCreateWallet");
      }
    },
    [connectOrCreateWallet, connectRequestId, onConnectModalError, ready, setConnectModalOpen, setConnectRequestPending]
  );

  return null;
}
