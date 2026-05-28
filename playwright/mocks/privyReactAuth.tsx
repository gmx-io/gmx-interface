import type { ReactNode } from "react";

const mockWallet = {
  address: "0x0000000000000000000000000000000000000001",
  chainId: "eip155:42161",
  connectorType: "embedded",
  connectedAt: Date.now(),
  disconnect: () => undefined,
  getEthereumProvider: () => Promise.resolve({}),
  imported: false,
  isConnected: () => Promise.resolve(true),
  linked: true,
  loginOrLink: () => Promise.resolve(),
  meta: {
    id: "io.privy.wallet",
    name: "Privy",
  },
  sign: () => Promise.resolve("0x"),
  switchChain: () => Promise.resolve(),
  type: "ethereum",
  unlink: () => Promise.resolve(),
  walletClientType: "privy",
  walletIndex: 0,
};

const mockUser = {
  id: "did:privy:playwright-user",
  linkedAccounts: [
    {
      address: mockWallet.address,
      chainType: "ethereum",
      connectorType: mockWallet.connectorType,
      type: "wallet",
      walletClientType: mockWallet.walletClientType,
    },
  ],
};

let currentUser: typeof mockUser | null = null;
let currentWallets: (typeof mockWallet)[] = [];

export function __resetPrivyMock() {
  currentUser = null;
  currentWallets = [];
}

function authenticateMockUser() {
  const wasAlreadyAuthenticated = Boolean(currentUser);
  currentUser = mockUser;
  currentWallets = [mockWallet];
  return wasAlreadyAuthenticated;
}

export function PrivyProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useConnectWallet({
  onSuccess,
}: {
  onSuccess?: (params: { wallet: typeof mockWallet }) => void;
  onError?: () => void;
} = {}) {
  return {
    connectWallet: () => {
      authenticateMockUser();
      onSuccess?.({ wallet: mockWallet });
    },
  };
}

export function useConnectOrCreateWallet({
  onSuccess,
}: {
  onSuccess?: (params: { wallet: typeof mockWallet }) => void;
  onError?: () => void;
} = {}) {
  return {
    connectOrCreateWallet: () => {
      authenticateMockUser();
      onSuccess?.({ wallet: mockWallet });
    },
  };
}

export function useCreateWallet({
  onSuccess,
}: {
  onSuccess?: (params: { wallet: typeof mockWallet }) => void;
  onError?: () => void;
} = {}) {
  return {
    createWallet: () => {
      currentWallets = [mockWallet];
      onSuccess?.({ wallet: mockWallet });
      return Promise.resolve(mockWallet);
    },
  };
}

export function useLogin({
  onComplete,
}: {
  onComplete?: (params: {
    user: typeof mockUser;
    isNewUser: boolean;
    wasAlreadyAuthenticated: boolean;
    loginMethod: "email" | null;
    loginAccount: null;
  }) => void;
  onError?: () => void;
} = {}) {
  return {
    login: () => {
      const wasAlreadyAuthenticated = authenticateMockUser();
      onComplete?.({
        user: mockUser,
        isNewUser: false,
        wasAlreadyAuthenticated,
        loginMethod: wasAlreadyAuthenticated ? null : "email",
        loginAccount: null,
      });
    },
  };
}

export function usePrivy() {
  return {
    authenticated: Boolean(currentUser),
    ready: true,
    user: currentUser,
    logout: () => {
      __resetPrivyMock();
      return Promise.resolve();
    },
  };
}

export function useWallets() {
  return {
    wallets: currentWallets,
    ready: true,
  };
}
