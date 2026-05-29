import type { ReactNode } from "react";

const mockEthereumWallet = {
  type: "ethereum",
  address: "0x0000000000000000000000000000000000000001",
  chainId: "eip155:42161",
  walletClientType: "metamask",
  connectorType: "injected",
  imported: false,
  meta: {
    id: "io.metamask",
    name: "MetaMask",
  },
  isConnected: () => Promise.resolve(true),
  disconnect: () => undefined,
  switchChain: () => Promise.resolve(),
  getEthereumProvider: () => Promise.resolve({}),
  sign: () => Promise.resolve("0x"),
};

export function PrivyProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useConnectWallet({
  onSuccess,
}: {
  onSuccess?: (params: { wallet: typeof mockEthereumWallet }) => void;
  onError?: () => void;
} = {}) {
  return {
    connectWallet: () => {
      onSuccess?.({ wallet: mockEthereumWallet });
    },
  };
}

export function useConnectOrCreateWallet({
  onSuccess,
}: {
  onSuccess?: (params: { wallet: typeof mockEthereumWallet }) => void;
  onError?: () => void;
} = {}) {
  return {
    connectOrCreateWallet: () => {
      onSuccess?.({ wallet: mockEthereumWallet });
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

export function useModalStatus() {
  return {
    isOpen: false,
  };
}

export function useWallets() {
  return {
    wallets: [],
    ready: true,
  };
}
