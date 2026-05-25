import { useConnectOrCreateWallet } from "@privy-io/react-auth";
import { useEffect, useRef } from "react";

import { usePrivyWalletState } from "./privyWalletState";
import { useConnectModalController } from "./useConnectModal";

export function PrivyConnectModalBridge() {
  const handledRequestId = useRef(0);
  const { ready } = usePrivyWalletState();
  const { connectRequestId, setConnectModalOpen, setConnectRequestPending } = useConnectModalController();

  const { connectOrCreateWallet } = useConnectOrCreateWallet({
    onSuccess: () => {
      setConnectModalOpen(false);
      setConnectRequestPending(false);
    },
    onError: () => {
      setConnectModalOpen(false);
      setConnectRequestPending(false);
    },
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
