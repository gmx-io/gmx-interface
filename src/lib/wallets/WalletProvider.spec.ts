import type { ConnectedWallet, User } from "@privy-io/react-auth";
import { afterEach, describe, expect, it } from "vitest";

import { PRIVY_ACTIVE_WALLET_ADDRESS_LOCAL_STORAGE_KEY } from "config/localStorage";

import {
  hasPrivyConnectIntent,
  markPrivyConnectStarted,
  markPrivyDisconnectStarted,
  preferEmbeddedWalletForCurrentPrivyConnect,
  preferExternalWalletForCurrentPrivyConnect,
  resetPrivyWalletSelection,
} from "./privyWalletSelection";
import { getActiveWalletForWagmi, isPrivyWagmiStateReady } from "./WalletProvider";

function mockWallet(
  address: string,
  connectedAt: number,
  linked: boolean,
  {
    walletClientType = "metamask",
    connectorType = "injected",
  }: {
    walletClientType?: string;
    connectorType?: string;
  } = {}
) {
  return {
    address,
    connectedAt,
    linked,
    walletClientType,
    connectorType,
    meta: {
      id: walletClientType,
      name: walletClientType,
    },
  } as ConnectedWallet;
}

function mockUserWithEmbeddedWallet() {
  return {
    linkedAccounts: [
      {
        type: "wallet",
        walletClientType: "privy",
      },
    ],
  } as User;
}

describe("getActiveWalletForWagmi", () => {
  afterEach(() => {
    localStorage.clear();
    resetPrivyWalletSelection();
  });

  it("keeps Privy's most-recently connected wallet active", () => {
    const latestWallet = mockWallet("0x2", 200, false);
    const linkedWallet = mockWallet("0x1", 100, true);

    expect(getActiveWalletForWagmi({ wallets: [latestWallet, linkedWallet], user: {} as User })).toBe(latestWallet);
  });

  it("does not select a wallet when Privy has no connected wallets", () => {
    expect(getActiveWalletForWagmi({ wallets: [], user: {} as User })).toBeUndefined();
  });

  it("does not select leftover wallets before Privy user state is populated without an explicit connect attempt", () => {
    const latestWallet = mockWallet("0x2", 200, false);

    expect(getActiveWalletForWagmi({ wallets: [latestWallet], user: null })).toBeUndefined();
  });

  it("keeps a newly connected external wallet active before Privy user state is populated", () => {
    const latestWallet = mockWallet("0x2", 200, false);

    markPrivyConnectStarted();
    preferExternalWalletForCurrentPrivyConnect();

    expect(getActiveWalletForWagmi({ wallets: [latestWallet], user: null })).toBe(latestWallet);
  });

  it("does not select stale wallets while the connect modal login method is unresolved", () => {
    const staleExternalWallet = mockWallet("0x1", 200, false, { walletClientType: "rabby_wallet" });
    const embeddedWallet = mockWallet("0x2", 100, true, {
      walletClientType: "privy",
      connectorType: "embedded",
    });

    markPrivyConnectStarted();

    expect(
      getActiveWalletForWagmi({
        wallets: [staleExternalWallet, embeddedWallet],
        user: mockUserWithEmbeddedWallet(),
      })
    ).toBeUndefined();
  });

  it("keeps a hydrated Privy wallet during refresh before Privy user state is ready", () => {
    const latestWallet = mockWallet("0x2", 200, false);

    expect(getActiveWalletForWagmi({ isPrivyStateReady: false, wallets: [latestWallet], user: null })).toBe(
      latestWallet
    );
  });

  it("clears the explicit connect allowance after Privy user state is populated", () => {
    const latestWallet = mockWallet("0x2", 200, false);

    markPrivyConnectStarted();
    preferExternalWalletForCurrentPrivyConnect();

    expect(getActiveWalletForWagmi({ wallets: [latestWallet], user: {} as User })).toBe(latestWallet);
    expect(hasPrivyConnectIntent()).toBe(false);
    expect(getActiveWalletForWagmi({ wallets: [latestWallet], user: null })).toBeUndefined();
  });

  it("prefers the embedded wallet after email or social login instead of a stale external wallet", () => {
    const staleExternalWallet = mockWallet("0x1", 200, false, { walletClientType: "rabby_wallet" });
    const embeddedWallet = mockWallet("0x2", 100, true, {
      walletClientType: "privy",
      connectorType: "embedded",
    });

    preferEmbeddedWalletForCurrentPrivyConnect();

    expect(
      getActiveWalletForWagmi({
        wallets: [staleExternalWallet, embeddedWallet],
        user: mockUserWithEmbeddedWallet(),
      })
    ).toBe(embeddedWallet);
    expect(localStorage.getItem(PRIVY_ACTIVE_WALLET_ADDRESS_LOCAL_STORAGE_KEY)).toBe(embeddedWallet.address);
  });

  it("prefers the embedded wallet after social login before linked account metadata is hydrated", () => {
    const staleExternalWallet = mockWallet("0x1", 200, false, { walletClientType: "rabby_wallet" });
    const embeddedWallet = mockWallet("0x2", 100, true, {
      walletClientType: "privy",
      connectorType: "embedded",
    });

    preferEmbeddedWalletForCurrentPrivyConnect();

    expect(
      getActiveWalletForWagmi({
        wallets: [staleExternalWallet, embeddedWallet],
        user: {} as User,
      })
    ).toBe(embeddedWallet);
  });

  it("waits for the embedded wallet after email or social login when Privy has not populated wallets yet", () => {
    preferEmbeddedWalletForCurrentPrivyConnect();

    expect(
      getActiveWalletForWagmi({
        wallets: [mockWallet("0x1", 200, false, { walletClientType: "rabby_wallet" })],
        user: mockUserWithEmbeddedWallet(),
      })
    ).toBeUndefined();
  });

  it("does not fall back to a stale external wallet while waiting for social login embedded wallet metadata", () => {
    preferEmbeddedWalletForCurrentPrivyConnect();

    expect(
      getActiveWalletForWagmi({
        wallets: [mockWallet("0x1", 200, false, { walletClientType: "rabby_wallet" })],
        user: {} as User,
      })
    ).toBeUndefined();
  });

  it("keeps the stored active wallet on refresh after Privy state is hydrated", () => {
    const staleExternalWallet = mockWallet("0x1", 200, true, { walletClientType: "rabby_wallet" });
    const embeddedWallet = mockWallet("0x2", 100, true, {
      walletClientType: "privy",
      connectorType: "embedded",
    });

    localStorage.setItem(PRIVY_ACTIVE_WALLET_ADDRESS_LOCAL_STORAGE_KEY, embeddedWallet.address);

    expect(
      getActiveWalletForWagmi({
        wallets: [staleExternalWallet, embeddedWallet],
        user: mockUserWithEmbeddedWallet(),
      })
    ).toBe(embeddedWallet);
  });

  it("lets a fresh explicit wallet connect override the stored active wallet", () => {
    const latestExternalWallet = mockWallet("0x1", 200, true, { walletClientType: "rabby_wallet" });
    const embeddedWallet = mockWallet("0x2", 100, true, {
      walletClientType: "privy",
      connectorType: "embedded",
    });

    localStorage.setItem(PRIVY_ACTIVE_WALLET_ADDRESS_LOCAL_STORAGE_KEY, embeddedWallet.address);
    markPrivyConnectStarted();
    preferExternalWalletForCurrentPrivyConnect();

    expect(
      getActiveWalletForWagmi({
        wallets: [latestExternalWallet, embeddedWallet],
        user: mockUserWithEmbeddedWallet(),
      })
    ).toBe(latestExternalWallet);
  });

  it("does not reconnect leftover wallets while Privy logout is in progress", () => {
    markPrivyDisconnectStarted();

    expect(getActiveWalletForWagmi({ wallets: [mockWallet("0x1", 100, true)], user: null })).toBeUndefined();
  });

  it("does not reconnect wallets before Privy user state clears during logout", () => {
    markPrivyDisconnectStarted();

    expect(getActiveWalletForWagmi({ wallets: [mockWallet("0x1", 100, true)], user: {} as User })).toBeUndefined();
  });
});

describe("isPrivyWagmiStateReady", () => {
  it("requires Privy auth state and wallet state before treating the selector state as hydrated", () => {
    expect(isPrivyWagmiStateReady({ privyReady: false, walletsReady: false })).toBe(false);
    expect(isPrivyWagmiStateReady({ privyReady: true, walletsReady: false })).toBe(false);
    expect(isPrivyWagmiStateReady({ privyReady: false, walletsReady: true })).toBe(false);
    expect(isPrivyWagmiStateReady({ privyReady: true, walletsReady: true })).toBe(true);
  });
});
