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

export function usePrivy() {
  return {
    logout: () => undefined,
  };
}

