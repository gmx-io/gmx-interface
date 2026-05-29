import { afterEach, describe, expect, it, vi } from "vitest";
import type { Config } from "wagmi";

import {
  clearPrivyWagmiConnectionStorage,
  getPrivyActiveWalletConnectionStorageKey,
  getPrivyEmbeddedWalletConnectorId,
  PRIVY_EMBEDDED_WALLET_CONNECTOR_ID,
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

describe("privyWagmi", () => {
  afterEach(() => {
    localStorage.clear();
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
});
