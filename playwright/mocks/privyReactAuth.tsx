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
