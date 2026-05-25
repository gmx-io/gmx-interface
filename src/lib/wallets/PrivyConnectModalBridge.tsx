import { useConnectOrCreateWallet } from "@privy-io/react-auth";
import { useEffect, useRef } from "react";

import { usePrivyWalletState } from "./privyWalletState";
import { useConnectModalController } from "./useConnectModal";

export function PrivyConnectModalBridge() {
  const handledRequestId = useRef(0);
  const { ready } = usePrivyWalletState();
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
      connectOrCreateWallet();
    },
    [connectOrCreateWallet, connectRequestId, ready, setConnectModalOpen, setConnectRequestPending]
  );

  return null;
}
