import type { ConnectedWallet } from "@privy-io/react-auth";
import type { User } from "@privy-io/react-auth";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Config } from "wagmi";

import {
  allowPrivyWalletForWagmi,
  disconnectPrivyWalletsFromWagmi,
  getActiveWalletForWagmi,
  getPrivyWagmiConnectorId,
} from "./privyWagmi";

function createWallet({
  address = "0x0000000000000000000000000000000000000001",
  connectedAt = 1,
  linked = true,
  metaId = "io.metamask",
  type = "ethereum",
  walletClientType = "metamask",
}: {
  address?: string;
  connectedAt?: number;
  linked?: boolean;
  metaId?: string;
  type?: string;
  walletClientType?: string;
}) {
  return {
    address,
    connectedAt,
    linked,
    type,
    walletClientType,
    meta: {
      id: metaId,
      name: metaId,
    },
  } as ConnectedWallet;
}

describe("privyWagmi", () => {
  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("uses Privy's embedded wallet connector id format", () => {
    const wallet = createWallet({
      address: "0x0000000000000000000000000000000000000002",
      metaId: "io.privy.wallet",
      walletClientType: "privy",
    });

    expect(getPrivyWagmiConnectorId(wallet)).toBe("io.privy.wallet.0x0000000000000000000000000000000000000002");
  });

  it("uses the wallet metadata id for external wallets", () => {
    const wallet = createWallet({
      metaId: "io.phantom",
      walletClientType: "phantom",
    });

    expect(getPrivyWagmiConnectorId(wallet)).toBe("io.phantom");
  });

  it("marks all Privy-backed wagmi connectors disconnected", async () => {
    const removeItem = vi.fn();
    const setItem = vi.fn();
    const config = {
      storage: {
        removeItem,
        setItem,
      },
    } as unknown as Config;

    await disconnectPrivyWalletsFromWagmi(
      [
        createWallet({ metaId: "io.phantom", walletClientType: "phantom" }),
        createWallet({ metaId: "io.phantom", walletClientType: "phantom" }),
        createWallet({
          address: "0x0000000000000000000000000000000000000003",
          metaId: "io.privy.wallet",
          walletClientType: "privy",
        }),
      ],
      config
    );

    expect(removeItem).toHaveBeenCalledWith("recentConnectorId");
    expect(setItem).toHaveBeenCalledWith("io.phantom.disconnected", true);
    expect(setItem).toHaveBeenCalledWith(
      "io.privy.wallet.0x0000000000000000000000000000000000000003.disconnected",
      true
    );
    expect(setItem).toHaveBeenCalledTimes(2);
  });

  it("keeps an app-side disconnected marker that the active wallet selector respects", async () => {
    const config = {
      storage: {
        key: "wagmi",
        removeItem: vi.fn(),
        setItem: vi.fn(),
      },
    } as unknown as Config;

    const phantom = createWallet({ connectedAt: 3, metaId: "io.phantom", walletClientType: "phantom" });
    const metamask = createWallet({ connectedAt: 2, metaId: "io.metamask", walletClientType: "metamask" });

    await disconnectPrivyWalletsFromWagmi([phantom], config);

    expect(getActiveWalletForWagmi({ wallets: [phantom, metamask], user: {} as User }, config)).toBe(metamask);
  });

  it("allows a wallet again after an explicit Privy success", async () => {
    const removeItem = vi.fn();
    const setItem = vi.fn();
    const config = {
      storage: {
        key: "wagmi",
        removeItem,
        setItem,
      },
    } as unknown as Config;
    const phantom = createWallet({ connectedAt: 3, metaId: "io.phantom", walletClientType: "phantom" });

    await disconnectPrivyWalletsFromWagmi([phantom], config);
    await allowPrivyWalletForWagmi(phantom, config);

    expect(getActiveWalletForWagmi({ wallets: [phantom], user: {} as User }, config)).toBe(phantom);
    expect(removeItem).toHaveBeenCalledWith("io.phantom.disconnected");
    expect(setItem).toHaveBeenCalledWith("recentConnectorId", "io.phantom");
  });

  it("does not select any Privy wallet before the user is authenticated", () => {
    const wallet = createWallet({ connectedAt: 3, metaId: "io.phantom", walletClientType: "phantom" });

    expect(getActiveWalletForWagmi({ wallets: [wallet], user: null })).toBeUndefined();
  });

  it("does not select wallets marked disconnected in wagmi storage", () => {
    const wallet = createWallet({ connectedAt: 3, metaId: "io.phantom", walletClientType: "phantom" });
    const config = {
      storage: {
        key: "test-wagmi",
      },
    } as unknown as Config;

    localStorage.setItem("test-wagmi.io.phantom.disconnected", "true");

    expect(getActiveWalletForWagmi({ wallets: [wallet], user: {} as User }, config)).toBeUndefined();
  });
});
