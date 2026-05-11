import { useLogin } from "@privy-io/react-auth";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

import { PRIVY_LOGIN_METHODS } from "./walletConfig";

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

  const { login } = useLogin({
    onComplete: () => setConnectModalOpen(false),
    onError: () => setConnectModalOpen(false),
  });

  const openConnectModal = useCallback(() => {
    setConnectModalOpen(true);
    login({ loginMethods: [...PRIVY_LOGIN_METHODS] });
  }, [login]);

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
