import type { ConnectedWallet } from "@privy-io/react-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ACTIVE_PRIVY_WALLET_LOCAL_STORAGE_KEY } from "config/localStorage";

import {
  findActivePrivyWalletByWagmiAccount,
  findStoredActivePrivyWallet,
  getEthereumWalletStorageValue,
  removeActivePrivyWalletFromStorage,
  subscribeActivePrivyWalletStorage,
  writeActivePrivyWalletToStorage,
} from "./activeWalletStorage";

function createConnectedWallet(
  wallet: Pick<ConnectedWallet, "address" | "connectorType" | "walletClientType"> & {
    linked?: boolean;
    metaId: string;
  }
) {
  const { linked = true, metaId, ...walletFields } = wallet;

  return {
    ...walletFields,
    chainId: "eip155:42161",
    linked,
    meta: {
      id: metaId,
      name: "Wallet",
    },
    type: "ethereum",
  } as ConnectedWallet;
}

describe("active wallet storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("restores an unlinked stored wallet by connector id", () => {
    const selectedWallet = createConnectedWallet({
      address: "0x00000000000000000000000000000000000000aa",
      connectorType: "injected",
      linked: false,
      metaId: "io.rabby",
      walletClientType: "rabby_wallet",
    });

    localStorage.setItem(
      ACTIVE_PRIVY_WALLET_LOCAL_STORAGE_KEY,
      JSON.stringify({
        address: "0x00000000000000000000000000000000000000AA",
        connectorId: "io.rabby",
      })
    );

    expect(
      findStoredActivePrivyWallet([
        createConnectedWallet({
          address: "0x00000000000000000000000000000000000000bb",
          connectorType: "embedded",
          metaId: "io.privy.wallet",
          walletClientType: "privy",
        }),
        selectedWallet,
      ])
    ).toBe(selectedWallet);
  });

  it("finds the Privy wallet that matches the current wagmi account", () => {
    const selectedWallet = createConnectedWallet({
      address: "0x00000000000000000000000000000000000000aa",
      connectorType: "injected",
      metaId: "io.rabby",
      walletClientType: "rabby_wallet",
    });

    expect(
      findActivePrivyWalletByWagmiAccount(
        [
          createConnectedWallet({
            address: "0x00000000000000000000000000000000000000aa",
            connectorType: "injected",
            metaId: "io.metamask",
            walletClientType: "metamask",
          }),
          selectedWallet,
        ],
        {
          address: "0x00000000000000000000000000000000000000AA",
          connectorId: "io.rabby",
        }
      )
    ).toBe(selectedWallet);
  });

  it("includes the wagmi connector id when converting a connected wallet", () => {
    expect(
      getEthereumWalletStorageValue(
        createConnectedWallet({
          address: "0x00000000000000000000000000000000000000aa",
          connectorType: "embedded",
          metaId: "io.privy.wallet",
          walletClientType: "privy",
        })
      )
    ).toEqual({
      address: "0x00000000000000000000000000000000000000aa",
      connectorId: "io.privy.wallet.0x00000000000000000000000000000000000000aa",
      connectorType: "embedded",
      walletClientType: "privy",
    });
  });

  it("notifies subscribers when active wallet storage changes in the current tab", () => {
    const onChange = vi.fn();
    const unsubscribe = subscribeActivePrivyWalletStorage(onChange);

    writeActivePrivyWalletToStorage({
      address: "0x00000000000000000000000000000000000000aa",
      connectorId: "io.rabby",
    });

    expect(onChange).toHaveBeenCalledTimes(1);

    removeActivePrivyWalletFromStorage();

    expect(onChange).toHaveBeenCalledTimes(2);

    unsubscribe();
    writeActivePrivyWalletToStorage({
      address: "0x00000000000000000000000000000000000000bb",
      connectorId: "io.rabby",
    });

    expect(onChange).toHaveBeenCalledTimes(2);
  });
});
