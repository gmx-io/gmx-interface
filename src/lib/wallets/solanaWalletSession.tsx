import { Component, Suspense, createContext, lazy, useContext, useState, type ReactNode } from "react";

export type SolanaConnectedWallet = {
  address: string;
  walletId: string;
  disconnect: () => Promise<void>;
};

export type SolanaWalletList = {
  ready: boolean;
  wallets: SolanaConnectedWallet[];
};

export type SolanaWalletSession = {
  address: string | undefined;
  disconnect: (() => Promise<void>) | undefined;
  isRestoring: boolean;
};

export type SolanaWalletSessionContextValue = SolanaWalletSession & {
  rememberConnectedWallet: (walletId: string | undefined) => void;
};

const defaultSession: SolanaWalletSessionContextValue = {
  address: undefined,
  disconnect: undefined,
  isRestoring: false,
  rememberConnectedWallet: () => undefined,
};

// Until the session chunk reports, a remembered wallet must not render a clickable Connect wallet.
const restoringSession: SolanaWalletSessionContextValue = {
  ...defaultSession,
  isRestoring: true,
};

export const SolanaWalletSessionContext = createContext<SolanaWalletSessionContextValue>(defaultSession);

const SolanaWalletSessionState = lazy(() => import("lib/solana/SolanaWalletSessionState"));

class SolanaSessionErrorBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

export function SolanaWalletSessionProvider({
  enabled,
  rememberedWalletId,
  children,
}: {
  enabled: boolean;
  rememberedWalletId?: string;
  children: ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  const [session, setSession] = useState(rememberedWalletId ? restoringSession : defaultSession);

  if (!enabled) {
    return <SolanaWalletSessionContext.Provider value={defaultSession}>{children}</SolanaWalletSessionContext.Provider>;
  }

  return (
    <SolanaWalletSessionContext.Provider value={failed ? defaultSession : session}>
      {failed ? null : (
        <SolanaSessionErrorBoundary onError={() => setFailed(true)}>
          <Suspense fallback={null}>
            <SolanaWalletSessionState onChange={setSession} />
          </Suspense>
        </SolanaSessionErrorBoundary>
      )}
      {children}
    </SolanaWalletSessionContext.Provider>
  );
}

export function useSolanaWalletSession() {
  return useContext(SolanaWalletSessionContext);
}
