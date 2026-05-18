import { useConnectOrCreateWallet } from "@privy-io/react-auth";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

type ConnectModalContextValue = {
  openConnectModal: (() => void) | undefined;
  connectModalOpen: boolean;
};

const ConnectModalContext = createContext<ConnectModalContextValue>({
  openConnectModal: undefined,
  connectModalOpen: false,
});

export function ConnectModalProvider({ children }: { children: React.ReactNode }) {
  const [connectModalOpen, setConnectModalOpen] = useState(false);

  const { connectOrCreateWallet } = useConnectOrCreateWallet({
    onSuccess: () => setConnectModalOpen(false),
    onError: () => setConnectModalOpen(false),
  });

  const openConnectModal = useCallback(() => {
    setConnectModalOpen(true);
    connectOrCreateWallet();
  }, [connectOrCreateWallet]);

  const value = useMemo(() => ({ openConnectModal, connectModalOpen }), [openConnectModal, connectModalOpen]);

  return <ConnectModalContext.Provider value={value}>{children}</ConnectModalContext.Provider>;
}

/**
 * Drop-in replacement for RainbowKit's useConnectModal.
 * Returns { openConnectModal, connectModalOpen } with the same interface.
 */
export function useConnectModal() {
  return useContext(ConnectModalContext);
}
