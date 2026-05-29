import type { ConnectedWallet, User } from "@privy-io/react-auth";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Config } from "wagmi";

import {
  clearPrivyWagmiConnectionStorage,
  getActiveWalletForPrivyWagmi,
  getPrivyActiveWalletConnectionStorageKey,
  getPrivyEmbeddedWalletConnectorId,
  markExplicitPrivyWagmiConnector,
  preferEmbeddedWalletForNextPrivyUser,
  PRIVY_EMBEDDED_WALLET_CONNECTOR_ID,
  resetPrivyWagmiConnectionSelection,
  setRecentPrivyEmbeddedWalletConnector,
  WAGMI_RECENT_CONNECTOR_ID_STORAGE_KEY,
} from "./privyWagmi";

function mockConfig() {
  return {
    storage: {
      removeItem: vi.fn(),
      setItem: vi.fn(),
    },
  } as unknown as Config;
}

function mockWallet(
  address: string,
  {
    connectorType = "injected",
    walletClientType = "metamask",
  }: {
    connectorType?: string;
    walletClientType?: string;
  } = {}
) {
  return {
    address,
    connectorType,
    walletClientType,
    meta: {
      id: walletClientType,
      name: walletClientType,
    },
  } as ConnectedWallet;
}

describe("privyWagmi", () => {
  afterEach(() => {
    localStorage.clear();
    resetPrivyWagmiConnectionSelection();
    vi.clearAllMocks();
  });

  it("marks the embedded wallet connector as the recent wagmi connector", async () => {
    const config = mockConfig();
    const address = "0x123";
    const connectorId = getPrivyEmbeddedWalletConnectorId(address);

    await setRecentPrivyEmbeddedWalletConnector(config, address);

    expect(config.storage?.removeItem).toHaveBeenCalledWith(`${PRIVY_EMBEDDED_WALLET_CONNECTOR_ID}.disconnected`);
    expect(config.storage?.removeItem).toHaveBeenCalledWith(`${connectorId}.disconnected`);
    expect(config.storage?.setItem).toHaveBeenCalledWith(WAGMI_RECENT_CONNECTOR_ID_STORAGE_KEY, connectorId);
  });

  it("clears wagmi and Privy active wallet storage on disconnect", async () => {
    const config = mockConfig();
    const activeWalletStorageKey = getPrivyActiveWalletConnectionStorageKey();

    localStorage.setItem(activeWalletStorageKey, "metamask:0x123");

    await clearPrivyWagmiConnectionStorage(config);

    expect(config.storage?.removeItem).toHaveBeenCalledWith(WAGMI_RECENT_CONNECTOR_ID_STORAGE_KEY);
    expect(localStorage.getItem(activeWalletStorageKey)).toBeNull();
  });

  it("does not auto-select a stale external wallet while logged out", () => {
    const phantomWallet = mockWallet("0x1", { walletClientType: "phantom" });

    localStorage.setItem("wagmi.recentConnectorId", JSON.stringify("phantom"));

    expect(getActiveWalletForPrivyWagmi({ wallets: [phantomWallet], user: null })).toBeUndefined();
  });

  it("allows a wallet explicitly connected through Privy before user state is hydrated", () => {
    const phantomWallet = mockWallet("0x1", { walletClientType: "phantom" });

    markExplicitPrivyWagmiConnector("phantom");

    expect(getActiveWalletForPrivyWagmi({ wallets: [phantomWallet], user: null })).toBe(phantomWallet);
  });

  it("prefers the embedded wallet after social login instead of a stored external wallet", () => {
    const phantomWallet = mockWallet("0x1", { walletClientType: "phantom" });
    const embeddedWallet = mockWallet("0x2", {
      connectorType: "embedded",
      walletClientType: "privy",
    });

    localStorage.setItem("wagmi.recentConnectorId", JSON.stringify("phantom"));
    preferEmbeddedWalletForNextPrivyUser();

    expect(getActiveWalletForPrivyWagmi({ wallets: [phantomWallet, embeddedWallet], user: {} as User })).toBe(
      embeddedWallet
    );
  });

  it("waits for the embedded wallet after social login instead of falling back to a stale external wallet", () => {
    const phantomWallet = mockWallet("0x1", { walletClientType: "phantom" });

    localStorage.setItem("wagmi.recentConnectorId", JSON.stringify("phantom"));
    preferEmbeddedWalletForNextPrivyUser();

    expect(getActiveWalletForPrivyWagmi({ wallets: [phantomWallet], user: {} as User })).toBeUndefined();
  });

  it("uses the stored recent wallet after Privy user state is present", () => {
    const metamaskWallet = mockWallet("0x1", { walletClientType: "metamask" });
    const phantomWallet = mockWallet("0x2", { walletClientType: "phantom" });

    localStorage.setItem("wagmi.recentConnectorId", JSON.stringify("phantom"));

    expect(getActiveWalletForPrivyWagmi({ wallets: [metamaskWallet, phantomWallet], user: {} as User })).toBe(
      phantomWallet
    );
  });
});
