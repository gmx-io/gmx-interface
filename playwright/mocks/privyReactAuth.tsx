import type { ReactNode } from "react";

export function PrivyProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useConnectWallet({ onSuccess }: { onSuccess?: () => void; onError?: () => void } = {}) {
  return {
    connectWallet: () => {
      onSuccess?.();
    },
  };
}

export function useConnectOrCreateWallet({ onSuccess }: { onSuccess?: () => void; onError?: () => void } = {}) {
  return {
    connectOrCreateWallet: () => {
      onSuccess?.();
    },
  };
}

export function useCreateWallet({ onSuccess }: { onSuccess?: () => void; onError?: () => void } = {}) {
  return {
    createWallet: () => {
      onSuccess?.();
      return Promise.resolve(undefined);
    },
  };
}

export function useLogin({ onComplete }: { onComplete?: () => void; onError?: () => void } = {}) {
  return {
    login: () => {
      onComplete?.();
    },
  };
}

export function usePrivy() {
  return {
    user: null,
    logout: () => undefined,
  };
}

export function useWallets() {
  return {
    wallets: [],
    ready: true,
  };
}
