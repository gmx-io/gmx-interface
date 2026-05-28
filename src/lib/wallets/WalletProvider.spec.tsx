import type { ConnectedWallet } from "@privy-io/react-auth";
import { render, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ACTIVE_PRIVY_WALLET_LOCAL_STORAGE_KEY } from "config/localStorage";

const mocks = vi.hoisted(() => ({
  account: {
    address: undefined as string | undefined,
    connector: undefined as { id: string } | undefined,
    isConnected: false,
  },
  wallets: [] as ConnectedWallet[],
}));

vi.mock("@privy-io/react-auth", () => ({
  PrivyProvider: ({ children }: { children: ReactNode }) => children,
  useWallets: () => ({
    wallets: mocks.wallets,
  }),
}));

vi.mock("@privy-io/wagmi", () => ({
  WagmiProvider: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("wagmi", () => ({
  useAccount: () => mocks.account,
}));

vi.mock("context/ThemeContext/ThemeContext", () => ({
  useTheme: () => ({
    theme: "dark",
  }),
}));

vi.mock("img/logo-icon.svg", () => ({
  default: "logo.svg",
}));

vi.mock("./walletConfig", () => ({
  getWagmiConfig: () => ({}),
  getSupportedChains: () => [{ id: 42161 }],
  PRIVY_APP_ID: "privy-app-id",
  PRIVY_LOGIN_METHODS: ["wallet"],
  PRIVY_SIGNATURE_REQUEST_TIMEOUTS: {},
  PRIVY_WALLET_LIST: ["rabby_wallet"],
}));

import WalletProvider from "./WalletProvider";

function createConnectedWallet(
  wallet: Pick<ConnectedWallet, "address" | "connectorType" | "walletClientType"> & { metaId: string }
) {
  const { metaId, ...walletFields } = wallet;

  return {
    ...walletFields,
    type: "ethereum",
    linked: true,
    meta: {
      id: metaId,
      name: "Rabby",
    },
  } as ConnectedWallet;
}

describe("WalletProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.account = {
      address: undefined,
      connector: undefined,
      isConnected: false,
    };
    mocks.wallets = [];
  });

  it("persists the current Wagmi wallet so reload keeps the user-selected Rabby account", async () => {
    mocks.account = {
      address: "0x2222222222222222222222222222222222222222",
      connector: { id: "io.rabby" },
      isConnected: true,
    };
    mocks.wallets = [
      createConnectedWallet({
        address: "0x1111111111111111111111111111111111111111",
        connectorType: "injected",
        metaId: "io.metamask",
        walletClientType: "metamask",
      }),
      createConnectedWallet({
        address: "0x2222222222222222222222222222222222222222",
        connectorType: "injected",
        metaId: "io.rabby",
        walletClientType: "rabby_wallet",
      }),
    ];

    render(<WalletProvider>content</WalletProvider>);

    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem(ACTIVE_PRIVY_WALLET_LOCAL_STORAGE_KEY) ?? "{}")).toEqual({
        address: "0x2222222222222222222222222222222222222222",
        connectorType: "injected",
        walletClientType: "rabby_wallet",
      });
    });
  });
});
