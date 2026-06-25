import type { ConnectedWallet } from "@privy-io/react-auth";
import { describe, expect, it, vi } from "vitest";
import type { Config } from "wagmi";

import { disconnectPrivyWalletsFromWagmi, getPrivyWagmiConnectorId } from "./privyWagmi";

function createWallet({
  address = "0x0000000000000000000000000000000000000001",
  metaId = "io.metamask",
  walletClientType = "metamask",
}: {
  address?: string;
  metaId?: string;
  walletClientType?: string;
}) {
  return {
    address,
    walletClientType,
    meta: {
      id: metaId,
      name: metaId,
    },
  } as ConnectedWallet;
}

describe("privyWagmi", () => {
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
});
