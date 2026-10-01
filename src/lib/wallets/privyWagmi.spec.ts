import type { ConnectedWallet } from "@privy-io/react-auth";
import { disconnect, getAccount, reconnect, switchAccount } from "@wagmi/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Config } from "wagmi";

import { disconnectPrivyWalletsFromWagmi, getPrivyWagmiConnectorId, keepEvmConnector } from "./privyWagmi";

vi.mock("@wagmi/core", () => ({
  disconnect: vi.fn(),
  getAccount: vi.fn(),
  reconnect: vi.fn(),
  switchAccount: vi.fn(),
}));

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

  describe("keepEvmConnector", () => {
    const metamask = { id: "io.metamask", uid: "mm" };
    const phantom = { id: "io.phantom", uid: "ph" };

    beforeEach(() => {
      vi.mocked(getAccount).mockReset();
      vi.mocked(switchAccount).mockReset();
      vi.mocked(reconnect).mockReset();
      vi.mocked(disconnect).mockReset();
    });

    function configWith(connectorId: string | null) {
      const setItem = vi.fn();
      const removeItem = vi.fn();
      const config = {
        storage: { setItem, removeItem },
        state: {
          connections: new Map([
            ["mm", { connector: metamask }],
            ["ph", { connector: phantom }],
          ]),
        },
      } as unknown as Config;

      vi.mocked(getAccount).mockReturnValue({
        connector: connectorId ? { id: connectorId } : undefined,
        status: "connected",
        isConnected: Boolean(connectorId),
      } as ReturnType<typeof getAccount>);

      return { config, setItem, removeItem };
    }

    it("switches back to the EVM connector that was active before Solana connect", async () => {
      const { config, setItem } = configWith("io.phantom");

      await expect(keepEvmConnector("io.metamask", config)).resolves.toBe(true);

      expect(setItem).toHaveBeenCalledWith("recentConnectorId", "io.metamask");
      expect(switchAccount).toHaveBeenCalledWith(config, { connector: metamask });
      expect(reconnect).not.toHaveBeenCalled();
    });

    it("waits while wagmi is still reconnecting", async () => {
      const { config } = configWith("io.phantom");
      vi.mocked(getAccount).mockReturnValue({
        connector: { id: "io.phantom" },
        status: "reconnecting",
        isConnected: true,
      } as ReturnType<typeof getAccount>);

      await expect(keepEvmConnector("io.metamask", config)).resolves.toBe(false);
      expect(switchAccount).not.toHaveBeenCalled();
    });

    it("drops an EVM connector adopted from a Solana-only connect", async () => {
      const { config, removeItem } = configWith("io.phantom");
      vi.mocked(getAccount)
        .mockReturnValueOnce({
          connector: { id: "io.phantom" },
          status: "connected",
          isConnected: true,
        } as ReturnType<typeof getAccount>)
        .mockReturnValueOnce({
          connector: undefined,
          status: "disconnected",
          isConnected: false,
        } as ReturnType<typeof getAccount>);

      await expect(keepEvmConnector(null, config)).resolves.toBe(true);

      expect(removeItem).toHaveBeenCalledWith("recentConnectorId");
      expect(disconnect).toHaveBeenCalledWith(config);
    });
  });
});
