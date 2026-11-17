import { createConfig, createStorage, type Config } from "@wagmi/core";
import { http } from "viem";
import { arbitrum } from "viem/chains";
import { afterEach, describe, expect, it, vi } from "vitest";
import { injected } from "wagmi/connectors";

import {
  detachSolanaLinkedEvmConnectors,
  rememberPickedEvmConnector,
  watchSolanaLinkedEvmConnectors,
} from "./solanaLinkedEvmConnectors";

const METAMASK_ADDRESS = "0x0000000000000000000000000000000000000001";
const PHANTOM_ADDRESS = "0x0000000000000000000000000000000000000002";

const WALLETS = [
  { name: "MetaMask", rdns: "io.metamask" },
  { name: "Phantom", rdns: "app.phantom" },
];

function createProvider() {
  return { request: vi.fn(), on: vi.fn(), removeListener: vi.fn() };
}

function announceWallets() {
  const handleRequest = () => {
    for (const info of WALLETS) {
      window.dispatchEvent(
        new CustomEvent("eip6963:announceProvider", { detail: { info, provider: createProvider() } })
      );
    }
  };
  window.addEventListener("eip6963:requestProvider", handleRequest);

  return () => window.removeEventListener("eip6963:requestProvider", handleRequest);
}

function createWagmiConfig() {
  return createConfig({
    chains: [arbitrum],
    connectors: WALLETS.map(({ name, rdns }) =>
      injected({ target: { id: rdns, name, provider: createProvider() as never } })
    ),
    transports: { [arbitrum.id]: http() },
    storage: createStorage({ storage: localStorage }),
  });
}

function connect(config: Config, connectorId: string, address: `0x${string}`) {
  const connector = config.connectors.find((item) => item.id === connectorId)!;

  config.setState((state) => ({
    ...state,
    connections: new Map(state.connections).set(connector.uid, {
      accounts: [address],
      chainId: arbitrum.id,
      connector,
    }),
    current: connector.uid,
    status: "connected",
  }));
}

function getConnectedAccounts(config: Config) {
  return Array.from(config.state.connections.values()).map((connection) => connection.accounts[0]);
}

describe("solanaLinkedEvmConnectors", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("keeps the EVM account a Solana connect authorized out of wagmi until the user picks it FESOL-42", async () => {
    const stopAnnouncing = announceWallets();
    const config = createWagmiConfig();
    rememberPickedEvmConnector("io.metamask");
    connect(config, "io.metamask", METAMASK_ADDRESS);
    // Phantom already authorized the site, so wagmi reconnects its EVM account before the Solana connect.
    connect(config, "app.phantom", PHANTOM_ADDRESS);
    const stopWatching = watchSolanaLinkedEvmConnectors(config);

    await detachSolanaLinkedEvmConnectors("Phantom", config, ["app.phantom"]);

    expect(getConnectedAccounts(config)).toEqual([METAMASK_ADDRESS, PHANTOM_ADDRESS]);
    expect(await config.storage?.getItem("app.phantom.disconnected" as never)).toBeNull();

    await detachSolanaLinkedEvmConnectors("Phantom", config);
    // The extension's accountsChanged connects it again.
    connect(config, "app.phantom", PHANTOM_ADDRESS);

    expect(getConnectedAccounts(config)).toEqual([METAMASK_ADDRESS]);
    expect(config.state.current).toBe(config.connectors.find((item) => item.id === "io.metamask")!.uid);
    expect(await config.storage?.getItem("app.phantom.disconnected" as never)).toBe(true);

    rememberPickedEvmConnector("app.phantom");
    connect(config, "app.phantom", PHANTOM_ADDRESS);

    expect(getConnectedAccounts(config)).toEqual([METAMASK_ADDRESS, PHANTOM_ADDRESS]);

    stopWatching();
    stopAnnouncing();
  });
});
