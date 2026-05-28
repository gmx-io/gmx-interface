import type { ReactNode } from "react";

const mockEthereumWallet = {
  address: "0x0000000000000000000000000000000000000001",
  chainId: "eip155:42161",
  connectorType: "injected",
  getEthereumProvider: () => Promise.resolve({}),
  linked: true,
  meta: {
    id: "mock.wallet",
    name: "Mock Wallet",
  },
  type: "ethereum",
  walletClientType: "mock_wallet",
};

export function PrivyProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useConnectWallet({ onSuccess }: { onSuccess?: (params?: unknown) => void; onError?: () => void } = {}) {
  return {
    connectWallet: () => {
      onSuccess?.({ wallet: mockEthereumWallet } as never);
    },
  };
}

export function useConnectOrCreateWallet({
  onSuccess,
}: { onSuccess?: (params?: unknown) => void; onError?: () => void } = {}) {
  return {
    connectOrCreateWallet: () => {
      onSuccess?.({ wallet: mockEthereumWallet } as never);
    },
  };
}

export function useCreateWallet({ onSuccess }: { onSuccess?: (params?: unknown) => void; onError?: () => void } = {}) {
  return {
    createWallet: () => {
      onSuccess?.({ wallet: mockEthereumWallet } as never);
      return Promise.resolve(mockEthereumWallet);
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
