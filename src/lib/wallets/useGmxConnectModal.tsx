import { useConnectWallet } from "@privy-io/react-auth";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

type GmxConnectModalContextValue = {
  openConnectModal: (() => void) | undefined;
  connectModalOpen: boolean;
};

const GmxConnectModalContext = createContext<GmxConnectModalContextValue>({
  openConnectModal: undefined,
  connectModalOpen: false,
});

export function GmxConnectModalProvider({ children }: { children: React.ReactNode }) {
  const [connectModalOpen, setConnectModalOpen] = useState(false);

  const { connectWallet } = useConnectWallet({
    onSuccess: () => setConnectModalOpen(false),
    onError: () => setConnectModalOpen(false),
  });

  const openConnectModal = useCallback(() => {
    setConnectModalOpen(true);
    connectWallet();
  }, [connectWallet]);

  const value = useMemo(() => ({ openConnectModal, connectModalOpen }), [openConnectModal, connectModalOpen]);

  return <GmxConnectModalContext.Provider value={value}>{children}</GmxConnectModalContext.Provider>;
}

/**
 * Drop-in replacement for RainbowKit's useConnectModal.
 * Returns { openConnectModal, connectModalOpen } with the same interface.
 */
export function useGmxConnectModal() {
  return useContext(GmxConnectModalContext);
}
