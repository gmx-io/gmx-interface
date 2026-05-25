import { cleanup, render, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import PrivyWalletProvider from "./PrivyWalletProvider";

const mocks = vi.hoisted(() => ({
  connectOrCreateWallet: vi.fn(),
  logout: vi.fn(),
  privyReady: false,
  wallets: [],
  walletsReady: false,
}));

vi.mock("@privy-io/react-auth", () => ({
  PrivyProvider: ({ children }: { children: ReactNode }) => children,
  useConnectOrCreateWallet: () => ({
    connectOrCreateWallet: mocks.connectOrCreateWallet,
  }),
  usePrivy: () => ({
    logout: mocks.logout,
    ready: mocks.privyReady,
    user: null,
  }),
  useWallets: () => ({
    ready: mocks.walletsReady,
    wallets: mocks.wallets,
  }),
}));

vi.mock("@privy-io/wagmi", () => ({
  WagmiProvider: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("context/ThemeContext/ThemeContext", () => ({
  useTheme: () => ({ theme: "dark" }),
}));

vi.mock("./walletConfig", () => ({
  getSupportedChains: () => [{ id: 42161 }],
  getWagmiConfig: () => ({}),
  PRIVY_APP_ID: "test-privy-app-id",
  PRIVY_LOGIN_METHODS: [],
  PRIVY_SIGNATURE_REQUEST_TIMEOUTS: {},
  PRIVY_WALLET_LIST: [],
}));

describe("PrivyWalletProvider", () => {
  beforeEach(() => {
    mocks.privyReady = false;
    mocks.walletsReady = false;
    mocks.wallets = [];
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("marks Privy as ready for connect flows when auth is ready even if wallets are not ready", async () => {
    mocks.privyReady = true;
    mocks.walletsReady = false;

    const onLoaded = vi.fn();
    const onReady = vi.fn();

    render(
      <PrivyWalletProvider onLoaded={onLoaded} onReady={onReady}>
        <div />
      </PrivyWalletProvider>
    );

    await waitFor(() => {
      expect(onReady).toHaveBeenCalledTimes(1);
    });
  });
});
