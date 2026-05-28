import type { ConnectedWallet } from "@privy-io/react-auth";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  findStoredActivePrivyWallet,
  getActivePrivyWalletStorageKey,
  readActivePrivyWalletFromStorage,
  writeActivePrivyWalletToStorage,
} from "./activeWalletStorage";

function connectedWallet(wallet: Partial<ConnectedWallet>): ConnectedWallet {
  return {
    address: "0xAa00000000000000000000000000000000000001",
    connectorType: "injected",
    linked: true,
    walletClientType: "metamask",
    ...wallet,
  } as ConnectedWallet;
}

describe("activeWalletStorage", () => {
  const userId = "did:privy:user-id";

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("stores active wallet addresses without normalization", () => {
    const wallet = {
      address: "0xAa00000000000000000000000000000000000001",
      connectorType: "injected",
      walletClientType: "metamask",
    };

    writeActivePrivyWalletToStorage(userId, wallet);

    expect(JSON.parse(localStorage.getItem(getActivePrivyWalletStorageKey(userId))!)).toEqual(wallet);
    expect(readActivePrivyWalletFromStorage(userId)).toEqual(wallet);
  });

  it("matches stored active wallets by exact address", () => {
    writeActivePrivyWalletToStorage(userId, {
      address: "0xAa00000000000000000000000000000000000001",
      connectorType: "injected",
      walletClientType: "metamask",
    });

    const walletWithDifferentAddressCasing = connectedWallet({
      address: "0xaa00000000000000000000000000000000000001",
    });
    const walletWithExactAddress = connectedWallet({});

    expect(
      findStoredActivePrivyWallet({
        userId,
        wallets: [walletWithDifferentAddressCasing, walletWithExactAddress],
      })
    ).toBe(walletWithExactAddress);
  });
});
