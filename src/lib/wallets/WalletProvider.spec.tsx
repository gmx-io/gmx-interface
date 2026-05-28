import type { ConnectedWallet, User } from "@privy-io/react-auth";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getActivePrivyWalletStorageKey, writeActivePrivyWalletToStorage } from "./activeWalletStorage";
import WalletProvider, { getActiveWalletForWagmi } from "./WalletProvider";

type CapturedPrivyProviderProps = {
  appId: string;
  config: {
    embeddedWallets: {
      ethereum: {
        createOnLogin: string;
      };
    };
  };
};

type CapturedWagmiProviderProps = {
  setActiveWalletForWagmi?: typeof getActiveWalletForWagmi;
};

const mocks = vi.hoisted(() => ({
  privyProviderProps: [] as CapturedPrivyProviderProps[],
  wagmiProviderProps: [] as CapturedWagmiProviderProps[],
}));

vi.mock("@privy-io/react-auth", () => ({
  PrivyProvider: ({ children, ...props }: CapturedPrivyProviderProps & { children: ReactNode }) => {
    mocks.privyProviderProps.push(props);
    return <>{children}</>;
  },
}));

vi.mock("@privy-io/wagmi", () => ({
  createConfig: () => ({}),
  WagmiProvider: ({ children, ...props }: CapturedWagmiProviderProps & { children: ReactNode }) => {
    mocks.wagmiProviderProps.push(props);
    return <>{children}</>;
  },
}));

vi.mock("context/ThemeContext/ThemeContext", () => ({
  useTheme: () => ({ theme: "dark" }),
}));

vi.mock("img/logo-icon.svg", () => ({
  default: "logo.svg",
}));

const user = { id: "did:privy:user-id" } as User;

function createConnectedWallet(
  wallet: Pick<ConnectedWallet, "address" | "connectorType" | "walletClientType" | "linked">
) {
  return wallet as ConnectedWallet;
}

describe("WalletProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.privyProviderProps.length = 0;
    mocks.wagmiProviderProps.length = 0;
  });

  it("does not ask Privy to auto-create embedded wallets for wallet logins", () => {
    render(<WalletProvider>content</WalletProvider>);

    expect(mocks.privyProviderProps).toHaveLength(1);
    expect(mocks.privyProviderProps[0].config.embeddedWallets.ethereum.createOnLogin).toBe("users-without-wallets");
  });

  it("wires stored active wallet selection into the Privy wagmi provider", () => {
    render(<WalletProvider>content</WalletProvider>);

    expect(mocks.wagmiProviderProps).toHaveLength(1);
    expect(mocks.wagmiProviderProps[0].setActiveWalletForWagmi).toBe(getActiveWalletForWagmi);
  });

  it("selects the stored linked wallet instead of the first linked wallet", () => {
    const embeddedWallet = createConnectedWallet({
      address: "0x0000000000000000000000000000000000000001",
      connectorType: "embedded",
      linked: true,
      walletClientType: "privy",
    });
    const phantomWallet = createConnectedWallet({
      address: "0x0000000000000000000000000000000000000002",
      connectorType: "injected",
      linked: true,
      walletClientType: "phantom",
    });
    const rabbyWallet = createConnectedWallet({
      address: "0x0000000000000000000000000000000000000003",
      connectorType: "injected",
      linked: true,
      walletClientType: "rabby_wallet",
    });

    writeActivePrivyWalletToStorage(user.id, rabbyWallet);

    expect(getActiveWalletForWagmi({ wallets: [embeddedWallet, phantomWallet, rabbyWallet], user })).toBe(rabbyWallet);
  });

  it("does not select a stored wallet that is no longer linked to the authenticated user", () => {
    const embeddedWallet = createConnectedWallet({
      address: "0x0000000000000000000000000000000000000001",
      connectorType: "embedded",
      linked: true,
      walletClientType: "privy",
    });
    const rabbyWallet = createConnectedWallet({
      address: "0x0000000000000000000000000000000000000003",
      connectorType: "injected",
      linked: false,
      walletClientType: "rabby_wallet",
    });

    writeActivePrivyWalletToStorage(user.id, rabbyWallet);

    expect(getActiveWalletForWagmi({ wallets: [embeddedWallet, rabbyWallet], user })).toBe(embeddedWallet);
  });

  it("matches stored wallets case-insensitively by address", () => {
    const rabbyWallet = createConnectedWallet({
      address: "0xA000000000000000000000000000000000000003",
      connectorType: "injected",
      linked: true,
      walletClientType: "rabby_wallet",
    });

    localStorage.setItem(
      getActivePrivyWalletStorageKey(user.id),
      JSON.stringify({
        address: "0xa000000000000000000000000000000000000003",
        connectorType: "injected",
        walletClientType: "rabby_wallet",
      })
    );

    expect(getActiveWalletForWagmi({ wallets: [rabbyWallet], user })).toBe(rabbyWallet);
  });
});
