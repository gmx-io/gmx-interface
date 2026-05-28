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
  setActiveWalletForWagmi: undefined as
    | ((params: { wallets: ConnectedWallet[]; user: unknown }) => ConnectedWallet | undefined)
    | undefined,
}));

vi.mock("@privy-io/react-auth", () => ({
  PrivyProvider: ({ children }: { children: ReactNode }) => children,
  useWallets: () => ({
    wallets: mocks.wallets,
  }),
}));

vi.mock("@privy-io/wagmi", () => ({
  WagmiProvider: ({
    children,
    setActiveWalletForWagmi,
  }: {
    children: ReactNode;
    setActiveWalletForWagmi: typeof mocks.setActiveWalletForWagmi;
  }) => {
    mocks.setActiveWalletForWagmi = setActiveWalletForWagmi;
    return children;
  },
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

import { getEthereumWalletStorageValue, writeActivePrivyWalletToStorage } from "./activeWalletStorage";
import WalletProvider, { getActiveWalletForWagmi } from "./WalletProvider";

function createConnectedWallet(
  wallet: Pick<ConnectedWallet, "address" | "connectorType" | "walletClientType"> & {
    linked?: boolean;
    metaId: string;
  }
) {
  const { linked = true, metaId, ...walletFields } = wallet;

  return {
    ...walletFields,
    type: "ethereum",
    linked,
    meta: {
      id: metaId,
      name: "Rabby",
    },
  } as ConnectedWallet;
}

function writeActiveWalletStorage(value: object) {
  localStorage.setItem(ACTIVE_PRIVY_WALLET_LOCAL_STORAGE_KEY, JSON.stringify(value));
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
    mocks.setActiveWalletForWagmi = undefined;
  });

  it("does not mirror transient Wagmi account state into active wallet storage", async () => {
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
      expect(localStorage.getItem(ACTIVE_PRIVY_WALLET_LOCAL_STORAGE_KEY)).toBeNull();
    });
  });

  it("uses stored wallet preference even when the selected wallet is not linked", () => {
    writeActiveWalletStorage({
      address: "0x2222222222222222222222222222222222222222",
      connectorId: "io.rabby",
    });

    const linkedWallet = createConnectedWallet({
      address: "0x1111111111111111111111111111111111111111",
      connectorType: "embedded",
      metaId: "io.privy.wallet",
      walletClientType: "privy",
    });
    const selectedExternalWallet = createConnectedWallet({
      address: "0x2222222222222222222222222222222222222222",
      connectorType: "injected",
      linked: false,
      metaId: "io.rabby",
      walletClientType: "rabby_wallet",
    });

    expect(
      getActiveWalletForWagmi({
        wallets: [linkedWallet, selectedExternalWallet],
        user: {} as never,
      })
    ).toBe(selectedExternalWallet);
  });

  it("does not use a connected wallet while Privy user is still hydrating without stored intent", () => {
    const wallet = createConnectedWallet({
      address: "0x1111111111111111111111111111111111111111",
      connectorType: "injected",
      metaId: "io.rabby",
      walletClientType: "rabby_wallet",
    });

    expect(
      getActiveWalletForWagmi({
        wallets: [wallet],
        user: null,
      })
    ).toBeUndefined();
  });

  it("does not use a linked wallet from a restored Privy user without stored intent", () => {
    const linkedWallet = createConnectedWallet({
      address: "0x1111111111111111111111111111111111111111",
      connectorType: "injected",
      metaId: "io.rabby",
      walletClientType: "rabby_wallet",
    });

    expect(
      getActiveWalletForWagmi({
        wallets: [linkedWallet],
        user: {} as never,
      })
    ).toBeUndefined();
  });

  it("reacts to active wallet storage writes while Privy user is still hydrating", async () => {
    const wallet = createConnectedWallet({
      address: "0x1111111111111111111111111111111111111111",
      connectorType: "injected",
      metaId: "io.rabby",
      walletClientType: "rabby_wallet",
    });
    mocks.wallets = [wallet];

    render(<WalletProvider>content</WalletProvider>);

    expect(mocks.setActiveWalletForWagmi?.({ wallets: mocks.wallets, user: null })).toBeUndefined();

    const activeWalletStorageValue = getEthereumWalletStorageValue(wallet);

    expect(activeWalletStorageValue).toBeDefined();

    writeActivePrivyWalletToStorage(activeWalletStorageValue!);

    await waitFor(() => {
      expect(mocks.setActiveWalletForWagmi?.({ wallets: mocks.wallets, user: null })).toBe(wallet);
    });
  });
});
