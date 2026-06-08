import { useCallback, useMemo, useState, type ReactNode } from "react";

import { ConnectModalController } from "./ConnectModalController";
import { ConnectModalContext } from "./useConnectModal";

export function ConnectModalProvider({ children }: { children: ReactNode }) {
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [connectRequestId, setConnectRequestId] = useState(0);
  const [isConnectModalLoading, setIsConnectModalLoading] = useState(false);

  const openConnectModal = useCallback(() => {
    setIsConnectModalLoading(true);
    setConnectRequestId((currentRequestId) => currentRequestId + 1);
  }, []);

  const value = useMemo(
    () => ({ openConnectModal, connectModalOpen, isConnectModalLoading }),
    [openConnectModal, connectModalOpen, isConnectModalLoading]
  );

  return (
    <ConnectModalContext.Provider value={value}>
      {children}
      <ConnectModalController
        requestId={connectRequestId}
        setConnectModalOpen={setConnectModalOpen}
        setIsConnectModalLoading={setIsConnectModalLoading}
      />
    </ConnectModalContext.Provider>
  );
}
